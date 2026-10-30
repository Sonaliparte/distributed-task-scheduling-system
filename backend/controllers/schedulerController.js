/**
 * schedulerController.js
 * ----------------------
 * Controller for scheduler endpoints.
 */

const { scheduleTaskById } = require('../services/schedulerService');
const { getStrategy, setStrategy, VALID_STRATEGIES } = require('../data/strategyStore');
const workers = require('../data/workerStore');
const { compareStrategies } = require('../services/comparisonService');

/**
 * POST /api/scheduler/schedule/:taskId
 * Schedules a specific queued task onto the best-suited worker.
 */
const scheduleTask = (req, res) => {
  const { taskId } = req.params;

  if (!taskId) {
    return res.status(400).json({ message: 'Task ID is required' });
  }

  const result = scheduleTaskById(taskId);

  if (!result.success && result.statusCode !== 200) {
    return res.status(result.statusCode).json({ message: result.message });
  }

  res.status(result.statusCode).json(result.data);
};

/**
 * GET /api/scheduler/strategy
 * Returns the currently active scheduling strategy.
 */
const getStrategyHandler = (req, res) => {
  res.status(200).json({
    strategy: getStrategy(),
    validStrategies: VALID_STRATEGIES,
  });
};

/**
 * POST /api/scheduler/strategy
 * Updates the active scheduling strategy.
 * Body: { strategy: "round-robin" | "least-loaded" | "resource-aware" | "priority-based" }
 */
const setStrategyHandler = (req, res) => {
  const { strategy } = req.body;

  if (!strategy) {
    return res.status(400).json({ message: 'strategy field is required' });
  }

  try {
    const updated = setStrategy(strategy);
    console.log(`[SCHEDULER] Strategy changed to: ${updated}`);
    res.status(200).json({ strategy: updated, validStrategies: VALID_STRATEGIES });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const compareHandler = (req, res) => {
  try {
    res.status(200).json(compareStrategies(req.body.workload, workers));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { scheduleTask, getStrategyHandler, setStrategyHandler, compareHandler };
