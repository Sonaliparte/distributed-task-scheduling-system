/**
 * server.js
 * ---------
 * Entry Point — Distributed Task Scheduler Backend
 *
 * Architecture:
 *   React Dashboard → Backend API → Scheduler → Simulated Worker Registry
 */

const express = require('express');
const cors = require('cors');

const taskRoutes = require('./routes/taskRoutes');
const workerRoutes = require('./routes/workerRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const { startTaskGenerator } = require('./services/taskGenerator');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────

// Allow requests from the Vite dev server (port 5173) and any other local origin
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse incoming JSON request bodies
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Simple health check — confirms the server is online.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Backend is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * /api/tasks      → Task creation and retrieval
 * /api/workers    → Simulated worker registry monitoring
 * /api/scheduler  → Task scheduling engine endpoints
 */
app.use('/api/tasks', taskRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/scheduler', schedulerRoutes);

// ── Global Error Handler ─────────────────────────────────────────────────────
// Catches any unhandled errors so the server never crashes on bad requests.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unexpected server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n✅ Backend running on http://localhost:${PORT}`);
  console.log(`   Health    : GET  http://localhost:${PORT}/api/health`);
  console.log(`   Tasks     : GET  http://localhost:${PORT}/api/tasks`);
  console.log(`   Create    : POST http://localhost:${PORT}/api/tasks`);
  console.log(`   Workers   : GET  http://localhost:${PORT}/api/workers`);
  console.log(`   Scheduler : POST http://localhost:${PORT}/api/scheduler/schedule/:taskId`);
  console.log(`   Strategy  : GET/POST http://localhost:${PORT}/api/scheduler/strategy\n`);

  // Start automatic task generation AFTER the server is ready.
  // The singleton guard in taskGenerator prevents duplicate starts.
  startTaskGenerator(5000);
});