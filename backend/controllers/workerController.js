/**
 * workerController.js
 * -------------------
 * Business logic for worker endpoints.
 */

const workers = require("../data/workerStore");

/**
 * GET /api/workers
 * Returns list of all simulated workers.
 */
const getAllWorkers = (req, res) => {
  res.status(200).json(workers);
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

module.exports = { getAllWorkers, getWorkerById };
