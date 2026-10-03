import type { Worker } from '../types';

interface WorkerCardProps {
  worker: Worker;
}

function cpuColor(pct: number) {
  if (pct >= 70) return 'progress-red';
  if (pct >= 50) return 'progress-amber';
  return 'progress-green';
}

function statusBadge(status: Worker['status']) {
  switch (status) {
    case 'Online':  return { cls: 'badge-green', dot: 'var(--green)', label: 'Online' };
    case 'Offline': return { cls: 'badge-red',   dot: 'var(--red)',   label: 'Offline' };
    case 'Busy':    return { cls: 'badge-amber',  dot: 'var(--amber)', label: 'Busy' };
  }
}

export default function WorkerCard({ worker }: WorkerCardProps) {
  const badge = statusBadge(worker.status);

  return (
    <div className="worker-card">
      <div className="worker-header">
        <div className="worker-name-row">
          <div className="worker-indicator">🖥</div>
          <div>
            <div className="worker-name">{worker.name}</div>
            <div className="worker-tasks-count">{worker.runningTasks} task{worker.runningTasks !== 1 ? 's' : ''} running</div>
          </div>
        </div>
        <div className={`badge ${badge.cls}`}>
          <div className="badge-dot" style={{ background: badge.dot }} />
          {badge.label}
        </div>
      </div>

      <div className="worker-metrics">
        <div className="metric-row">
          <div className="metric-label-row">
            <span className="metric-label">CPU Usage</span>
            <span className="metric-value">{worker.cpu}%</span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${cpuColor(worker.cpu)}`}
              style={{ width: `${worker.cpu}%` }}
            />
          </div>
        </div>

        <div className="metric-row">
          <div className="metric-label-row">
            <span className="metric-label">Memory</span>
            <span className="metric-value">{worker.memory}%</span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${cpuColor(worker.memory)}`}
              style={{ width: `${worker.memory}%` }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" type="button">View Details →</button>
      </div>
    </div>
  );
}
