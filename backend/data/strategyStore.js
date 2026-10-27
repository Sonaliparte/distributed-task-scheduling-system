/**
 * strategyStore.js
 * ----------------
 * In-memory store for the currently active scheduling strategy.
 * Shared across all modules so strategy changes are reflected immediately.
 */

const VALID_STRATEGIES = [
  'resource-aware',
  'round-robin',
  'least-loaded',
  'priority-based',
];

let currentStrategy = 'resource-aware';

function getStrategy() {
  return currentStrategy;
}

function setStrategy(strategy) {
  if (!VALID_STRATEGIES.includes(strategy)) {
    throw new Error(`Invalid strategy. Must be one of: ${VALID_STRATEGIES.join(', ')}`);
  }
  currentStrategy = strategy;
  return currentStrategy;
}

module.exports = { getStrategy, setStrategy, VALID_STRATEGIES };
