/**
 * main.cpp
 * --------
 * JSON stdio dispatcher for the scheduling algorithms.
 *
 * Protocol (used by the Node.js cppBridge):
 *   STDIN  – one JSON object:
 *     {
 *       "strategy": "round-robin" | "least-loaded" | "priority-based" | "resource-aware",
 *       "task": { "id": string, "priority": int, "cpu": double, "memory": double },
 *       "workers": [{ "id": string, "online": bool, "cpuUsage": double,
 *                     "memoryUsage": double, "activeTasks": int,
 *                     "totalCpu": double, "totalMemory": double }],
 *       "queuedTasks": [{ "id": string, "priority": int, "cpu": double, "memory": double }]
 *     }
 *
 *   STDOUT – one JSON object:
 *     { "assigned": bool, "workerId": string, "strategy": string,
 *       "score": double, "reason": string }
 *
 *   Exit codes:  0 = ok (even if no worker found),  1 = fatal parse error.
 */

#define SCHEDULER_LIBRARY  // suppress scheduler_tests.cpp's main()
#include "scheduler.h"

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

// ─── Minimal JSON helpers (no external deps) ────────────────────────────────

// Returns the raw value string for a given key in a flat JSON object.
// Works for simple objects one level deep (values may themselves be objects/arrays).
static std::string jsonGet(const std::string& json, const std::string& key) {
    const std::string needle = "\"" + key + "\"";
    auto pos = json.find(needle);
    if (pos == std::string::npos) return "";
    pos = json.find(':', pos + needle.size());
    if (pos == std::string::npos) return "";
    ++pos;
    while (pos < json.size() && std::isspace(static_cast<unsigned char>(json[pos]))) ++pos;
    if (pos >= json.size()) return "";

    const char first = json[pos];
    if (first == '"') {
        // string value
        ++pos;
        std::string result;
        while (pos < json.size() && json[pos] != '"') {
            if (json[pos] == '\\') ++pos;
            result += json[pos++];
        }
        return result;
    }
    if (first == '{' || first == '[') {
        // nested object/array – return the whole bracketed region
        char open = first, close = (first == '{') ? '}' : ']';
        int depth = 1;
        std::string result(1, first);
        ++pos;
        while (pos < json.size() && depth > 0) {
            char c = json[pos++];
            if (c == open)  ++depth;
            if (c == close) --depth;
            result += c;
        }
        return result;
    }
    // number / bool / null
    std::string result;
    while (pos < json.size() && json[pos] != ',' && json[pos] != '}' && json[pos] != ']') {
        result += json[pos++];
    }
    // trim trailing whitespace
    while (!result.empty() && std::isspace(static_cast<unsigned char>(result.back()))) result.pop_back();
    return result;
}

static bool jsonBool(const std::string& json, const std::string& key, bool def = false) {
    const std::string v = jsonGet(json, key);
    if (v == "true")  return true;
    if (v == "false") return false;
    return def;
}

static double jsonDouble(const std::string& json, const std::string& key, double def = 0.0) {
    const std::string v = jsonGet(json, key);
    if (v.empty()) return def;
    try { return std::stod(v); } catch (...) { return def; }
}

static int jsonInt(const std::string& json, const std::string& key, int def = 0) {
    const std::string v = jsonGet(json, key);
    if (v.empty()) return def;
    try { return std::stoi(v); } catch (...) { return def; }
}

// Split a JSON array string into its top-level element strings.
static std::vector<std::string> jsonArrayElements(const std::string& arrStr) {
    std::vector<std::string> elements;
    if (arrStr.size() < 2) return elements;
    std::size_t i = 1; // skip '['
    while (i < arrStr.size() - 1) {
        while (i < arrStr.size() && std::isspace(static_cast<unsigned char>(arrStr[i]))) ++i;
        if (i >= arrStr.size() - 1) break;
        char first = arrStr[i];
        if (first == '{') {
            int depth = 1;
            std::string elem(1, first);
            ++i;
            while (i < arrStr.size() && depth > 0) {
                char c = arrStr[i++];
                if (c == '{') ++depth;
                if (c == '}') --depth;
                elem += c;
            }
            elements.push_back(elem);
        } else if (first == ',') {
            ++i;
        } else {
            ++i;
        }
    }
    return elements;
}

// ─── Parse helpers ──────────────────────────────────────────────────────────

static scheduler::Task parseTask(const std::string& obj) {
    scheduler::Task t;
    t.id       = jsonGet(obj, "id");
    t.priority = jsonInt(obj, "priority");
    t.cpu      = jsonDouble(obj, "cpu");
    t.memory   = jsonDouble(obj, "memory");
    return t;
}

static scheduler::Worker parseWorker(const std::string& obj) {
    scheduler::Worker w;
    w.id           = jsonGet(obj, "id");
    w.online       = jsonBool(obj, "online", true);
    w.cpuUsage     = jsonDouble(obj, "cpuUsage");
    w.memoryUsage  = jsonDouble(obj, "memoryUsage");
    w.activeTasks  = jsonInt(obj, "activeTasks");
    w.totalCpu     = jsonDouble(obj, "totalCpu",    4.0);
    w.totalMemory  = jsonDouble(obj, "totalMemory", 8192.0);
    return w;
}

static scheduler::Strategy parseStrategy(const std::string& name) {
    if (name == "round-robin")    return scheduler::Strategy::RoundRobin;
    if (name == "least-loaded")   return scheduler::Strategy::LeastLoaded;
    if (name == "priority-based") return scheduler::Strategy::PriorityBased;
    return scheduler::Strategy::ResourceAware;
}

// ─── Output helpers ─────────────────────────────────────────────────────────

static std::string escapeJson(const std::string& s) {
    std::string out;
    for (char c : s) {
        if (c == '"')  out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else           out += c;
    }
    return out;
}

static void emitResult(bool assigned,
                       const std::string& taskId,
                       const std::string& workerId,
                       const std::string& strategy,
                       double score,
                       const std::string& reason) {
    std::cout << "{"
              << "\"assigned\":" << (assigned ? "true" : "false") << ","
              << "\"taskId\":\"" << escapeJson(taskId) << "\","
              << "\"workerId\":\"" << escapeJson(workerId) << "\","
              << "\"strategy\":\"" << escapeJson(strategy) << "\","
              << "\"score\":" << score << ","
              << "\"reason\":\"" << escapeJson(reason) << "\""
              << "}" << std::endl;
}

// ─── Worker evaluation log (written to stderr so stdout stays clean JSON) ──

static void logWorkers(const std::vector<scheduler::Worker>& workers,
                       const scheduler::Task& task) {
    std::cerr << "[C++][SCHEDULER] Workers evaluated for task \"" << task.id << "\":\n";
    for (const auto& w : workers) {
        const double availCpu = w.totalCpu * (1.0 - w.cpuUsage / 100.0);
        const double availMem = w.totalMemory * (1.0 - w.memoryUsage / 100.0);
        std::cerr << "  " << w.id
                  << " | online=" << (w.online ? "yes" : "no")
                  << " | cpuUsage=" << w.cpuUsage << "%"
                  << " | memUsage=" << w.memoryUsage << "%"
                  << " | activeTasks=" << w.activeTasks
                  << " | availCpu=" << availCpu << "cores"
                  << " | availMem=" << availMem << "MB"
                  << " | taskNeeds cpu=" << task.cpu << " mem=" << task.memory << "\n";
    }
}

// ─── main ───────────────────────────────────────────────────────────────────

int main() {
    // Read all of stdin
    std::string input;
    {
        std::ostringstream oss;
        oss << std::cin.rdbuf();
        input = oss.str();
    }

    if (input.empty()) {
        std::cerr << "[C++][SCHEDULER] ERROR: Empty input on stdin\n";
        return 1;
    }

    // Parse strategy
    const std::string strategyName = jsonGet(input, "strategy");
    if (strategyName.empty()) {
        std::cerr << "[C++][SCHEDULER] ERROR: Missing \"strategy\" field\n";
        return 1;
    }

    // Parse task
    const std::string taskObj = jsonGet(input, "task");
    if (taskObj.empty()) {
        std::cerr << "[C++][SCHEDULER] ERROR: Missing \"task\" field\n";
        return 1;
    }
    const scheduler::Task task = parseTask(taskObj);

    // Parse workers
    const std::string workersArr = jsonGet(input, "workers");
    std::vector<scheduler::Worker> workers;
    for (const auto& elem : jsonArrayElements(workersArr)) {
        workers.push_back(parseWorker(elem));
    }

    // Parse queuedTasks (optional)
    std::vector<scheduler::Task> queuedTasks;
    const std::string qtArr = jsonGet(input, "queuedTasks");
    if (!qtArr.empty()) {
        for (const auto& elem : jsonArrayElements(qtArr)) {
            queuedTasks.push_back(parseTask(elem));
        }
    }

    std::cerr << "[C++][SCHEDULER] Strategy: " << strategyName
              << " | Task: " << task.id
              << " | priority=" << task.priority
              << " | cpu=" << task.cpu
              << " | memory=" << task.memory << "\n";
    logWorkers(workers, task);

    // Run scheduler
    const scheduler::Strategy strategy = parseStrategy(strategyName);
    scheduler::Scheduler sched(strategy);
    const scheduler::SchedulingDecision decision = sched.schedule(task, workers, queuedTasks);

    if (decision.assigned) {
        std::cerr << "[C++][SCHEDULER] Decision: ASSIGNED to " << decision.workerId
                  << " | score=" << decision.score << "\n";
        emitResult(true, decision.taskId, decision.workerId, strategyName, decision.score, "ok");
    } else {
        std::cerr << "[C++][SCHEDULER] Decision: NO_WORKER_AVAILABLE\n";
        emitResult(false, "", "", strategyName, 0.0, "no_suitable_worker");
    }

    return 0;
}
