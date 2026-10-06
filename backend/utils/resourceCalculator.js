/**
 * resourceCalculator.js
 * ---------------------
 * Pure utility functions for the resource-aware scheduling algorithm.
 * No side effects — easy to unit-test or swap the formula later.
 */

// Weight constants for the scoring formula
const CPU_WEIGHT    = 0.6;
const MEMORY_WEIGHT = 0.4;

/**
 * calculateScore
 * --------------
 * Computes a resource score for a worker.
 * Lower score = less loaded = better candidate.
 *
 * Formula:
 *   score = (cpuUsage * 0.6) + (memoryUsage * 0.4)
 *
 * @param {number} cpuUsage    - Current CPU usage % (0–100)
 * @param {number} memoryUsage - Current Memory usage % (0–100)
 * @returns {number} score
 */
const calculateScore = (cpuUsage, memoryUsage) => {
  return Math.round(cpuUsage * CPU_WEIGHT + memoryUsage * MEMORY_WEIGHT);
};

/**
 * hasEnoughResources
 * ------------------
 * Checks whether a worker can accommodate a task's resource requirements.
 *
 * Converts task CPU cores to a percentage of the worker's totalCpu,
 * and task memory (MB) to a percentage of the worker's totalMemory.
 * Then verifies the worker has headroom (available ≥ required).
 *
 * @param {object} worker - Worker object from workerStore
 * @param {number} taskCpu    - CPU cores required by the task
 * @param {number} taskMemory - Memory (MB) required by the task
 * @returns {boolean}
 */
const hasEnoughResources = (worker, taskCpu, taskMemory) => {
  const availableCpuPct    = 100 - worker.cpuUsage;     // e.g. 100 - 20 = 80%
  const availableMemoryPct = 100 - worker.memoryUsage;  // e.g. 100 - 35 = 65%

  // Convert task requirements to percentages relative to this worker
  const requiredCpuPct    = (taskCpu / worker.totalCpu) * 100;
  const requiredMemoryPct = (taskMemory / worker.totalMemory) * 100;

  return (
    worker.status === "online" &&
    availableCpuPct    >= requiredCpuPct &&
    availableMemoryPct >= requiredMemoryPct
  );
};

/**
 * simulateResourceIncrease
 * ------------------------
 * Updates a worker's simulated CPU and memory usage after task assignment.
 * Clamps values to a maximum of 100% to keep the simulation realistic.
 *
 * @param {object} worker     - Worker object (mutated in place)
 * @param {number} taskCpu    - CPU cores consumed by the task
 * @param {number} taskMemory - Memory (MB) consumed by the task
 */
const simulateResourceIncrease = (worker, taskCpu, taskMemory) => {
  const cpuIncreasePct    = (taskCpu / worker.totalCpu) * 100;
  const memoryIncreasePct = (taskMemory / worker.totalMemory) * 100;

  worker.cpuUsage    = Math.min(100, Math.round(worker.cpuUsage    + cpuIncreasePct));
  worker.memoryUsage = Math.min(100, Math.round(worker.memoryUsage + memoryIncreasePct));
};

module.exports = { calculateScore, hasEnoughResources, simulateResourceIncrease };
