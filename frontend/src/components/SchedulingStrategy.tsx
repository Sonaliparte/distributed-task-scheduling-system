import type { SchedulingStrategy } from '../types';

interface SchedulingStrategyProps {
  selected: SchedulingStrategy;
  onChange: (s: SchedulingStrategy) => void;
}

const STRATEGIES: { key: SchedulingStrategy; desc: string; activeInBackend?: boolean }[] = [
  {
    key: 'Resource-Aware',
    desc: 'Backend Algorithm: Evaluates CPU & Memory capacity and calculates score (CPU * 0.6 + Memory * 0.4). Selects the least-loaded worker.',
    activeInBackend: true,
  },
  {
    key: 'Round Robin',
    desc: 'Distributes tasks sequentially across available workers in a circular order (Future Layer).',
  },
  {
    key: 'Least Loaded',
    desc: 'Assigns each new task to the worker with the lowest current CPU and memory workload.',
  },
  {
    key: 'Priority Based',
    desc: 'Processes higher-priority tasks first — High → Medium → Low (Future Layer).',
  },
];

export default function SchedulingStrategy({ selected, onChange }: SchedulingStrategyProps) {
  const currentStrategyKey = selected === 'Resource-Aware' ? 'Resource-Aware' : selected;
  const info = STRATEGIES.find(s => s.key === currentStrategyKey) || STRATEGIES[0];

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
              <option key={s.key} value={s.key}>
                {s.key} {s.activeInBackend ? '(Active Backend Engine)' : '(Future Layer)'}
              </option>
            ))}
          </select>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--green)',
              background: 'rgba(34,197,94,0.12)',
              padding: '4px 10px',
              borderRadius: 12,
            }}
          >
            ● Current Algorithm: Resource-Aware
          </span>
        </div>

        <div className="strategy-info">
          <div className="strategy-name">{info.key}</div>
          <div className="strategy-desc">{info.desc}</div>
        </div>

        <div className="strategy-note">
          ℹ️ <strong>Backend Source of Truth:</strong> Layer 3 engine currently executes the <strong style={{ color: 'var(--text-primary)' }}>Resource-Aware</strong> algorithm on <strong style={{ color: 'var(--text-primary)' }}>http://localhost:5000</strong>.
        </div>
      </div>
    </div>
  );
}
