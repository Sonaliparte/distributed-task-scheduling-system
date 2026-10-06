/**
 * resourceCalculator.js
 * --------------------
 * Helper utilities for resource scoring and capacity checks.
 */

/**
 * Calculates the resource-aware score for a worker.
 * Formula: resourceScore = (cpuUsage * 0.6) + (memoryUsage * 0.4)
 * Lower score = less loaded worker = better candidate.
 */
function calculateResourceScore(cpuUsage, memoryUsage) {
  return cpuUsage * 0.6 + memoryUsage * 0.4;
}

/**
 * Calculates available CPU in cores.
 */
function getAvailableCpu(worker) {
  return worker.totalCpu * (1 - worker.cpuUsage / 100);
}

/**
 * Calculates available Memory in MB.
 */
function getAvailableMemory(worker) {
  return worker.totalMemory * (1 - worker.memoryUsage / 100);
}

/**
 * Checks if a worker has enough available CPU and Memory for a given task.
 */
function hasEnoughResources(worker, taskCpu, taskMemory) {
  const availCpu = getAvailableCpu(worker);
  const availMem = getAvailableMemory(worker);

  return availCpu >= taskCpu && availMem >= taskMemory;
}

/**
 * Updates worker's simulated CPU and Memory usage after task assignment.
 * CPU increase percentage = (taskCpu / totalCpu) * 100
 * Memory increase percentage = (taskMemory / totalMemory) * 100
 */
function updateWorkerResourceUsage(worker, taskCpu, taskMemory) {
  const cpuDelta = (taskCpu / worker.totalCpu) * 100;
  const memDelta = (taskMemory / worker.totalMemory) * 100;

  const newCpu = Math.min(100, Math.round((worker.cpuUsage + cpuDelta) * 10) / 10);
  const newMem = Math.min(100, Math.round((worker.memoryUsage + memDelta) * 10) / 10);

  return {
    cpuBefore: worker.cpuUsage,
    memoryBefore: worker.memoryUsage,
    cpuAfter: newCpu,
    memoryAfter: newMem,
  };
}

module.exports = {
  calculateResourceScore,
  getAvailableCpu,
  getAvailableMemory,
  hasEnoughResources,
  updateWorkerResourceUsage,
};
