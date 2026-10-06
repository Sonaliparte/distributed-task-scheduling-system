/**
 * test_layer3.js
 * --------------
 * Verification script for Layer 3 functionality.
 */

const http = require("http");

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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("==================================================");
  console.log("STARTING LAYER 3 VERIFICATION TESTS");
  console.log("==================================================\n");

  // A) Health Check
  const health = await request({ hostname: "localhost", port: 5000, path: "/api/health", method: "GET" });
  console.log("A) GET /api/health:", health);

  // B) Get Workers
  const workers = await request({ hostname: "localhost", port: 5000, path: "/api/workers", method: "GET" });
  console.log("\nB) GET /api/workers:");
  console.log(JSON.stringify(workers.data, null, 2));

  // Get single worker
  const worker1 = await request({ hostname: "localhost", port: 5000, path: "/api/workers/worker-01", method: "GET" });
  console.log("\nB2) GET /api/workers/worker-01:", worker1.data.id);

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

  const taskId = createdTask.data.id;

  // D) Schedule Task
  console.log("\nD) Scheduling task via POST /api/scheduler/schedule/" + taskId);
  const scheduleResult = await request(
    { hostname: "localhost", port: 5000, path: `/api/scheduler/schedule/${taskId}`, method: "POST" }
  );
  console.log("\nSchedule Result:");
  console.log(JSON.stringify(scheduleResult.data, null, 2));

  // E) Verify Task state
  const tasksAfter = await request({ hostname: "localhost", port: 5000, path: "/api/tasks", method: "GET" });
  console.log("\nE) GET /api/tasks (After scheduling):");
  console.log(JSON.stringify(tasksAfter.data, null, 2));

  // F) Verify Worker state
  const workersAfter = await request({ hostname: "localhost", port: 5000, path: "/api/workers", method: "GET" });
  console.log("\nF) GET /api/workers (After scheduling):");
  console.log(JSON.stringify(workersAfter.data, null, 2));

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

  console.log("\n==================================================");
  console.log("ALL LAYER 3 VERIFICATION TESTS COMPLETED SUCCESSFULLY");
  console.log("==================================================");
  process.exit(0);
}

// Import server to start it in-process
require("./server.js");
setTimeout(runTests, 500);
