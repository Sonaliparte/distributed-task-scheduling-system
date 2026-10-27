/**
 * workerStore.js
 * --------------
 * In-memory storage for simulated worker nodes.
 *
 * Each worker node has:
 *  - id: unique identifier
 *  - status: "online" | "offline"
 *  - cpuUsage: current CPU utilization percentage (0 - 100)
 *  - memoryUsage: current Memory utilization percentage (0 - 100)
 *  - totalCpu: total CPU cores available (4 cores each)
 *  - totalMemory: total memory available in MB (8 GB each)
 *  - activeTasks: number of tasks currently executing on this worker
 *
 * NOTE: activeTasks starts at 0 for all workers.  The seeded cpuUsage /
 * memoryUsage values represent baseline OS overhead so that the resource-aware
 * scheduler can demonstrate meaningful score differences from the start.
 * They do NOT imply any pre-existing tasks — those values will rise/fall as
 * the task executor assigns and completes tasks.
 */

const workers = [
  {
    id: "worker-01",
    status: "online",
    cpuUsage: 30,      // baseline OS load ~30 %
    memoryUsage: 40,   // baseline memory usage ~40 %
    totalCpu: 4,
    totalMemory: 8192,
    activeTasks: 0,
  },
  {
    id: "worker-02",
    status: "online",
    cpuUsage: 55,      // moderately loaded worker
    memoryUsage: 50,
    totalCpu: 4,
    totalMemory: 8192,
    activeTasks: 0,
  },
  {
    id: "worker-03",
    status: "online",
    cpuUsage: 20,      // lightest worker — preferred by resource-aware strategy
    memoryUsage: 25,
    totalCpu: 4,
    totalMemory: 8192,
    activeTasks: 0,
  },
];

module.exports = workers;

