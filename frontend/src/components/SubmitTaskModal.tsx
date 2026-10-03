import { useState } from 'react';
import type { Task, TaskType, TaskPriority } from '../types';

interface SubmitTaskModalProps {
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'createdAt' | 'status' | 'worker'>) => void;
}

const TASK_TYPES: TaskType[] = [
  'Image Processing',
  'Data Processing',
  'File Compression',
  'Report Generation',
  'Custom Task',
];

export default function SubmitTaskModal({ onClose, onSubmit }: SubmitTaskModalProps) {
  const [name,     setName]     = useState('');
  const [type,     setType]     = useState<TaskType>('Image Processing');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [cores,    setCores]    = useState(1);
  const [memory,   setMemory]   = useState(256);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), type, priority, cpuCores: cores, memoryMB: memory });
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div className="modal-title" id="modal-title">Submit New Task</div>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Close modal">✕</button>
        </div>

        {/* Task Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="task-name">Task Name</label>
          <input
            id="task-name"
            className="form-input"
            type="text"
            placeholder="e.g. Process weekly report"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>

        {/* Task Type */}
        <div className="form-group">
          <label className="form-label" htmlFor="task-type">Task Type</label>
          <select
            id="task-type"
            className="form-select"
            value={type}
            onChange={e => setType(e.target.value as TaskType)}
          >
            {TASK_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="form-group">
          <span className="form-label">Priority</span>
          <div className="priority-toggle">
            {(['Low', 'Medium', 'High'] as TaskPriority[]).map(p => (
              <button
                key={p}
                type="button"
                className={`priority-btn${priority === p ? ` active-${p.toLowerCase()}` : ''}`}
                onClick={() => setPriority(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* CPU */}
        <div className="form-group">
          <span className="form-label">CPU Requirement</span>
          <div className="number-input">
            <input
              type="number"
              min={1}
              max={16}
              value={cores}
              onChange={e => setCores(Number(e.target.value))}
              aria-label="CPU cores"
            />
            <span>cores</span>
          </div>
        </div>

        {/* Memory */}
        <div className="form-group">
          <span className="form-label">Memory Requirement</span>
          <div className="number-input">
            <input
              type="number"
              min={64}
              max={8192}
              step={64}
              value={memory}
              onChange={e => setMemory(Number(e.target.value))}
              aria-label="Memory in MB"
            />
            <span>MB</span>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--text-muted)',
            marginBottom: 4,
          }}
        >
          ℹ️ This task will be added to the queue with <strong style={{ color: 'var(--text-secondary)' }}>Queued</strong> status. 
          No backend API is called — simulation only.
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim()}
            style={{ opacity: name.trim() ? 1 : 0.5 }}
          >
            Submit Task
          </button>
        </div>
      </div>
    </div>
  );
}
