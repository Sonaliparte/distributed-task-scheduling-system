
const { randomUUID } = require('node:crypto');
const tasks = require('../data/taskStore');
const { scheduleTaskById } = require('./schedulerService');

const taskNames = [
  'Data Processing',
  'Report Generation',
  'Backup Job',
  'Log Analysis',
  'Data Validation',
  'Image Processing',
];

const taskTypes = [
  'data-processing',
  'report-generation',
  'file-compression',
  'image-processing',
  'data-processing',
  'log-analysis',
];

const priorities = ['high', 'medium', 'low'];

// Singleton guard — prevents double-start if server.js is require()'d in tests
let generatorStarted = false;

function generateTask() {
  const idx = Math.floor(Math.random() * taskNames.length);

  const task = {
    id: randomUUID(),
    name: taskNames[idx],
    type: taskTypes[idx],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    cpu: 1 + Math.floor(Math.random() * 2),
    memory: 256 + Math.floor(Math.random() * 1024),
    status: 'queued',
    worker: null,
    createdAt: new Date().toISOString(),
    schedulingDecision: null,
  };

  tasks.push(task);

  console.log(
    `[GENERATOR] Created "${task.name}" | type: ${task.type} | priority: ${task.priority} | ID: ${task.id}`
  );

  const result = scheduleTaskById(task.id);
  console.log('[GENERATOR] Scheduling result:', result.success ? 'assigned' : result.data?.message || result.message);

  return task;
}

function startTaskGenerator(intervalMs = 5000) {
  if (generatorStarted) {
    console.log('[GENERATOR] Already running — skipping duplicate start.');
    return null;
  }
  generatorStarted = true;

  console.log('[GENERATOR] Automatic task generation started.');

  // Generate one immediately to populate initial data
  generateTask();

  return setInterval(generateTask, intervalMs);
}

module.exports = { generateTask, startTaskGenerator };
