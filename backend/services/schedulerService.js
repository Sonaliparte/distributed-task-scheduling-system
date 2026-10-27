/**
 * schedulerService.js
 * -------------------
 * Core Scheduling Engine — supports four strategies:
 *
 *   1. resource-aware  : Weighted CPU*0.6 + Memory*0.4 score; lowest score wins.
 *   2. round-robin     : Distributes tasks cyclically across online workers.
 *   3. least-loaded    : Assigns to worker with fewest activeTasks.
 *   4. priority-based  : Schedules highest-priority queued task first, then picks
 *                        the best-available worker by resource score.
 */

const tasks = require('../data/taskStore');
const workers = require('../data/workerStore');
const { getStrategy } = require('../data/strategyStore');
const {
  calculateResourceScore,
  hasEnoughResources,
  updateWorkerResourceUsage,
} = require('../utils/resourceCalculator');
const { executeTask } = require('./taskExecutor');

// Round-robin cursor (persists across calls)
let rrIndex = 0;

// ─── Worker Candidate Filtering ────────────────────────────────────────────────

function getEligibleWorkers(task) {
  return workers.filter(
    (w) => w.status === 'online' && hasEnoughResources(w, task.cpu, task.memory)
  );
}

// ─── Strategy Implementations ──────────────────────────────────────────────────

/**
 * Resource-Aware: lowest weighted load score wins.
 */
function selectResourceAware(eligible) {
  const scored = eligible.map((w) => ({
    worker: w,
    score: calculateResourceScore(w.cpuUsage, w.memoryUsage),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.worker ?? null;
}

/**
 * Round Robin: pick the next worker in cyclic order (skip if not eligible).
 * Falls back to resource-aware if no candidate at the current cursor position.
 */
function selectRoundRobin(eligible) {
  if (eligible.length === 0) return null;

  // Try to advance from the current rrIndex and pick the first eligible worker
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

/**
 * Least Loaded: worker with the lowest activeTasks count wins.
 * Tie-break: lower resource score.
 */
function selectLeastLoaded(eligible) {
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    if (a.activeTasks !== b.activeTasks) return a.activeTasks - b.activeTasks;
    return calculateResourceScore(a.cpuUsage, a.memoryUsage) -
           calculateResourceScore(b.cpuUsage, b.memoryUsage);
  });
  return eligible[0];
}

/**
 * Priority-Based: find the highest-priority queued task among ALL queued tasks,
 * then assign it to the best eligible worker by resource score.
 * Returns the chosen task (may differ from the originally requested taskId).
 */
const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

function selectPriorityBased(task, eligible) {
  // Among ALL queued tasks, find highest priority; use passed task as default
  const queued = tasks.filter((t) => t.status === 'queued');
  if (queued.length === 0) return { selectedTask: task, selectedWorker: selectResourceAware(eligible) };

  queued.sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));
  const highestPriorityTask = queued[0];

  // Re-compute eligible for the highest-priority task (may differ from original task)
  const eligibleForTop = getEligibleWorkers(highestPriorityTask);
  const selectedWorker = selectResourceAware(eligibleForTop);

  return { selectedTask: highestPriorityTask, selectedWorker };
}

// ─── Assignment Logic ──────────────────────────────────────────────────────────

function assignTaskToWorker(task, worker, strategy) {
  const resourceChanges = updateWorkerResourceUsage(worker, task.cpu, task.memory);

  task.status = 'assigned';
  task.worker = worker.id;
  task.schedulingDecision = {
    algorithm: strategy,
    scheduledAt: new Date().toISOString(),
    workerId: worker.id,
    score: calculateResourceScore(worker.cpuUsage, worker.memoryUsage),
    workerCpuBefore: resourceChanges.cpuBefore,
    workerMemoryBefore: resourceChanges.memoryBefore,
    workerCpuAfter: resourceChanges.cpuAfter,
    workerMemoryAfter: resourceChanges.memoryAfter,
  };

  worker.activeTasks += 1;
  worker.cpuUsage = resourceChanges.cpuAfter;
  worker.memoryUsage = resourceChanges.memoryAfter;

  console.log(
    `[SCHEDULER] (${strategy}) Assigned "${task.name}" → ${worker.id} | ` +
    `CPU: ${resourceChanges.cpuBefore}%→${resourceChanges.cpuAfter}%, ` +
    `Mem: ${resourceChanges.memoryBefore}%→${resourceChanges.memoryAfter}%`
  );

  // Start the simulated execution lifecycle; on completion, retry any remaining queued tasks
  executeTask(task, worker, () => retryQueuedTasks());
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Schedule a specific task by ID.
 * @param {string} taskId
 * @returns {object} Result descriptor
 */
function scheduleTaskById(taskId) {
  const strategy = getStrategy();

  // Find task
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return { success: false, statusCode: 404, message: 'Task not found' };
  if (task.status !== 'queued') {
    return {
      success: false,
      statusCode: 400,
      message: `Task is already in status '${task.status}' and cannot be scheduled`,
    };
  }

  console.log(`\n[SCHEDULER] Strategy: ${strategy} | Task: "${task.name}" (${task.id})`);

  let selectedTask = task;
  let selectedWorker = null;

  if (strategy === 'priority-based') {
    const result = selectPriorityBased(task, getEligibleWorkers(task));
    selectedTask = result.selectedTask;
    selectedWorker = result.selectedWorker;
    // If priority bumped to a different task, ensure the original task is also noted
    if (selectedTask.id !== task.id) {
      console.log(
        `[SCHEDULER] Priority-Based: bumped to higher-priority task "${selectedTask.name}" (${selectedTask.id})`
      );
    }
  } else {
    const eligible = getEligibleWorkers(task);
    if (eligible.length === 0) {
      console.log(`[SCHEDULER] No suitable worker for task ${task.id}`);
      return {
        success: false,
        statusCode: 200,
        data: { message: 'No suitable worker available', taskId: task.id, status: 'queued' },
      };
    }

    switch (strategy) {
      case 'round-robin':
        selectedWorker = selectRoundRobin(eligible);
        break;
      case 'least-loaded':
        selectedWorker = selectLeastLoaded(eligible);
        break;
      case 'resource-aware':
      default:
        selectedWorker = selectResourceAware(eligible);
        break;
    }
  }

  if (!selectedWorker) {
    return {
      success: false,
      statusCode: 200,
      data: { message: 'No suitable worker available', taskId: selectedTask.id, status: 'queued' },
    };
  }

  assignTaskToWorker(selectedTask, selectedWorker, strategy);

  return {
    success: true,
    statusCode: 200,
    data: {
      message: 'Task scheduled successfully',
      taskId: selectedTask.id,
      workerId: selectedWorker.id,
      algorithm: strategy,
      schedulingDecision: selectedTask.schedulingDecision,
    },
  };
}

/**
 * Try to schedule ALL currently queued tasks (called after a task completes
 * and resources are freed, or after strategy changes).
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
