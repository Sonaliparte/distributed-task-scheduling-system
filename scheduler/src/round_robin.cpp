#include "scheduler.h"

namespace scheduler {

Worker* selectRoundRobin(
    std::vector<Worker>& workers,
    const Task& task,
    std::size_t& cursor) {
    if (workers.empty()) {
        return nullptr;
    }

    for (std::size_t offset = 0; offset < workers.size(); ++offset) {
        const std::size_t index = (cursor + offset) % workers.size();
        if (canRun(workers[index], task)) {
            cursor = (index + 1) % workers.size();
            return &workers[index];
        }
    }
    return nullptr;
}

}  // namespace scheduler
