/**
 * server.js
 * ---------
 * Layer 2 Entry Point — Task Management Backend
 *
 * This is the main Express server for the Distributed Task Scheduler.
 * Layer 2 introduces in-memory task storage and a clean REST API.
 *
 * Architecture:
 *   React Dashboard → Backend API (this file) → In-Memory Store
 *
 * Future layers will add:
 *   Backend → Scheduler → Worker Nodes → Task Execution
 */

const express = require("express");
const cors = require("cors");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────

// Allow requests from the Vite frontend running on a different port
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Simple health check — confirms the server is online.
 */
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Backend is running" });
});

/**
 * /api/tasks  →  All task CRUD operations
 * See routes/taskRoutes.js for individual endpoints.
 */
app.use("/api/tasks", taskRoutes);

// ── Global Error Handler ─────────────────────────────────────────────────────
// Catches any unhandled errors so the server never crashes on bad requests.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unexpected server error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`   Health : GET  http://localhost:${PORT}/api/health`);
  console.log(`   Tasks  : GET  http://localhost:${PORT}/api/tasks`);
  console.log(`   Create : POST http://localhost:${PORT}/api/tasks`);
});