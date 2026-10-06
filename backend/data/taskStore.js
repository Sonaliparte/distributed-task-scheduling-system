/**
 * taskStore.js
 * -----------
 * In-memory storage for tasks.
 * This acts as a simple database substitute for Layer 2.
 * In a later layer, this will be replaced by a real database (e.g., PostgreSQL).
 */

// The in-memory array that holds all task objects
const tasks = [];

module.exports = tasks;
