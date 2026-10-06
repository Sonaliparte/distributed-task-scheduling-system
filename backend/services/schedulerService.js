/**
 * schedulerService.js
 * -------------------
 * Core scheduling logic for the Distributed Task Scheduler.
 *
 * Algorithm: Resource-Aware / Least-Loaded Scheduling
 *
 * Steps:
 *  1. Filter online workers.
 *  2. Check each worker has enough free CPU and Memory for the task.
 *  3. Score every eligible worker: score = (cpu * 0.6) + (memory * 0.4)
 *  4. Select the worker with the lowest score (least loaded).
 *  5. Assign the task, update worker usage, and return the decision.
 */

const workers = require("../data/workerStore");
const tasks   = require("../data/taskStore");
const {
  calculateScore,
  hasEnoughResources,
  simulateResourceIncrease,
} = require("../utils/resourceCalculator");

/**
 * scheduleTask
 * ------------
 * Main entry point for the scheduling engine.
 *
 * @param {string} taskId - ID of the queued task to schedule
 * @returns {object} result - Scheduling decision (success or failure)
 */
const scheduleTask = (taskId) => {
  // ── 1. Find the task ────────────────────────────────────────────────────────
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return { success: false, reason: "TASK_NOT_FOUND" };
  }

  if (task.status !== "queued") {
    return { success: false, reason: "TASK_NOT_QUEUED", currentStatus: task.status };
  }

  console.log(`\n[SCHEDULER] Received task: ${task.name}`);
  console.log(`[SCHEDULER] CPU required: ${task.cpu} cores | Memory required: ${task.memory} MB`);
  console.log("[SCHEDULER] Evaluating workers...\n");

  // ── 2. Filter online workers and score them ─────────────────────────────────
  const eligibleWorkers = [];

  for (const worker of workers) {
    if (!hasEnoughResources(worker, task.cpu, task.memory)) {
      console.log(
        `[SCHEDULER] ${worker.id} — SKIPPED (status: ${worker.status}, ` +
        `cpu: ${worker.cpuUsage}%, mem: ${worker.memoryUsage}%)`
      );
      continue;
    }

    const score = calculateScore(worker.cpuUsage, worker.memoryUsage);

    console.log(`[SCHEDULER] ${worker.id}`);
    console.log(`            CPU: ${worker.cpuUsage}%  Memory: ${worker.memoryUsage}%  Score: ${score}`);

    eligibleWorkers.push({ worker, score });
  }

  // ── 3. Check if any worker is eligible ─────────────────────────────────────
  if (eligibleWorkers.length === 0) {
    console.log("[SCHEDULER] No suitable worker available. Task remains queued.\n");
    return { success: false, reason: "NO_SUITABLE_WORKER" };
  }

  // ── 4. Select the lowest-score worker ──────────────────────────────────────
  eligibleWorkers.sort((a, b) => a.score - b.score);
  const { worker: selectedWorker, score: selectedScore } = eligibleWorkers[0];

  console.log(`\n[SCHEDULER] Selected: ${selectedWorker.id} (score: ${selectedScore})`);

  // Capture before state for the scheduling decision log
  const beforeCpu    = selectedWorker.cpuUsage;
  const beforeMemory = selectedWorker.memoryUsage;

  // ── 5. Assign the task ──────────────────────────────────────────────────────
  task.status = "assigned";
  task.worker = selectedWorker.id;

  // ── 6. Update simulated worker resource usage ───────────────────────────────
  simulateResourceIncrease(selectedWorker, task.cpu, task.memory);
  selectedWorker.activeTasks += 1;

  console.log(`[SCHEDULER] Task assigned to ${selectedWorker.id}`);
  console.log(`[SCHEDULER] Worker CPU:    ${beforeCpu}%  →  ${selectedWorker.cpuUsage}%`);
  console.log(`[SCHEDULER] Worker Memory: ${beforeMemory}%  →  ${selectedWorker.memoryUsage}%`);
  console.log("[SCHEDULER] Task assigned successfully\n");

  // ── 7. Return scheduling decision ──────────────────────────────────────────
  return {
    success: true,
    taskId: task.id,
    workerId: selectedWorker.id,
    algorithm: "resource-aware",
    reason: {
      cpuUsageBefore:    beforeCpu,
      memoryUsageBefore: beforeMemory,
      cpuUsageAfter:     selectedWorker.cpuUsage,
      memoryUsageAfter:  selectedWorker.memoryUsage,
      score:             selectedScore,
    },
  };
};

module.exports = { scheduleTask };
