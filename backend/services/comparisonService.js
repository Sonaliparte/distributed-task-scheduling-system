const { performance } = require('node:perf_hooks');
const { calculateResourceScore, hasEnoughResources } = require('../utils/resourceCalculator');
const { VALID_STRATEGIES } = require('../data/strategyStore');

function cloneWorkers(workers) {
  return workers.map((worker) => ({ ...worker }));
}

function choose(strategy, task, workers, cursor) {
  const eligible = workers.filter((worker) => worker.status === 'online' && hasEnoughResources(worker, task.cpu, task.memory));
  if (strategy === 'round-robin') {
    for (let offset = 0; offset < workers.length; offset += 1) {
      const index = (cursor.value + offset) % workers.length;
      if (eligible.includes(workers[index])) {
        cursor.value = (index + 1) % workers.length;
        return workers[index];
      }
    }
    return null;
  }
  if (strategy === 'least-loaded') {
    return eligible.sort((a, b) => a.activeTasks - b.activeTasks || calculateResourceScore(a.cpuUsage, a.memoryUsage) - calculateResourceScore(b.cpuUsage, b.memoryUsage))[0] || null;
  }
  if (strategy === 'priority-based') {
    const priority = { low: 1, medium: 2, high: 3 };
    const top = [...eligible].sort((a, b) => calculateResourceScore(a.cpuUsage, a.memoryUsage) - calculateResourceScore(b.cpuUsage, b.memoryUsage))[0];
    return top || null;
  }
  return eligible.sort((a, b) => calculateResourceScore(a.cpuUsage, a.memoryUsage) - calculateResourceScore(b.cpuUsage, b.memoryUsage))[0] || null;
}

function runComparison(workload, initialWorkers) {
  return VALID_STRATEGIES.map((strategy) => {
    const workers = cloneWorkers(initialWorkers);
    const cursor = { value: 0 };
    const orderedWorkload = strategy === 'priority-based'
      ? [...workload].sort((a, b) => ({ low: 1, medium: 2, high: 3 }[b.priority] || 0) - ({ low: 1, medium: 2, high: 3 }[a.priority] || 0))
      : workload;
    const started = performance.now();
    let assigned = 0;
    let totalWaitingMs = 0;
    let failed = 0;
    for (const task of orderedWorkload) {
      const worker = choose(strategy, task, workers, cursor);
      if (!worker) {
        failed += 1;
        continue;
      }
      assigned += 1;
      totalWaitingMs += worker.activeTasks * (task.durationMs || 3000);
      worker.activeTasks += 1;
      worker.cpuUsage = Math.min(100, worker.cpuUsage + (task.cpu / worker.totalCpu) * 100);
      worker.memoryUsage = Math.min(100, worker.memoryUsage + (task.memory / worker.totalMemory) * 100);
    }
    const elapsedMs = performance.now() - started;
    const loads = workers.map((worker) => ({ workerId: worker.id, cpuUsage: worker.cpuUsage, memoryUsage: worker.memoryUsage, activeTasks: worker.activeTasks }));
    return {
      strategy,
      metrics: {
        schedulingLatencyMs: Number(elapsedMs.toFixed(3)),
        averageWaitingMs: assigned ? Number((totalWaitingMs / assigned).toFixed(2)) : 0,
        completionRate: workload.length ? Number(((assigned / workload.length) * 100).toFixed(2)) : 0,
        failedTaskCount: failed,
        workerLoadDistribution: loads,
      },
    };
  });
}

function compareStrategies(workload, workers) {
  if (!Array.isArray(workload) || workload.length === 0) {
    throw new Error('workload must contain at least one task');
  }
  return {
    metricMode: 'assignment-simulation',
    measuredMetrics: ['schedulingLatencyMs'],
    simulatedMetrics: ['averageWaitingMs', 'completionRate', 'workerLoadDistribution', 'failedTaskCount'],
    workloadSize: workload.length,
    results: runComparison(workload, workers),
  };
}

module.exports = { compareStrategies };