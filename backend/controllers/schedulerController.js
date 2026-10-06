/**
 * schedulerController.js
 * ----------------------
 * Controller for scheduler endpoints.
 */

const { scheduleTaskById } = require("../services/schedulerService");

/**
 * POST /api/scheduler/schedule/:taskId
 * Schedules a specific queued task onto the best suited worker.
 */
const scheduleTask = (req, res) => {
  const { taskId } = req.params;

  if (!taskId) {
    return res.status(400).json({ message: "Task ID is required" });
  }

  const result = scheduleTaskById(taskId);

  if (!result.success && result.statusCode !== 200) {
    return res.status(result.statusCode).json({ message: result.message });
  }

  res.status(result.statusCode).json(result.data);
};

module.exports = { scheduleTask };
