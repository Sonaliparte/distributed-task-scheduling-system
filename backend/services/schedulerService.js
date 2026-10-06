/**
 * schedulerService.js
 * -------------------
 * Core Scheduling Engine for Layer 3.
 *
 * Implements Resource-Aware / Least-Loaded Scheduling:
 *  1. Retrieves queued task.
 *  2. Evaluates online workers for CPU & Memory capacity.
 *  3. Computes resource score: (cpuUsage * 0.6) + (memoryUsage * 0.4)
 *  4. Selects worker with the lowest score.
 *  5. Assigns task, updates task status to "assigned", sets worker ID.
 *  6. Updates worker active tasks count and simulated CPU / Memory usage.
 */

const tasks = require("../data/taskStore");
const workers = require("../data/workerStore");
const {
  calculateResourceScore,
  hasEnoughResources,
  updateWorkerResourceUsage,
} = require("../utils/resourceCalculator");

/**
 * Main scheduling function.
 * @param {string} taskId - The ID of the task to schedule
 * @returns {object} Result of the scheduling operation
 */
function scheduleTaskById(taskId) {
  // 1. Find the task
  const task = tasks.find((t) => t.id === taskId);

  if (!task) {
    return { success: false, statusCode: 404, message: "Task not found" };
  }

  // 2. Verify task is queued
  if (task.status !== "queued") {
    return {
      success: false,
      statusCode: 400,
      message: `Task is already in status '${task.status}' and cannot be scheduled`,
    };
  }

  console.log(`\n[SCHEDULER] Received task: ${task.name} (ID: ${task.id})`);
  console.log(`[SCHEDULER] Required Resources -> CPU: ${task.cpu} core(s), Memory: ${task.memory} MB`);
  console.log(`[SCHEDULER] Evaluating workers...`);

  // 3. Filter online workers that satisfy CPU and Memory capacity requirements
  const candidates = [];

  for (const worker of workers) {
    if (worker.status !== "online") {
      console.log(`[SCHEDULER] ${worker.id} is offline. Skipping.`);
      continue;
    }

    const score = calculateResourceScore(worker.cpuUsage, worker.memoryUsage);
    const suitable = hasEnoughResources(worker, task.cpu, task.memory);

    console.log(
      `[SCHEDULER] ${worker.id} | CPU: ${worker.cpuUsage}% | Memory: ${worker.memoryUsage}% | Score: ${score} | Capable: ${suitable ? "YES" : "NO"}`
    );

    if (suitable) {
      candidates.push({ worker, score });
    }
  }

  // 4. Handle case when no worker is capable or available
  if (candidates.length === 0) {
    console.log(`[SCHEDULER] ❌ No suitable worker available for task ${task.id}`);
    return {
      success: false,
      statusCode: 200, // Return 200 with queued status message as requested by spec
      data: {
        message: "No suitable worker available",
        taskId: task.id,
        status: "queued",
      },
    };
  }

  // 5. Sort candidates by score ascending (lowest score wins)
  candidates.sort((a, b) => a.score - b.score);

  const selectedCandidate = candidates[0];
  const selectedWorker = selectedCandidate.worker;
  const selectedScore = selectedCandidate.score;

  console.log(`[SCHEDULER] Selected ${selectedWorker.id} (Lowest Score: ${selectedScore})`);

  // 6. Calculate post-assignment simulated resource usage
  const resourceChanges = updateWorkerResourceUsage(selectedWorker, task.cpu, task.memory);

  // 7. Update Task state
  task.status = "assigned";
  task.worker = selectedWorker.id;
  task.schedulingDecision = {
    algorithm: "resource-aware",
    scheduledAt: new Date().toISOString(),
    workerId: selectedWorker.id,
    score: selectedScore,
    workerCpuBefore: resourceChanges.cpuBefore,
    workerMemoryBefore: resourceChanges.memoryBefore,
    workerCpuAfter: resourceChanges.cpuAfter,
    workerMemoryAfter: resourceChanges.memoryAfter,
  };

  // 8. Update Worker state
  selectedWorker.activeTasks += 1;
  selectedWorker.cpuUsage = resourceChanges.cpuAfter;
  selectedWorker.memoryUsage = resourceChanges.memoryAfter;

  console.log(
    `[SCHEDULER] Task assigned successfully! ${selectedWorker.id} load updated -> CPU: ${resourceChanges.cpuBefore}% -> ${resourceChanges.cpuAfter}%, Mem: ${resourceChanges.memoryBefore}% -> ${resourceChanges.memoryAfter}%\n`
  );

  return {
    success: true,
    statusCode: 200,
    data: {
      message: "Task scheduled successfully",
      taskId: task.id,
      workerId: selectedWorker.id,
      algorithm: "resource-aware",
      reason: {
        cpuUsage: resourceChanges.cpuBefore,
        memoryUsage: resourceChanges.memoryBefore,
        score: selectedScore,
      },
      schedulingDecision: task.schedulingDecision,
    },
  };
}

module.exports = { scheduleTaskById };
