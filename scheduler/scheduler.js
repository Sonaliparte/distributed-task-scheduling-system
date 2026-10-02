const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 5001;

// -------------------------
// Store workers
// -------------------------

const workers = {};

// -------------------------
// Store tasks
// -------------------------

const tasks = [];

let taskCounter = 1;

// -------------------------
// Worker registration
// -------------------------

app.post("/workers/register", (req, res) => {
  const { id, url } = req.body;

  workers[id] = {
    id,
    url,
    status: "online",
    runningTasks: 0,
    lastHeartbeat: Date.now(),
  };

  console.log(`Worker registered: ${id}`);

  res.json({
    message: "Worker registered",
    worker: workers[id],
  });
});

// -------------------------
// Worker heartbeat
// -------------------------

app.post("/workers/heartbeat", (req, res) => {
  const { id } = req.body;

  if (workers[id]) {
    workers[id].lastHeartbeat = Date.now();
    workers[id].status = "online";
  }

  res.json({
    message: "Heartbeat received",
  });
});

// -------------------------
// Get workers
// -------------------------

app.get("/workers", (req, res) => {
  res.json(Object.values(workers));
});

// -------------------------
// Submit task
// -------------------------

app.post("/tasks", async (req, res) => {
  const { name, priority } = req.body;

  const task = {
    id: taskCounter++,
    name,
    priority: priority || "Medium",
    status: "queued",
    workerId: null,
    createdAt: new Date().toISOString(),
  };

  tasks.push(task);

  console.log(`New task received: ${task.id}`);

  await scheduleTask(task);

  res.json(task);
});

// -------------------------
// Schedule task
// -------------------------

async function scheduleTask(task) {
  const availableWorkers = Object.values(workers).filter(
    (worker) => worker.status === "online"
  );

  if (availableWorkers.length === 0) {
    console.log("No workers available");

    task.status = "queued";

    return;
  }

  // Least Loaded scheduling
  availableWorkers.sort(
    (a, b) => a.runningTasks - b.runningTasks
  );

  const selectedWorker = availableWorkers[0];

  task.workerId = selectedWorker.id;
  task.status = "running";

  selectedWorker.runningTasks++;

  console.log(
    `Task ${task.id} assigned to ${selectedWorker.id}`
  );

  try {
    await fetch(`${selectedWorker.url}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });
  } catch (error) {
    console.log(
      `Worker ${selectedWorker.id} could not execute task`
    );

    selectedWorker.runningTasks--;

    task.status = "failed";
  }
}

// -------------------------
// Task completed
// -------------------------

app.post("/tasks/:id/complete", (req, res) => {
  const taskId = Number(req.params.id);

  const task = tasks.find((task) => task.id === taskId);

  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  task.status = "completed";

  const worker = workers[task.workerId];

  if (worker && worker.runningTasks > 0) {
    worker.runningTasks--;
  }

  console.log(`Task ${task.id} completed`);

  res.json({
    message: "Task completed",
    task,
  });
});

// -------------------------
// Get tasks
// -------------------------

app.get("/tasks", (req, res) => {
  res.json(tasks);
});

// -------------------------
// Start scheduler
// -------------------------

app.listen(PORT, () => {
  console.log(`Scheduler running on http://localhost:${PORT}`);
});