/**
 * workerRoutes.js
 * ---------------
 * Routes for worker endpoints. Mounted at /api/workers in server.js.
 */

const express = require("express");
const router = express.Router();
const {
	getAllWorkers,
	getWorkerById,
	registerWorker,
	heartbeat,
	completeTask,
} = require("../controllers/workerController");

// GET /api/workers       → List all workers
router.get("/", getAllWorkers);
router.post('/register', registerWorker);
router.post('/heartbeat', heartbeat);
router.post('/tasks/:taskId/complete', completeTask);

// GET /api/workers/:id   → Get worker by ID
router.get("/:id", getWorkerById);

module.exports = router;
