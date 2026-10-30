/**
 * schedulerService.js
 * -------------------
 * Core Scheduling Engine — routes each scheduling request to the C++ binary
 * (via cppBridge) and falls back to JavaScript implementations if the binary
 * is not available.
 *
 * Supported strategies:
 *   resource-aware  · round-robin  · least-loaded  · priority-based
 *
 * Log format:
 *   [SCHEDULER] ─── New Scheduling Request ───
 *   [SCHEDULER] Task: "<name>" (<id>) | priority: <P> | cpu: <C> | memory: <M>MB
 *   [SCHEDULER] Strategy: <strategy>
 *   [SCHEDULER] Workers: <w1>(cpu X% mem Y% tasks N) | ...
 *   [SCHEDULER] Decision: <assigned to worker-XX | NO WORKER AVAILABLE>
 *   [SCHEDULER] ─────────────────────────────
 */

const tasks   = require('../data/taskStore');
const workers = require('../data/workerStore');
const { getStrategy } = require('../data/strategyStore');
const {
  calculateResourceScore,
  hasEnoughResources,
  updateWorkerResourceUsage,
} = require('../utils/resourceCalculator');
const { executeTask }      = require('./taskExecutor');
const { callCppScheduler } = require('./cppBridge');

// Round-robin cursor (persists across calls for the JS fallback)
let rrIndex = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEligibleWorkers(task) {
  return workers.filter(
    (w) => w.status === 'online' && hasEnoughResources(w, task.cpu, task.memory)
  );
}

function logWorkersEvaluated(taskId) {
  const summary = workers
    .map((w) => {
      const avCpu = (w.totalCpu * (1 - w.cpuUsage / 100)).toFixed(2);
      const avMem = (w.totalMemory * (1 - w.memoryUsage / 100)).toFixed(0);
      const status = w.status === 'online' ? 'online' : 'OFFLINE';
      return `${w.id}(${status} cpu:${w.cpuUsage}% mem:${w.memoryUsage}% tasks:${w.activeTasks} free:${avCpu}cores/${avMem}MB)`;
    })
    .join(' | ');
  console.log(`[SCHEDULER] Workers: ${summary}`);
}

// ─── JS fallback strategy implementations ────────────────────────────────────

function jsFallback_ResourceAware(eligible) {
  const scored = eligible.map((w) => ({
    worker: w,
    score:  calculateResourceScore(w.cpuUsage, w.memoryUsage),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.worker ?? null;
}

function jsFallback_RoundRobin(eligible) {
  if (eligible.length === 0) return null;
  const onlineWorkers = workers.filter((w) => w.status === 'online');
  for (let i = 0; i < onlineWorkers.length; i++) {
    const candidate = onlineWorkers[(rrIndex + i) % onlineWorkers.length];
    if (eligible.includes(candidate)) {
      rrIndex = (onlineWorkers.indexOf(candidate) + 1) % onlineWorkers.length;
      return candidate;
    }
  }
  return null;
}

function jsFallback_LeastLoaded(eligible) {
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    if (a.activeTasks !== b.activeTasks) return a.activeTasks - b.activeTasks;
    return calculateResourceScore(a.cpuUsage, a.memoryUsage) -
           calculateResourceScore(b.cpuUsage, b.memoryUsage);
  });
  return eligible[0];
}

const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

function jsFallback_PriorityBased(task, eligible) {
  const queued = tasks.filter((t) => t.status === 'queued');
  if (queued.length === 0) {
    return { selectedTask: task, selectedWorker: jsFallback_ResourceAware(eligible) };
  }
  queued.sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));
  const highestPriorityTask   = queued[0];
  const eligibleForTop        = getEligibleWorkers(highestPriorityTask);
  const selectedWorker        = jsFallback_ResourceAware(eligibleForTop);
  return { selectedTask: highestPriorityTask, selectedWorker };
}

// ─── Assignment ──────────────────────────────────────────────────────────────

function assignTaskToWorker(task, worker, strategy) {
  const resourceChanges = updateWorkerResourceUsage(worker, task.cpu, task.memory);

  task.status = 'assigned';
  task.worker = worker.id;
  task.retryCount = task.retryCount || 0;
  task.maxRetries = task.maxRetries ?? Number(process.env.TASK_MAX_RETRIES || 3);
  task.executionHistory = task.executionHistory || [];
  task.executionHistory.push({
    workerId: worker.id,
    status: 'assigned',
    assignedAt: new Date().toISOString(),
  });
  task.schedulingDecision = {
    algorithm:         strategy,
    scheduledAt:       new Date().toISOString(),
    workerId:          worker.id,
    score:             calculateResourceScore(worker.cpuUsage, worker.memoryUsage),
    workerCpuBefore:   resourceChanges.cpuBefore,
    workerMemoryBefore: resourceChanges.memoryBefore,
    workerCpuAfter:    resourceChanges.cpuAfter,
    workerMemoryAfter: resourceChanges.memoryAfter,
  };

  worker.activeTasks += 1;
  worker.cpuUsage    = resourceChanges.cpuAfter;
  worker.memoryUsage = resourceChanges.memoryAfter;

  console.log(
    `[SCHEDULER] Decision: ASSIGNED to ${worker.id} | ` +
    `CPU: ${resourceChanges.cpuBefore}%→${resourceChanges.cpuAfter}%, ` +
    `Mem: ${resourceChanges.memoryBefore}%→${resourceChanges.memoryAfter}%`
  );

  executeTask(task, worker, () => retryQueuedTasks());
}

// ─── Core scheduling logic ────────────────────────────────────────────────────

function scheduleTaskById(taskId) {
  const strategy = getStrategy();

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return { success: false, statusCode: 404, message: 'Task not found' };
  if (task.status !== 'queued') {
    return {
      success: false,
      statusCode: 400,
      message: `Task is already in status '${task.status}' and cannot be scheduled`,
    };
  }

  // ── Log header ──────────────────────────────────────────────────────────────
  console.log(`\n[SCHEDULER] ─── New Scheduling Request ───`);
  console.log(
    `[SCHEDULER] Task: "${task.name}" (${task.id}) | priority: ${task.priority} | ` +
    `cpu: ${task.cpu} | memory: ${task.memory}MB`
  );
  console.log(`[SCHEDULER] Strategy: ${strategy}`);
  logWorkersEvaluated(task.id);

  // ── Try C++ binary first ────────────────────────────────────────────────────
  const queuedTasks = tasks.filter((t) => t.status === 'queued' && t.id !== task.id);
  const cppDecision = callCppScheduler(strategy, task, workers, queuedTasks);

  let selectedTask   = task;
  let selectedWorker = null;

  if (cppDecision.reason !== 'binary_not_found' &&
      cppDecision.reason !== 'spawn_error'       &&
      cppDecision.reason !== 'binary_error'      &&
      cppDecision.reason !== 'parse_error'       &&
      cppDecision.reason !== 'empty_output') {
    // C++ binary ran successfully — use its decision
    if (cppDecision.assigned) {
      selectedWorker = workers.find((w) => w.id === cppDecision.workerId) ?? null;
      if (cppDecision.taskId) {
        selectedTask = tasks.find((candidate) => candidate.id === cppDecision.taskId) ?? task;
      }
      if (!selectedWorker) {
        console.warn(`[SCHEDULER] ⚠️  C++ returned workerId "${cppDecision.workerId}" but it was not found in workerStore. Falling back to JS.`);
      }
    } else {
      // C++ explicitly said no suitable worker
      console.log(`[SCHEDULER] Decision: NO WORKER AVAILABLE (reported by C++ binary)`);
      console.log(`[SCHEDULER] ─────────────────────────────\n`);
      return {
        success: false,
        statusCode: 200,
        data: { message: 'No suitable worker available', taskId: task.id, status: 'queued' },
      };
    }
  }

  // ── JS fallback (binary not built yet or worker ID mismatch) ─────────────
  if (!selectedWorker) {
    if (cppDecision.reason === 'binary_not_found') {
      console.log(`[SCHEDULER] [JS-FALLBACK] Running JavaScript implementation of "${strategy}"`);
    }

    if (strategy === 'priority-based') {
      const result = jsFallback_PriorityBased(task, getEligibleWorkers(task));
      selectedTask   = result.selectedTask;
      selectedWorker = result.selectedWorker;
      if (selectedTask.id !== task.id) {
        console.log(
          `[SCHEDULER] Priority-Based: bumped to higher-priority task "${selectedTask.name}" (${selectedTask.id})`
        );
      }
    } else {
      const eligible = getEligibleWorkers(task);
      if (eligible.length === 0) {
        console.log(`[SCHEDULER] Decision: NO WORKER AVAILABLE`);
        console.log(`[SCHEDULER] ─────────────────────────────\n`);
        return {
          success: false,
          statusCode: 200,
          data: { message: 'No suitable worker available', taskId: task.id, status: 'queued' },
        };
      }

      switch (strategy) {
        case 'round-robin':
          selectedWorker = jsFallback_RoundRobin(eligible);
          break;
        case 'least-loaded':
          selectedWorker = jsFallback_LeastLoaded(eligible);
          break;
        case 'resource-aware':
        default:
          selectedWorker = jsFallback_ResourceAware(eligible);
          break;
      }
    }
  }

  if (!selectedWorker) {
    console.log(`[SCHEDULER] Decision: NO WORKER AVAILABLE`);
    console.log(`[SCHEDULER] ─────────────────────────────\n`);
    return {
      success: false,
      statusCode: 200,
      data: { message: 'No suitable worker available', taskId: selectedTask.id, status: 'queued' },
    };
  }

  assignTaskToWorker(selectedTask, selectedWorker, strategy);
  console.log(`[SCHEDULER] ─────────────────────────────\n`);

  return {
    success: true,
    statusCode: 200,
    data: {
      message:            'Task scheduled successfully',
      taskId:             selectedTask.id,
      workerId:           selectedWorker.id,
      algorithm:          strategy,
      schedulingDecision: selectedTask.schedulingDecision,
    },
  };
}

/**
 * Retry all currently queued tasks.
 * Called after a task completes and its resources are released.
 */
function retryQueuedTasks() {
  const queued = tasks.filter((t) => t.status === 'queued');
  if (queued.length === 0) return;
  console.log(`[SCHEDULER] Retrying ${queued.length} queued task(s) after resource release.`);
  for (const t of queued) {
    scheduleTaskById(t.id);
  }
}

module.exports = { scheduleTaskById, retryQueuedTasks };
