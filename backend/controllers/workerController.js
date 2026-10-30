/**
 * workerController.js
 * -------------------
 * Business logic for worker endpoints.
 */

const workers = require("../data/workerStore");
const tasks = require('../data/taskStore');
const { completeExternalTask } = require('../services/taskExecutor');

const normalizeWorker = (worker) => ({
  id: worker.id,
  status: worker.status,
  cpuUsage: worker.cpuUsage,
  memoryUsage: worker.memoryUsage,
  totalCpu: worker.totalCpu,
  totalMemory: worker.totalMemory,
  activeTasks: worker.activeTasks,
  completedTasks: worker.completedTasks || 0,
  failedTasks: worker.failedTasks || 0,
  lastHeartbeat: worker.lastHeartbeat,
  url: worker.url,
});

/**
 * GET /api/workers
 * Returns list of all simulated workers.
 */
const getAllWorkers = (req, res) => {
  res.status(200).json(workers.map(normalizeWorker));
};

/**
 * GET /api/workers/:id
 * Returns a single worker by ID.
 */
const getWorkerById = (req, res) => {
  const { id } = req.params;

  const worker = workers.find((w) => w.id === id);

  if (!worker) {
    return res.status(404).json({ message: "Worker not found" });
  }

  res.status(200).json(worker);
};

const registerWorker = (req, res) => {
  const { id, url, totalCpu, totalMemory } = req.body;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Worker id is required' });
  }

  let worker = workers.find((candidate) => candidate.id === id);
  if (!worker) {
    worker = {
      id,
      status: 'online',
      cpuUsage: 0,
      memoryUsage: 0,
      totalCpu: Number(totalCpu) > 0 ? Number(totalCpu) : 1,
      totalMemory: Number(totalMemory) > 0 ? Number(totalMemory) : 1024,
      activeTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      url: null,
      lastHeartbeat: null,
      registeredAt: new Date().toISOString(),
    };
    workers.push(worker);
  }

  worker.status = 'online';
  worker.url = typeof url === 'string' ? url.replace(/\/$/, '') : worker.url;
  worker.lastHeartbeat = new Date().toISOString();
  res.status(200).json(normalizeWorker(worker));
};

const heartbeat = (req, res) => {
  const worker = workers.find((candidate) => candidate.id === req.body.id);
  if (!worker) return res.status(404).json({ message: 'Worker not registered' });
  worker.status = 'online';
  worker.lastHeartbeat = new Date().toISOString();
  if (typeof req.body.cpuUsage === 'number') worker.cpuUsage = Math.max(0, Math.min(100, req.body.cpuUsage));
  if (typeof req.body.memoryUsage === 'number') worker.memoryUsage = Math.max(0, Math.min(100, req.body.memoryUsage));
  if (typeof req.body.activeTasks === 'number') worker.activeTasks = Math.max(0, req.body.activeTasks);
  res.status(200).json({ status: 'ok', worker: normalizeWorker(worker) });
};

const completeTask = (req, res) => {
  const { taskId } = req.params;
  const worker = workers.find((candidate) => candidate.id === req.body.workerId);
  const task = tasks.find((candidate) => candidate.id === taskId);
  if (!worker || !task) return res.status(404).json({ message: 'Worker or task not found' });
  completeExternalTask(task, worker, req.body.result || 'success');
  require('../services/schedulerService').retryQueuedTasks();
  res.status(200).json(task);
};

module.exports = {
  getAllWorkers,
  getWorkerById,
  registerWorker,
  heartbeat,
  completeTask,
};
