/**
 * taskRoutes.js
 * -------------
 * Defines all task-related API routes.
 * Routes are mounted at /api/tasks in server.js.
 */

const express = require("express");
const router = express.Router();

const {
  getAllTasks,
  createTask,
  getTaskById,
} = require("../controllers/taskController");

// GET /api/tasks       → list all tasks
router.get("/", getAllTasks);

// POST /api/tasks      → create a new task
router.post("/", createTask);

// GET /api/tasks/:id   → get one task by ID
router.get("/:id", getTaskById);

module.exports = router;
