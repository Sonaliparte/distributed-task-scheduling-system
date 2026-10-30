/**
 * scheduler_tests.cpp
 * -------------------
 * Comprehensive unit tests for all four scheduling algorithms.
 *
 * Covers:
 *   - Round Robin  : cycling, offline skip, insufficient resources
 *   - Least Loaded : tie-break by resource score, offline excluded
 *   - Priority-Based : higher-priority queued task wins, equal priorities,
 *                      no queued tasks, no suitable worker
 *   - Resource-Aware : lowest score selected, offline/insufficient excluded
 *   - No suitable worker (all offline, all insufficient)
 *   - Scheduler class: activeTasks increment on assignment
 */

#define SCHEDULER_LIBRARY  // prevent main.cpp's main() from being compiled in
#include "scheduler.h"

#include <cassert>
#include <cmath>
#include <iostream>
#include <vector>

using namespace scheduler;

// ─── Helpers ────────────────────────────────────────────────────────────────

static void PASS(const char* name) {
    std::cout << "[PASS] " << name << "\n";
}

static bool approxEq(double a, double b, double eps = 1e-6) {
    return std::abs(a - b) < eps;
}

// ─── Worker factory (online, low load, 4 CPU cores, 8 GB RAM) ───────────────

static Worker makeWorker(const std::string& id,
                         bool online       = true,
                         double cpuUsage   = 20.0,
                         double memUsage   = 25.0,
                         int activeTasks   = 0,
                         double totalCpu   = 4.0,
                         double totalMemory = 8192.0) {
    return { id, online, cpuUsage, memUsage, activeTasks, totalCpu, totalMemory };
}

// Task that easily fits on any default worker (needs 1 core, 256 MB free)
static Task smallTask(const std::string& id = "t1", int priority = 2) {
    return { id, priority, 1.0, 256.0 };
}

// ─── Resource-Aware ──────────────────────────────────────────────────────────

static void test_resourceAware_picksLowestScore() {
    // w1 score = 30*0.6 + 40*0.4 = 34   w2 score = 20*0.6 + 25*0.4 = 22  → w2 wins
    std::vector<Worker> ws = {
        makeWorker("w1", true, 30.0, 40.0),
        makeWorker("w2", true, 20.0, 25.0),
    };
    const Task t = smallTask();
    assert(selectResourceAware(ws, t)->id == "w2");
    PASS("resourceAware_picksLowestScore");
}

static void test_resourceAware_skipsOffline() {
    std::vector<Worker> ws = {
        makeWorker("w1", false, 10.0, 10.0),  // offline – lower score but excluded
        makeWorker("w2", true,  30.0, 40.0),
    };
    const Task t = smallTask();
    assert(selectResourceAware(ws, t)->id == "w2");
    PASS("resourceAware_skipsOffline");
}

static void test_resourceAware_skipsInsufficientCpu() {
    // w1 has 4 cores at 80% → only 0.8 cores free; task needs 1.0
    std::vector<Worker> ws = {
        makeWorker("w1", true, 80.0, 20.0),
        makeWorker("w2", true, 20.0, 25.0),
    };
    const Task t = smallTask();
    assert(selectResourceAware(ws, t)->id == "w2");
    PASS("resourceAware_skipsInsufficientCpu");
}

static void test_resourceAware_skipsInsufficientMemory() {
    // w1: 8192 MB * (1 - 97/100) = 245 MB free; task needs 256 MB
    std::vector<Worker> ws = {
        makeWorker("w1", true, 20.0, 97.0),
        makeWorker("w2", true, 30.0, 40.0),
    };
    const Task t = smallTask();
    assert(selectResourceAware(ws, t)->id == "w2");
    PASS("resourceAware_skipsInsufficientMemory");
}

static void test_resourceAware_noWorker_allOffline() {
    std::vector<Worker> ws = {
        makeWorker("w1", false),
        makeWorker("w2", false),
    };
    assert(selectResourceAware(ws, smallTask()) == nullptr);
    PASS("resourceAware_noWorker_allOffline");
}

static void test_resourceAware_noWorker_allInsufficient() {
    // Task needs 3.5 cores; each worker has 4 cores at 20% = 3.2 free
    std::vector<Worker> ws = {
        makeWorker("w1", true, 20.0, 10.0),
        makeWorker("w2", true, 20.0, 10.0),
    };
    const Task big = { "tbig", 2, 3.5, 100.0 };
    assert(selectResourceAware(ws, big) == nullptr);
    PASS("resourceAware_noWorker_allInsufficient");
}

// ─── Round Robin ─────────────────────────────────────────────────────────────

static void test_roundRobin_cycles() {
    std::vector<Worker> ws = {
        makeWorker("w1"),
        makeWorker("w2"),
        makeWorker("w3"),
    };
    const Task t = smallTask();
    std::size_t cursor = 0;
    assert(selectRoundRobin(ws, t, cursor)->id == "w1");
    assert(cursor == 1);
    assert(selectRoundRobin(ws, t, cursor)->id == "w2");
    assert(cursor == 2);
    assert(selectRoundRobin(ws, t, cursor)->id == "w3");
    assert(cursor == 0);
    assert(selectRoundRobin(ws, t, cursor)->id == "w1");  // wraps around
    PASS("roundRobin_cycles");
}

static void test_roundRobin_skipsOffline() {
    std::vector<Worker> ws = {
        makeWorker("w1", false),    // offline
        makeWorker("w2", true),
        makeWorker("w3", true),
    };
    const Task t = smallTask();
    std::size_t cursor = 0;
    // cursor starts at w1 (offline) → skips to w2
    assert(selectRoundRobin(ws, t, cursor)->id == "w2");
    assert(selectRoundRobin(ws, t, cursor)->id == "w3");
    assert(selectRoundRobin(ws, t, cursor)->id == "w2");  // w1 still offline
    PASS("roundRobin_skipsOffline");
}

static void test_roundRobin_skipsInsufficientResources() {
    // w1 has no CPU headroom
    std::vector<Worker> ws = {
        makeWorker("w1", true, 80.0, 10.0),  // only 0.8 cores free
        makeWorker("w2", true, 20.0, 10.0),
    };
    const Task t = smallTask();
    std::size_t cursor = 0;
    assert(selectRoundRobin(ws, t, cursor)->id == "w2");
    PASS("roundRobin_skipsInsufficientResources");
}

static void test_roundRobin_noWorker() {
    std::vector<Worker> ws = {
        makeWorker("w1", false),
        makeWorker("w2", false),
    };
    std::size_t cursor = 0;
    assert(selectRoundRobin(ws, smallTask(), cursor) == nullptr);
    PASS("roundRobin_noWorker");
}

// ─── Least Loaded ────────────────────────────────────────────────────────────

static void test_leastLoaded_fewestActiveTasks() {
    std::vector<Worker> ws = {
        makeWorker("w1", true, 30.0, 40.0, /*activeTasks=*/2),
        makeWorker("w2", true, 55.0, 50.0, /*activeTasks=*/0),
        makeWorker("w3", true, 20.0, 25.0, /*activeTasks=*/1),
    };
    // w2 has 0 active tasks → wins despite higher load
    assert(selectLeastLoaded(ws, smallTask())->id == "w2");
    PASS("leastLoaded_fewestActiveTasks");
}

static void test_leastLoaded_tieBreakedByResourceScore() {
    // w1 and w2 both have 0 active tasks; w2 has lower score
    std::vector<Worker> ws = {
        makeWorker("w1", true, 50.0, 50.0, 0),  // score = 50
        makeWorker("w2", true, 20.0, 25.0, 0),  // score = 22 → wins
    };
    assert(selectLeastLoaded(ws, smallTask())->id == "w2");
    PASS("leastLoaded_tieBreakedByResourceScore");
}

static void test_leastLoaded_skipsOffline() {
    std::vector<Worker> ws = {
        makeWorker("w1", false, 5.0, 5.0, 0),  // offline, lowest load
        makeWorker("w2", true,  30.0, 40.0, 1),
    };
    assert(selectLeastLoaded(ws, smallTask())->id == "w2");
    PASS("leastLoaded_skipsOffline");
}

static void test_leastLoaded_noWorker() {
    std::vector<Worker> ws = {
        makeWorker("w1", false),
    };
    assert(selectLeastLoaded(ws, smallTask()) == nullptr);
    PASS("leastLoaded_noWorker");
}

// ─── Priority-Based ──────────────────────────────────────────────────────────

static void test_priorityBased_higherPriorityQueuedTask() {
    // The queued task has priority 3 (high) vs task priority 1 (low)
    // The algorithm should pick the BEST WORKER for the highest-priority task.
    // Both tasks need the same resources so both workers are eligible.
    std::vector<Worker> ws = {
        makeWorker("w1", true, 30.0, 40.0),  // score 34
        makeWorker("w2", true, 20.0, 25.0),  // score 22 → best resource score → wins
    };
    const Task task   = { "t1", 1, 1.0, 256.0 };          // priority 1
    const std::vector<Task> queued = { { "t2", 3, 1.0, 256.0 } };  // priority 3 (high)
    // selectPriorityBased finds highest-priority task (t2, priority 3) and
    // assigns it to the best worker by resource score (w2)
    assert(selectPriorityBased(ws, task, queued)->id == "w2");
    PASS("priorityBased_higherPriorityQueuedTask");
}

static void test_priorityBased_equalPriorities() {
    // queued task has same priority as submitted task; resource-aware tie-break
    std::vector<Worker> ws = {
        makeWorker("w1", true, 30.0, 40.0),  // score 34
        makeWorker("w2", true, 20.0, 25.0),  // score 22 → wins
    };
    const Task task   = { "t1", 2, 1.0, 256.0 };
    const std::vector<Task> queued = { { "t2", 2, 1.0, 256.0 } };
    // highest-priority task is t1 or t2 (same priority 2); selectPriorityBased
    // keeps &task as highestPriorityTask if priority is not strictly greater.
    // Either way, resource-aware picks w2.
    assert(selectPriorityBased(ws, task, queued)->id == "w2");
    PASS("priorityBased_equalPriorities");
}

static void test_priorityBased_noQueuedTasks() {
    std::vector<Worker> ws = {
        makeWorker("w1", true, 30.0, 40.0),
        makeWorker("w2", true, 20.0, 25.0),
    };
    const Task task = { "t1", 2, 1.0, 256.0 };
    // Empty queuedTasks: falls back to task itself, resource-aware picks w2
    assert(selectPriorityBased(ws, task, {})->id == "w2");
    PASS("priorityBased_noQueuedTasks");
}

static void test_priorityBased_noSuitableWorker() {
    // All workers offline
    std::vector<Worker> ws = {
        makeWorker("w1", false),
        makeWorker("w2", false),
    };
    const Task task = { "t1", 2, 1.0, 256.0 };
    assert(selectPriorityBased(ws, task, {}) == nullptr);
    PASS("priorityBased_noSuitableWorker");
}

// ─── Scheduler class ─────────────────────────────────────────────────────────

static void test_scheduler_class_incrementsActiveTasks() {
    std::vector<Worker> ws = {
        makeWorker("w1", true, 30.0, 40.0, 0),
        makeWorker("w2", true, 20.0, 25.0, 0),
    };
    Scheduler sched(Strategy::LeastLoaded);
    const Task t = smallTask();
    const SchedulingDecision d = sched.schedule(t, ws);
    assert(d.assigned);
    // Both have 0 active tasks; tie-break by resource score → w2 selected
    assert(d.workerId == "w2");
    // activeTasks on w2 must have been incremented
    const Worker& selected = (ws[0].id == "w2") ? ws[0] : ws[1];
    assert(selected.activeTasks == 1);
    PASS("scheduler_class_incrementsActiveTasks");
}

static void test_scheduler_class_noWorker() {
    std::vector<Worker> ws = {
        makeWorker("w1", false),
    };
    Scheduler sched(Strategy::ResourceAware);
    const SchedulingDecision d = sched.schedule(smallTask(), ws);
    assert(!d.assigned);
    assert(d.workerId.empty());
    PASS("scheduler_class_noWorker");
}

static void test_scheduler_class_setStrategy() {
    Scheduler sched(Strategy::RoundRobin);
    assert(sched.strategy() == Strategy::RoundRobin);
    sched.setStrategy(Strategy::PriorityBased);
    assert(sched.strategy() == Strategy::PriorityBased);
    PASS("scheduler_class_setStrategy");
}

static void test_strategyName() {
    assert(std::string(strategyName(Strategy::RoundRobin))    == "round-robin");
    assert(std::string(strategyName(Strategy::LeastLoaded))   == "least-loaded");
    assert(std::string(strategyName(Strategy::PriorityBased)) == "priority-based");
    assert(std::string(strategyName(Strategy::ResourceAware)) == "resource-aware");
    PASS("strategyName");
}

// ─── canRun / resourceScore helpers ─────────────────────────────────────────

static void test_canRun_offlineWorker() {
    Worker w = makeWorker("w1", false);
    assert(!canRun(w, smallTask()));
    PASS("canRun_offlineWorker");
}

static void test_canRun_exactFit() {
    // Worker: 4 cores at 0% → 4 cores free; task needs exactly 4 cores
    Worker w = makeWorker("w1", true, 0.0, 0.0);
    Task t   = { "t1", 1, 4.0, 1.0 };
    assert(canRun(w, t));
    PASS("canRun_exactFit");
}

static void test_canRun_overLimit() {
    Worker w = makeWorker("w1", true, 0.0, 0.0);
    Task t   = { "t1", 1, 5.0, 1.0 };  // needs 5 cores, only 4 available
    assert(!canRun(w, t));
    PASS("canRun_overLimit");
}

static void test_resourceScore() {
    Worker w = makeWorker("w1", true, 50.0, 50.0);
    assert(approxEq(resourceScore(w), 50.0));  // 50*0.6 + 50*0.4
    PASS("resourceScore");
}

// ─── Entry point ─────────────────────────────────────────────────────────────

int main() {
    std::cout << "\n=== Scheduler Unit Tests ===\n\n";

    // Resource-Aware
    test_resourceAware_picksLowestScore();
    test_resourceAware_skipsOffline();
    test_resourceAware_skipsInsufficientCpu();
    test_resourceAware_skipsInsufficientMemory();
    test_resourceAware_noWorker_allOffline();
    test_resourceAware_noWorker_allInsufficient();

    // Round Robin
    test_roundRobin_cycles();
    test_roundRobin_skipsOffline();
    test_roundRobin_skipsInsufficientResources();
    test_roundRobin_noWorker();

    // Least Loaded
    test_leastLoaded_fewestActiveTasks();
    test_leastLoaded_tieBreakedByResourceScore();
    test_leastLoaded_skipsOffline();
    test_leastLoaded_noWorker();

    // Priority-Based
    test_priorityBased_higherPriorityQueuedTask();
    test_priorityBased_equalPriorities();
    test_priorityBased_noQueuedTasks();
    test_priorityBased_noSuitableWorker();

    // Scheduler class
    test_scheduler_class_incrementsActiveTasks();
    test_scheduler_class_noWorker();
    test_scheduler_class_setStrategy();
    test_strategyName();

    // Helpers
    test_canRun_offlineWorker();
    test_canRun_exactFit();
    test_canRun_overLimit();
    test_resourceScore();

    std::cout << "\nAll tests passed.\n";
    return 0;
}
