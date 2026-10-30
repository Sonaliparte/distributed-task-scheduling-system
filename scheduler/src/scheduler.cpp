#include "scheduler.h"

namespace scheduler {

Scheduler::Scheduler(Strategy strategy) : strategy_(strategy) {}

void Scheduler::setStrategy(Strategy strategy) {
    strategy_ = strategy;
}

Strategy Scheduler::strategy() const {
    return strategy_;
}

SchedulingDecision Scheduler::schedule(
    const Task& task,
    std::vector<Worker>& workers,
    const std::vector<Task>& queuedTasks) {
    const Task* selectedTask = &task;
    if (strategy_ == Strategy::PriorityBased) {
        for (const Task& queuedTask : queuedTasks) {
            if (queuedTask.priority > selectedTask->priority) {
                selectedTask = &queuedTask;
            }
        }
    }

    Worker* selected = nullptr;
    switch (strategy_) {
        case Strategy::RoundRobin:
            selected = selectRoundRobin(workers, *selectedTask, roundRobinCursor_);
            break;
        case Strategy::LeastLoaded:
            selected = selectLeastLoaded(workers, *selectedTask);
            break;
        case Strategy::PriorityBased:
            selected = selectResourceAware(workers, *selectedTask);
            break;
        case Strategy::ResourceAware:
            selected = selectResourceAware(workers, *selectedTask);
            break;
    }

    SchedulingDecision decision;
    decision.strategy = strategy_;
    if (!selected) {
        return decision;
    }

    selected->activeTasks += 1;
    decision.assigned = true;
    decision.taskId = selectedTask->id;
    decision.workerId = selected->id;
    decision.score = resourceScore(*selected);
    return decision;
}

const char* strategyName(Strategy strategy) {
    switch (strategy) {
        case Strategy::RoundRobin: return "round-robin";
        case Strategy::LeastLoaded: return "least-loaded";
        case Strategy::PriorityBased: return "priority-based";
        case Strategy::ResourceAware: return "resource-aware";
    }
    return "resource-aware";
}

}  // namespace scheduler