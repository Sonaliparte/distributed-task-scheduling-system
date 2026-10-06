/**
 * workerStore.js
 * --------------
 * In-memory registry of simulated worker nodes.
 * In a later layer, these will be real container/process registrations.
 *
 * Fields:
 *   id          — unique worker identifier
 *   status      — "online" | "offline"
 *   cpuUsage    — current CPU usage percentage (0–100)
 *   memoryUsage — current Memory usage percentage (0–100)
 *   totalCpu    — total CPU cores available
 *   totalMemory — total Memory in MB
 *   activeTasks — number of tasks currently running on this worker
 */

const workers = [
  {
    id: "worker-01",
    status: "online",
    cpuUsage: 30,
    memoryUsage: 40,
    totalCpu: 4,
    totalMemory: 8192,
    activeTasks: 1,
  },
  {
    id: "worker-02",
    status: "online",
    cpuUsage: 70,
    memoryUsage: 60,
    totalCpu: 4,
    totalMemory: 8192,
    activeTasks: 3,
  },
  {
    id: "worker-03",
    status: "online",
    cpuUsage: 20,
    memoryUsage: 35,
    totalCpu: 4,
    totalMemory: 8192,
    activeTasks: 0,
  },
];

module.exports = workers;
