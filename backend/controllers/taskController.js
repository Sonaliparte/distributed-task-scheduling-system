/**
 * taskController.js
 * -----------------
 * Contains the business logic for each task-related route.
 * Controllers are kept separate from routes for clarity and easy extensibility.
 */

const { v4: uuidv4 } = require("uuid");
const tasks = require("../data/taskStore");

// Valid priority levels
const VALID_PRIORITIES = ["low", "medium", "high"];

/**
 * GET /api/tasks
 * Returns all tasks currently stored in memory.
 */
const getAllTasks = (req, res) => {
  res.status(200).json(tasks);
};

/**
 * POST /api/tasks
 * Creates a new task and stores it in memory.
 */
const createTask = (req, res) => {
  const { name, type, priority, cpu, memory } = req.body;

  // --- Validation ---
  // Check all required fields are present
  if (!name || !type || !priority || cpu === undefined || memory === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // cpu and memory must be numbers
  if (typeof cpu !== "number" || typeof memory !== "number") {
    return res.status(400).json({ message: "cpu and memory must be numbers" });
  }

  // priority must be one of the accepted values
  if (!VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({
      message: `priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
    });
  }

  // --- Build the task object ---
  const newTask = {
    id: uuidv4(),          // unique identifier
    name,
    type,
    priority,
    cpu,
    memory,
    status: "queued",      // default status — scheduler will update this later
    worker: null,          // no worker assigned yet
    createdAt: new Date().toISOString(),
  };

  // Store the task in memory
  tasks.push(newTask);

  // Respond with the created task and HTTP 201
  res.status(201).json(newTask);
};

/**
 * GET /api/tasks/:id
 * Returns a single task by its unique ID.
 */
const getTaskById = (req, res) => {
  const { id } = req.params;

  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.status(200).json(task);
};

module.exports = { getAllTasks, createTask, getTaskById };
