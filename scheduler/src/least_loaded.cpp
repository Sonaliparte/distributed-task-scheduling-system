#include "scheduler.h"

namespace scheduler {

Worker* selectLeastLoaded(std::vector<Worker>& workers, const Task& task) {
    Worker* selected = nullptr;
    for (Worker& worker : workers) {
        if (!canRun(worker, task)) {
            continue;
        }

        if (selected == nullptr ||
            worker.activeTasks < selected->activeTasks ||
            (worker.activeTasks == selected->activeTasks &&
             resourceScore(worker) < resourceScore(*selected))) {
            selected = &worker;
        }
    }
    return selected;
}

}  // namespace scheduler
