/**
 * workerRoutes.js
 * ---------------
 * Routes for worker endpoints. Mounted at /api/workers in server.js.
 */

const express = require("express");
const router = express.Router();
const { getAllWorkers, getWorkerById } = require("../controllers/workerController");

// GET /api/workers       → List all workers
router.get("/", getAllWorkers);

// GET /api/workers/:id   → Get worker by ID
router.get("/:id", getWorkerById);

module.exports = router;
