/**
 * cppBridge.js
 * ------------
 * Integration layer between Node.js and the compiled C++ scheduler binary.
 *
 * Usage:
 *   const { callCppScheduler } = require('./cppBridge');
 *   const decision = callCppScheduler(strategy, task, workers, queuedTasks);
 *   // decision = { assigned, workerId, strategy, score, reason }
 *
 * If the binary is not found the function returns:
 *   { assigned: false, reason: 'binary_not_found' }
 * so the caller can fall back to the JS implementations without crashing.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

// ─── Resolve binary path ─────────────────────────────────────────────────────

const SCHEDULER_ROOT = path.resolve(__dirname, '..', '..', 'scheduler');

// CMake multi-config build (VS, Ninja multi-config)
const BINARY_CANDIDATES = [
  process.env.SCHEDULER_BINARY,
  path.join(SCHEDULER_ROOT, 'build', 'Release', 'scheduler.exe'),
  path.join(SCHEDULER_ROOT, 'build', 'Release', 'scheduler'),
  path.join(SCHEDULER_ROOT, 'build', 'scheduler.exe'),
  path.join(SCHEDULER_ROOT, 'build', 'scheduler'),
];

function findBinary() {
  for (const p of BINARY_CANDIDATES) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Invokes the compiled C++ scheduler binary with a scheduling request.
 *
 * @param {string}   strategy    - 'round-robin' | 'least-loaded' | 'priority-based' | 'resource-aware'
 * @param {object}   task        - { id, priority, cpu, memory }
 * @param {object[]} workers     - array of worker objects from workerStore
 * @param {object[]} queuedTasks - array of Task objects currently queued
 * @returns {{ assigned: boolean, workerId: string, strategy: string, score: number, reason: string }}
 */
function callCppScheduler(strategy, task, workers, queuedTasks = []) {
  const binary = findBinary();

  if (!binary) {
    console.warn(
      '[CPP-BRIDGE] ⚠️  C++ binary not found. Checked paths:\n' +
      BINARY_CANDIDATES.map((p) => '  ' + p).join('\n') + '\n' +
      '[CPP-BRIDGE] → Falling back to JavaScript scheduler.'
    );
    return { assigned: false, reason: 'binary_not_found' };
  }

  // Build the JSON payload
  const payload = JSON.stringify({
    strategy,
    task: {
      id:       task.id,
      priority: priorityToInt(task.priority),
      cpu:      Number(task.cpu),
      memory:   Number(task.memory),
    },
    workers: workers.map((w) => ({
      id:          w.id,
      online:      w.status === 'online',
      cpuUsage:    w.cpuUsage,
      memoryUsage: w.memoryUsage,
      activeTasks: w.activeTasks,
      totalCpu:    w.totalCpu,
      totalMemory: w.totalMemory,
    })),
    queuedTasks: queuedTasks.map((t) => ({
      id:       t.id,
      priority: priorityToInt(t.priority),
      cpu:      Number(t.cpu),
      memory:   Number(t.memory),
    })),
  });

  console.log(`[CPP-BRIDGE] Invoking: ${binary}`);
  console.log(`[CPP-BRIDGE] Payload: ${payload}`);

  const result = spawnSync(binary, [], {
    input:   payload,
    encoding: 'utf8',
    timeout: 5000,
  });

  // Log stderr (C++ prints its evaluation log there)
  if (result.stderr && result.stderr.trim()) {
    result.stderr.split('\n').filter(Boolean).forEach((line) => {
      console.log(line);  // already prefixed with [C++][SCHEDULER]
    });
  }

  if (result.error) {
    console.error('[CPP-BRIDGE] Spawn error:', result.error.message);
    return { assigned: false, reason: 'spawn_error' };
  }

  if (result.status !== 0) {
    console.error('[CPP-BRIDGE] Binary exited with code', result.status);
    return { assigned: false, reason: 'binary_error' };
  }

  const stdout = result.stdout ? result.stdout.trim() : '';
  if (!stdout) {
    console.error('[CPP-BRIDGE] Empty stdout from binary');
    return { assigned: false, reason: 'empty_output' };
  }

  try {
    const decision = JSON.parse(stdout);
    console.log('[CPP-BRIDGE] Decision:', JSON.stringify(decision));
    return decision;
  } catch (err) {
    console.error('[CPP-BRIDGE] Failed to parse binary output:', stdout, err.message);
    return { assigned: false, reason: 'parse_error' };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converts string priority labels used by the JS store to integers
 * expected by the C++ scheduler header.
 */
function priorityToInt(priority) {
  if (typeof priority === 'number') return priority;
  switch (priority) {
    case 'high':   return 3;
    case 'medium': return 2;
    case 'low':    return 1;
    default:       return 0;
  }
}

module.exports = { callCppScheduler };
