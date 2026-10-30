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

function finishTask(task, worker, result = 'success') {
  if (task.status !== 'running' && task.status !== 'assigned') return false;
  task.status = result === 'success' ? 'completed' : 'failed';
  task.completedAt = new Date().toISOString();
  task.result = result;
  task.executionHistory = task.executionHistory || [];
  task.executionHistory.push({
    workerId: worker.id,
    status: task.status,
    completedAt: task.completedAt,
  });
  releaseWorkerResources(worker, task.cpu, task.memory);
  if (task.status === 'completed') worker.completedTasks = (worker.completedTasks || 0) + 1;
  else worker.failedTasks = (worker.failedTasks || 0) + 1;
  executing.delete(task.id);
  return true;
}

function completeExternalTask(task, worker, result) {
  return finishTask(task, worker, result);
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

  if (worker.url) {
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    task.executionHistory = task.executionHistory || [];
    task.executionHistory.push({ workerId: worker.id, status: 'running', startedAt: task.startedAt });
    fetch(`${worker.url}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    }).then((response) => {
      if (!response.ok) throw new Error(`worker returned ${response.status}`);
    }).catch((error) => {
      console.error(`[EXECUTOR] Dispatch to ${worker.id} failed: ${error.message}`);
      worker.status = 'offline';
      finishTask(task, worker, 'failed');
      task.status = 'queued';
      task.worker = null;
      task.retryCount = (task.retryCount || 0) + 1;
      if (task.retryCount > (task.maxRetries || 3)) task.status = 'failed';
      if (typeof onComplete === 'function') onComplete();
    });
    return;
  }

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

      finishTask(task, worker);

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

module.exports = { executeTask, releaseWorkerResources, completeExternalTask };
