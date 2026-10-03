import type { LogEntry } from '../types';

interface ActivityLogProps {
  logs: LogEntry[];
}

export default function ActivityLog({ logs }: ActivityLogProps) {
  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Recent Activity</div>
          <div className="section-sub">Simulated event log</div>
        </div>
      </div>

      <div className="activity-list">
        {logs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No activity yet. Submit a task to see events.
          </div>
        ) : (
          logs.map(entry => (
            <div className="activity-item" key={entry.id}>
              <div className="activity-dot" />
              <div className="activity-content">
                <div className="activity-msg">{entry.message}</div>
                <div className="activity-time">{entry.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
