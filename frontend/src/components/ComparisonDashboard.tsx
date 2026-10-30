import { useState } from 'react';
import type { Task } from '../types';
import { compareStrategies, type ComparisonResult } from '../services/api';

export default function ComparisonDashboard({ tasks }: { tasks: Task[] }) {
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [mode, setMode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await compareStrategies(tasks.map((task) => ({
        cpu: task.cpuCores,
        memory: task.memoryMB,
        priority: task.priority.toLowerCase(),
      })));
      setResults(data.results);
      setMode(data.metricMode);
    } catch (comparisonError) {
      setError(comparisonError instanceof Error ? comparisonError.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Scheduling comparison</div>
          <div className="section-sub">Same current workload and worker snapshot for every strategy</div>
        </div>
        <button className="btn btn-primary" type="button" onClick={runComparison} disabled={loading || tasks.length === 0}>
          {loading ? 'Measuring...' : 'Run comparison'}
        </button>
      </div>
      {error && <div className="table-empty">{error}</div>}
      {!results.length && !error && <div className="table-empty">Submit at least one task, then run a comparison.</div>}
      {results.length > 0 && (
        <>
          <div className="demo-banner">Mode: {mode}. Scheduling latency is measured locally; waiting, completion, load, and failures are assignment-simulation metrics.</div>
          <div className="table-wrap">
            <table className="task-table">
              <thead><tr><th>Strategy</th><th>Latency</th><th>Avg wait</th><th>Completion</th><th>Failed</th><th>Peak worker load</th></tr></thead>
              <tbody>{results.map((result) => (
                <tr key={result.strategy}>
                  <td>{result.strategy}</td>
                  <td>{result.metrics.schedulingLatencyMs.toFixed(3)} ms</td>
                  <td>{result.metrics.averageWaitingMs.toFixed(0)} ms</td>
                  <td>{result.metrics.completionRate.toFixed(1)}%</td>
                  <td>{result.metrics.failedTaskCount}</td>
                  <td>{Math.max(...result.metrics.workerLoadDistribution.map((worker) => worker.cpuUsage), 0).toFixed(1)}% CPU</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}