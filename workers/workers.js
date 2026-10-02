const express = require("express");

const app = express();

app.use(express.json());

const workerId = process.argv[2] || "worker-1";
const port = Number(process.argv[3]) || 6001;

const schedulerUrl = "http://localhost:5001";

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
        `${schedulerUrl}/tasks/${task.id}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
        url: `http://localhost:${port}`,
      }),
    });

    console.log(`${workerId} registered with scheduler`);
  } catch (error) {
    console.log(
      `${workerId} could not register with scheduler`
    );
  }
});