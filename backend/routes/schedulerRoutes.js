/**
 * schedulerRoutes.js
 * ------------------
 * Routes for scheduler endpoints. Mounted at /api/scheduler in server.js.
 */

const express = require("express");
const router = express.Router();
const { scheduleTask } = require("../controllers/schedulerController");

// POST /api/scheduler/schedule/:taskId  → Schedule a task
router.post("/schedule/:taskId", scheduleTask);

module.exports = router;
