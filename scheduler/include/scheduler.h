#pragma once

#include <cstddef>
#include <string>
#include <vector>

namespace scheduler {

enum class Strategy {
    RoundRobin,
    LeastLoaded,
    PriorityBased,
    ResourceAware,
};

struct Task {
    std::string id;
    int priority = 0;
    double cpu = 0.0;
    double memory = 0.0;
};

struct Worker {
    std::string id;
    bool online = true;
    double cpuUsage = 0.0;
    double memoryUsage = 0.0;
    int activeTasks = 0;
    double totalCpu = 100.0;
    double totalMemory = 100.0;
};

struct SchedulingDecision {
    bool assigned = false;
    std::string taskId;
    std::string workerId;
    Strategy strategy = Strategy::ResourceAware;
    double score = 0.0;
};

double resourceScore(const Worker& worker);
bool canRun(const Worker& worker, const Task& task);

Worker* selectRoundRobin(
    std::vector<Worker>& workers,
    const Task& task,
    std::size_t& cursor);
Worker* selectLeastLoaded(std::vector<Worker>& workers, const Task& task);
Worker* selectPriorityBased(
    std::vector<Worker>& workers,
    const Task& task,
    const std::vector<Task>& queuedTasks);
Worker* selectResourceAware(std::vector<Worker>& workers, const Task& task);

class Scheduler {
public:
    explicit Scheduler(Strategy strategy = Strategy::ResourceAware);

    void setStrategy(Strategy strategy);
    Strategy strategy() const;
    SchedulingDecision schedule(
        const Task& task,
        std::vector<Worker>& workers,
        const std::vector<Task>& queuedTasks = {});

private:
    Strategy strategy_;
    std::size_t roundRobinCursor_ = 0;
};

const char* strategyName(Strategy strategy);

}  // namespace scheduler
