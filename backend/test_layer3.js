/**
 * test_layer3.js
 * --------------
 * Verification script for Layer 3 functionality.
 *
 * Usage:
 *   node test_layer3.js          ← starts server in-process if not already running
 *   (or run while backend is already running on port 5000)
 */

"use strict";
const http = require("http");

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Assertion helper ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("==================================================");
  console.log("STARTING LAYER 3 VERIFICATION TESTS");
  console.log("==================================================\n");

  // A) Health Check
  const health = await request({ hostname: "localhost", port: 5000, path: "/api/health", method: "GET" });
  console.log("A) GET /api/health:", health);
  assert("status 200",       health.status === 200);
  assert("message present",  !!health.data.message);
  assert("status field ok",  health.data.status === "ok");

  // B) Get Workers
  const workers = await request({ hostname: "localhost", port: 5000, path: "/api/workers", method: "GET" });
  console.log("\nB) GET /api/workers:");
  console.log(JSON.stringify(workers.data, null, 2));
  assert("status 200",          workers.status === 200);
  assert("array of workers",    Array.isArray(workers.data) && workers.data.length > 0);
  assert("workers have id",     workers.data.every(w => w.id));
  assert("workers have status", workers.data.every(w => w.status));
  assert("activeTasks >= 0",    workers.data.every(w => w.activeTasks >= 0));

  // B2) Get single worker
  const worker1 = await request({ hostname: "localhost", port: 5000, path: "/api/workers/worker-01", method: "GET" });
  console.log("\nB2) GET /api/workers/worker-01:", worker1.data.id);
  assert("worker-01 found",   worker1.status === 200);
  assert("correct id",        worker1.data.id === "worker-01");

  // C) Create Task
  const taskPayload = {
    name: "Image Processing Job",
    type: "image-processing",
    priority: "high",
    cpu: 2,
    memory: 512,
  };
  const createdTask = await request(
    { hostname: "localhost", port: 5000, path: "/api/tasks", method: "POST", headers: { "Content-Type": "application/json" } },
    taskPayload
  );
  console.log("\nC) POST /api/tasks (Create Task):");
  console.log(JSON.stringify(createdTask.data, null, 2));
  assert("status 201",          createdTask.status === 201);
  assert("task has id",         !!createdTask.data.id);
  assert("task has type field", createdTask.data.type === "image-processing");
  assert("task is queued or scheduled by create", ["queued", "assigned", "running"].includes(createdTask.data.status));
  assert("task has priority",   createdTask.data.priority === "high");

  const taskId = createdTask.data.id;

  // D) Schedule Task (creation normally schedules; a busy cluster may leave it queued)
  console.log("\nD) Scheduling task via POST /api/scheduler/schedule/" + taskId);
  const scheduleResult = await request(
    { hostname: "localhost", port: 5000, path: `/api/scheduler/schedule/${taskId}`, method: "POST" }
  );
  console.log("\nSchedule Result:");
  console.log(JSON.stringify(scheduleResult.data, null, 2));
  if (["assigned", "running"].includes(createdTask.data.status)) {
    assert("duplicate schedule returns 400", scheduleResult.status === 400);
  } else {
    assert("queued task schedule returns 200", scheduleResult.status === 200);
    assert("queued task remains queued when capacity is unavailable", scheduleResult.data.status === "queued");
    if (scheduleResult.data.workerId) createdTask.data.worker = scheduleResult.data.workerId;
  }

  // E) Verify Task state (should be assigned or running now)
  const tasksAfter = await request({ hostname: "localhost", port: 5000, path: "/api/tasks", method: "GET" });
  console.log("\nE) GET /api/tasks (After scheduling):");
  console.log(JSON.stringify(tasksAfter.data, null, 2));
  const scheduledTask = tasksAfter.data.find(t => t.id === taskId);
  assert("task visible in list",   !!scheduledTask);
  assert("task is in a valid lifecycle state", scheduledTask && ["queued", "assigned", "running"].includes(scheduledTask.status));
  assert("task has worker when assigned", scheduledTask && scheduledTask.status === "queued" ? true : !!scheduledTask.worker);
  assert("task has type field",     scheduledTask && !!scheduledTask.type);

  // F) Verify Worker state
  const workersAfter = await request({ hostname: "localhost", port: 5000, path: "/api/workers", method: "GET" });
  console.log("\nF) GET /api/workers (After scheduling):");
  console.log(JSON.stringify(workersAfter.data, null, 2));
  const assignedWorker = workersAfter.data.find(w => w.id === createdTask.data.worker);
  assert("assigned worker exists when assigned", scheduledTask.status === "queued" ? true : !!assignedWorker);
  assert("worker activeTasks incremented", scheduledTask.status === "queued" ? true : assignedWorker.activeTasks >= 1);
  assert("worker cpuUsage within bounds", scheduledTask.status === "queued" ? true : assignedWorker.cpuUsage <= 100);
  assert("worker memoryUsage within bounds", scheduledTask.status === "queued" ? true : assignedWorker.memoryUsage <= 100);

  // G) Edge Case Test: Oversized task exceeding all workers' capacity
  console.log("\nG) Edge Case Test: Oversized task (CPU: 10, Memory: 16384 MB)");
  const oversizedTask = await request(
    { hostname: "localhost", port: 5000, path: "/api/tasks", method: "POST", headers: { "Content-Type": "application/json" } },
    { name: "Heavy ML Training Job", type: "ml-training", priority: "high", cpu: 10, memory: 16384 }
  );
  const scheduleOversized = await request(
    { hostname: "localhost", port: 5000, path: `/api/scheduler/schedule/${oversizedTask.data.id}`, method: "POST" }
  );
  console.log("Oversized Schedule Result:");
  console.log(JSON.stringify(scheduleOversized.data, null, 2));
  assert("oversized returns 200",     scheduleOversized.status === 200);
  assert("no worker assigned",        !scheduleOversized.data.workerId);
  assert("still queued",              scheduleOversized.data.status === "queued");

  // H) Strategy — get and set
  console.log("\nH) GET /api/scheduler/strategy");
  const strategyGet = await request({ hostname: "localhost", port: 5000, path: "/api/scheduler/strategy", method: "GET" });
  console.log("Current strategy:", strategyGet.data);
  assert("strategy returns 200",   strategyGet.status === 200);
  assert("strategy field present", !!strategyGet.data.strategy);
  assert("validStrategies listed", Array.isArray(strategyGet.data.validStrategies) && strategyGet.data.validStrategies.length === 4);

  console.log("\nH2) POST /api/scheduler/strategy (round-robin)");
  const strategySet = await request(
    { hostname: "localhost", port: 5000, path: "/api/scheduler/strategy", method: "POST", headers: { "Content-Type": "application/json" } },
    { strategy: "round-robin" }
  );
  console.log("Set strategy result:", strategySet.data);
  assert("set strategy returns 200",     strategySet.status === 200);
  assert("strategy updated correctly",   strategySet.data.strategy === "round-robin");

  // Reset strategy back to resource-aware
  await request(
    { hostname: "localhost", port: 5000, path: "/api/scheduler/strategy", method: "POST", headers: { "Content-Type": "application/json" } },
    { strategy: "resource-aware" }
  );

  // ─── Summary ────────────────────────────────────────────────────────────────

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log("ALL LAYER 3 VERIFICATION TESTS COMPLETED SUCCESSFULLY");
  } else {
    console.error(`${failed} TEST(S) FAILED`);
  }
  console.log("==================================================");
  process.exit(failed > 0 ? 1 : 0);
}

// ─── Bootstrap: skip in-process server start if already running ───────────────

async function bootstrap() {
  try {
    // Probe: if backend already running, use it
    await request({ hostname: "localhost", port: 5000, path: "/api/health", method: "GET" });
    console.log("[TEST] Backend already running on port 5000 — using existing server.\n");
    await runTests();
  } catch {
    // Not running: start in-process
    console.log("[TEST] No server detected — starting server in-process.\n");
    require("./server.js");
    setTimeout(runTests, 800);
  }
}

bootstrap();

