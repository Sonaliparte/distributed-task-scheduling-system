#include "scheduler.h"

#include <algorithm>

namespace scheduler {

double resourceScore(const Worker& worker) {
    return worker.cpuUsage * 0.6 + worker.memoryUsage * 0.4;
}

bool canRun(const Worker& worker, const Task& task) {
    if (!worker.online || worker.totalCpu <= 0.0 || worker.totalMemory <= 0.0) {
        return false;
    }

    const double availableCpu = worker.totalCpu * (1.0 - worker.cpuUsage / 100.0);
    const double availableMemory =
        worker.totalMemory * (1.0 - worker.memoryUsage / 100.0);
    return task.cpu <= availableCpu && task.memory <= availableMemory;
}

Worker* selectResourceAware(std::vector<Worker>& workers, const Task& task) {
    Worker* selected = nullptr;
    for (Worker& worker : workers) {
        if (canRun(worker, task) &&
            (selected == nullptr || resourceScore(worker) < resourceScore(*selected))) {
            selected = &worker;
        }
    }
    return selected;
}

}  // namespace scheduler
