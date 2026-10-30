/**
 * schedulerRoutes.js
 * ------------------
 * Routes for scheduler endpoints. Mounted at /api/scheduler in server.js.
 */

const express = require('express');
const router = express.Router();
const {
  scheduleTask,
  getStrategyHandler,
  setStrategyHandler,
  compareHandler,
} = require('../controllers/schedulerController');

// POST /api/scheduler/schedule/:taskId  → Schedule a task
router.post('/schedule/:taskId', scheduleTask);

// GET  /api/scheduler/strategy          → Get current strategy
router.get('/strategy', getStrategyHandler);

// POST /api/scheduler/strategy          → Set current strategy
router.post('/strategy', setStrategyHandler);
router.post('/compare', compareHandler);

module.exports = router;
