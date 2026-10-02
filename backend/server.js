const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const SCHEDULER_URL = "http://localhost:5001";

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running",
  });
});

// Submit a new task
app.post("/tasks", async (req, res) => {
  try {
    const { name, priority } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Task name is required",
      });
    }

    const response = await fetch(`${SCHEDULER_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        priority: priority || "Medium",
      }),
    });

    const data = await response.json();

    res.status(response.status).json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Could not connect to scheduler",
    });
  }
});

// Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    const response = await fetch(`${SCHEDULER_URL}/tasks`);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch tasks",
    });
  }
});

// Get workers
app.get("/workers", async (req, res) => {
  try {
    const response = await fetch(`${SCHEDULER_URL}/workers`);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch workers",
    });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});