#include "scheduler.h"

namespace scheduler {

Worker* selectPriorityBased(
    std::vector<Worker>& workers,
    const Task& task,
    const std::vector<Task>& queuedTasks) {
    const Task* highestPriorityTask = &task;
    for (const Task& queuedTask : queuedTasks) {
        if (queuedTask.priority > highestPriorityTask->priority) {
            highestPriorityTask = &queuedTask;
        }
    }
    return selectResourceAware(workers, *highestPriorityTask);
}

}  // namespace scheduler
