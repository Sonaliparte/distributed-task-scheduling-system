/**
 * taskExecutor.js
 * ---------------
 * Simulates the task execution lifecycle after a task is assigned to a worker.
 *
 * Lifecycle:  assigned  →  running  →  completed
 *
 * Timeline (randomized per task):
 *   - assigned  → running   : 2–4 seconds
 *   - running   → completed : 4–10 seconds
 *
 * On completion:
 *   - Records startedAt, completedAt, result
 *   - Releases simulated CPU and Memory back to the worker
 *   - Decrements activeTasks count on the worker
 *   - Triggers a pass to schedule any remaining queued tasks
 */

const workers = require('../data/workerStore');

// Track in-progress task IDs to prevent double-execution
const executing = new Set();

/**
 * Releases a worker's simulated resources after a task completes.
 * @param {object} worker
 * @param {number} taskCpu   - CPU cores the task consumed
 * @param {number} taskMemory - Memory MB the task consumed
 */
function releaseWorkerResources(worker, taskCpu, taskMemory) {
  const cpuDelta = (taskCpu / worker.totalCpu) * 100;
  const memDelta = (taskMemory / worker.totalMemory) * 100;

  worker.cpuUsage = Math.max(0, Math.round((worker.cpuUsage - cpuDelta) * 10) / 10);
  worker.memoryUsage = Math.max(0, Math.round((worker.memoryUsage - memDelta) * 10) / 10);
  worker.activeTasks = Math.max(0, worker.activeTasks - 1);
}

/**
 * Begins the simulated execution lifecycle for an assigned task.
 * @param {object} task    - The task object from taskStore (mutated in place)
 * @param {object} worker  - The worker object from workerStore (mutated in place)
 * @param {Function} [onComplete] - Optional callback after task completes (for retry trigger)
 */
function executeTask(task, worker, onComplete) {
  if (executing.has(task.id)) {
    console.log(`[EXECUTOR] Task ${task.id} is already executing. Skipping.`);
    return;
  }

  executing.add(task.id);

  const runDelay = 2000 + Math.floor(Math.random() * 2000); // 2–4 seconds to start running
  const completeDelay = 4000 + Math.floor(Math.random() * 6000); // 4–10 seconds to complete

  // assigned → running
  setTimeout(() => {
    if (task.status !== 'assigned') {
      executing.delete(task.id);
      return;
    }

    task.status = 'running';
    task.startedAt = new Date().toISOString();

    console.log(
      `[EXECUTOR] Task "${task.name}" (${task.id}) is now RUNNING on ${worker.id}`
    );

    // running → completed
    setTimeout(() => {
      if (task.status !== 'running') {
        executing.delete(task.id);
        return;
      }

      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = 'success';

      // Release resources back to the worker
      releaseWorkerResources(worker, task.cpu, task.memory);

      executing.delete(task.id);

      console.log(
        `[EXECUTOR] Task "${task.name}" (${task.id}) COMPLETED on ${worker.id}. ` +
        `Worker load → CPU: ${worker.cpuUsage}%, Mem: ${worker.memoryUsage}%`
      );

      // Notify caller so the scheduler can pick up remaining queued tasks
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, completeDelay);
  }, runDelay);
}

module.exports = { executeTask };
