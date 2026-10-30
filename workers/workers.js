const express = require("express");

const app = express();

app.use(express.json());

const workerId = process.env.WORKER_ID || process.argv[2] || "worker-1";
const port = Number(process.env.PORT || process.argv[3]) || 6001;
const advertisedUrl = process.env.WORKER_ADVERTISE_URL || `http://localhost:${port}`;

const schedulerUrl = process.env.SCHEDULER_URL || "http://localhost:5000/api";

let currentTasks = 0;

// -------------------------
// Worker health
// -------------------------

app.get("/health", (req, res) => {
  res.json({
    workerId,
    status: "online",
    runningTasks: currentTasks,
  });
});

// -------------------------
// Execute task
// -------------------------

app.post("/execute", async (req, res) => {
  const task = req.body;

  currentTasks++;

  console.log(
    `[${workerId}] Received Task ${task.id}: ${task.name}`
  );

  res.json({
    message: "Task received",
    workerId,
  });

  // Simulate actual work
  setTimeout(async () => {
    console.log(
      `[${workerId}] Processing Task ${task.id}...`
    );

    // Simulate 3 seconds of processing
    await new Promise((resolve) =>
      setTimeout(resolve, 3000)
    );

    console.log(
      `[${workerId}] Task ${task.id} completed`
    );

    currentTasks--;

    // Tell scheduler that task is completed
    try {
      await fetch(
        `${schedulerUrl}/workers/tasks/${task.id}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ workerId, result: "success" }),
        }
      );
    } catch (error) {
      console.log(
        `[${workerId}] Could not notify scheduler`
      );
    }
  }, 100);
});

// -------------------------
// Send heartbeat
// -------------------------

setInterval(async () => {
  try {
    await fetch(`${schedulerUrl}/workers/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: workerId,
        cpuUsage: 0,
        memoryUsage: 0,
        activeTasks: currentTasks,
      }),
    });
  } catch (error) {
    console.log(
      `[${workerId}] Scheduler unavailable`
    );
  }
}, 3000);

// -------------------------
// Start worker
// -------------------------

app.listen(port, async () => {
  console.log(
    `${workerId} running on http://localhost:${port}`
  );

  // Register worker
  try {
    await fetch(`${schedulerUrl}/workers/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: workerId,
        url: advertisedUrl,
        totalCpu: Number(process.env.WORKER_CPU) || 1,
        totalMemory: Number(process.env.WORKER_MEMORY) || 1024,
      }),
    });

    console.log(`${workerId} registered with scheduler`);
  } catch (error) {
    console.log(
      `${workerId} could not register with scheduler`
    );
  }
});