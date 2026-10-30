const tasks = require('../data/taskStore');
const workers = require('../data/workerStore');
const { releaseWorkerResources } = require('./taskExecutor');

const HEARTBEAT_TIMEOUT_MS = Number(process.env.WORKER_HEARTBEAT_TIMEOUT_MS || 10000);

function recoverWorkerTasks(worker) {
  for (const task of tasks) {
    if (task.worker !== worker.id || !['assigned', 'running'].includes(task.status)) continue;

    releaseWorkerResources(worker, task.cpu, task.memory);
    task.worker = null;
    task.retryCount = (task.retryCount || 0) + 1;
    task.executionHistory = task.executionHistory || [];
    task.executionHistory.push({
      workerId: worker.id,
      status: 'failed',
      reason: 'worker_heartbeat_timeout',
      failedAt: new Date().toISOString(),
    });

    if (task.retryCount > (task.maxRetries || 3)) {
      task.status = 'failed';
      task.result = 'worker_failure_retry_limit';
      worker.failedTasks = (worker.failedTasks || 0) + 1;
    } else {
      task.status = 'queued';
    }
  }
}

function checkWorkerHealth() {
  const now = Date.now();
  let recovered = 0;
  for (const worker of workers) {
    if (!worker.url || !worker.lastHeartbeat || worker.status !== 'online') continue;
    if (now - new Date(worker.lastHeartbeat).getTime() <= HEARTBEAT_TIMEOUT_MS) continue;
    worker.status = 'offline';
    recoverWorkerTasks(worker);
    recovered += 1;
    console.warn(`[WORKER-MONITOR] Marked ${worker.id} offline after heartbeat timeout`);
  }
  if (recovered > 0) require('./schedulerService').retryQueuedTasks();
  return recovered;
}

function startWorkerMonitor(intervalMs = Number(process.env.WORKER_MONITOR_INTERVAL_MS || 3000)) {
  const timer = setInterval(checkWorkerHealth, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

module.exports = { checkWorkerHealth, startWorkerMonitor, HEARTBEAT_TIMEOUT_MS };