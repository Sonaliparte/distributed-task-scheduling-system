import { useState } from 'react';
import type { Task, TaskStatus } from '../types';

interface TaskTableProps {
  tasks: Task[];
  onCancelTask: (id: number) => void;
}

const FILTERS: { label: string; value: TaskStatus | 'All' }[] = [
  { label: 'All',       value: 'All' },
  { label: 'Running',   value: 'Running' },
  { label: 'Queued',    value: 'Queued' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Failed',    value: 'Failed' },
];

function statusBadge(status: TaskStatus) {
  switch (status) {
    case 'Running':   return 'badge-blue';
    case 'Completed': return 'badge-green';
    case 'Queued':    return 'badge-amber';
    case 'Failed':    return 'badge-red';
  }
}

function priorityClass(priority: Task['priority']) {
  switch (priority) {
    case 'High':   return 'priority-high';
    case 'Medium': return 'priority-medium';
    case 'Low':    return 'priority-low';
  }
}

function priorityDot(priority: Task['priority']) {
  switch (priority) {
    case 'High':   return '●';
    case 'Medium': return '◉';
    case 'Low':    return '○';
  }
}

export default function TaskTable({ tasks, onCancelTask }: TaskTableProps) {
  const [filter, setFilter] = useState<TaskStatus | 'All'>('All');

  const visible = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Task Queue</div>
          <div className="section-sub">{tasks.length} total tasks</div>
        </div>

        <div className="filters">
          {FILTERS.map(f => (
            <button
              key={f.value}
              className={`filter-btn${filter === f.value ? ' active' : ''}`}
              onClick={() => setFilter(f.value)}
              type="button"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table className="task-table">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Task Name</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Worker</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-empty">
                  No tasks match the selected filter.
                </td>
              </tr>
            ) : (
              visible.map(task => (
                <tr key={task.id}>
                  <td><span className="task-id">#{task.id}</span></td>
                  <td>
                    <div className="task-name-cell">{task.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{task.type}</div>
                  </td>
                  <td>
                    <span className={`priority-dot ${priorityClass(task.priority)}`}>
                      {priorityDot(task.priority)} {task.priority}
                    </span>
                  </td>
                  <td>
                    <div className={`badge ${statusBadge(task.status)}`}>
                      {task.status}
                    </div>
                  </td>
                  <td>
                    <span className={`worker-chip${task.worker ? ' assigned' : ''}`}>
                      {task.worker ?? '— Not Assigned'}
                    </span>
                  </td>
                  <td><span className="time-cell">{task.createdAt}</span></td>
                  <td>
                    {task.status === 'Queued' && (
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: 11, padding: '4px 10px' }}
                        onClick={() => onCancelTask(task.id)}
                        type="button"
                      >
                        Cancel
                      </button>
                    )}
                    {task.status === 'Running' && (
                      <span style={{ fontSize: 11, color: 'var(--blue)' }}>⟳ Running</span>
                    )}
                    {task.status === 'Completed' && (
                      <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ Done</span>
                    )}
                    {task.status === 'Failed' && (
                      <span style={{ fontSize: 11, color: 'var(--red)' }}>✗ Failed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
