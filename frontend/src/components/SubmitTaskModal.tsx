import { useState } from 'react';
import type { TaskType, TaskPriority } from '../types';
import type { CreateTaskPayload } from '../services/api';

interface SubmitTaskModalProps {
  onClose: () => void;
  onSubmit: (payload: CreateTaskPayload) => Promise<void>;
  loadingStep?: string | null; // e.g. "Submitting...", "Scheduling..."
}

const TASK_TYPES: { label: string; value: string }[] = [
  { label: 'Image Processing', value: 'image-processing' },
  { label: 'Data Processing', value: 'data-processing' },
  { label: 'File Compression', value: 'file-compression' },
  { label: 'Report Generation', value: 'report-generation' },
  { label: 'Custom Task', value: 'custom-task' },
];

export default function SubmitTaskModal({ onClose, onSubmit, loadingStep }: SubmitTaskModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('image-processing');
  const [priority, setPriority] = useState<TaskPriority>('High');
  const [cores, setCores] = useState(2);
  const [memory, setMemory] = useState(512);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      await onSubmit({
        name: name.trim(),
        type,
        priority: priority.toLowerCase(),
        cpu: cores,
        memory,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Task creation failed');
      setIsSubmitting(false);
    }
  };

  const currentLoadingText = loadingStep || (isSubmitting ? 'Submitting...' : null);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !isSubmitting) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div className="modal-title" id="modal-title">Submit New Task</div>
          <button className="modal-close" onClick={onClose} type="button" disabled={isSubmitting} aria-label="Close modal">✕</button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid var(--red)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--red)',
              marginBottom: 16,
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Task Name */}
        <div className="form-group">
          <label className="form-label" htmlFor="task-name">Task Name</label>
          <input
            id="task-name"
            className="form-input"
            type="text"
            placeholder="e.g. Image Processing Job"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isSubmitting}
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
            onChange={e => setType(e.target.value)}
            disabled={isSubmitting}
          >
            {TASK_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
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
                disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
          ⚡ Submitting will create a task via <strong style={{ color: 'var(--text-secondary)' }}>POST /api/tasks</strong> and automatically trigger the backend scheduler via <strong style={{ color: 'var(--text-secondary)' }}>POST /api/scheduler/schedule/:taskId</strong>.
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            style={{ opacity: name.trim() && !isSubmitting ? 1 : 0.5 }}
          >
            {currentLoadingText || 'Submit Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
