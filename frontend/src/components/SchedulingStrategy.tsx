import type { SchedulingStrategy } from '../types';

interface SchedulingStrategyProps {
  selected: SchedulingStrategy;
  onChange: (s: SchedulingStrategy) => void;
}

const STRATEGIES: { key: SchedulingStrategy; desc: string }[] = [
  {
    key: 'Round Robin',
    desc: 'Distributes tasks sequentially across available workers in a circular order.',
  },
  {
    key: 'Least Loaded',
    desc: 'Assigns each new task to the worker with the lowest current CPU and memory workload.',
  },
  {
    key: 'Priority Based',
    desc: 'Processes higher-priority tasks first — High → Medium → Low — regardless of submission order.',
  },
];

export default function SchedulingStrategy({ selected, onChange }: SchedulingStrategyProps) {
  const info = STRATEGIES.find(s => s.key === selected)!;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Scheduling Strategy</div>
          <div className="section-sub">Controls how tasks are distributed to workers</div>
        </div>
      </div>

      <div className="strategy-card">
        <div className="strategy-select-row">
          <select
            className="strategy-select"
            value={selected}
            onChange={e => onChange(e.target.value as SchedulingStrategy)}
            aria-label="Scheduling strategy"
          >
            {STRATEGIES.map(s => (
              <option key={s.key} value={s.key}>{s.key}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Strategy active (UI only)</span>
        </div>

        <div className="strategy-info">
          <div className="strategy-name">{info.key}</div>
          <div className="strategy-desc">{info.desc}</div>
        </div>

        <div className="strategy-note">
          ⚠️ Scheduling logic will be implemented in the backend scheduler. This selection only changes the UI state for now.
        </div>
      </div>
    </div>
  );
}
