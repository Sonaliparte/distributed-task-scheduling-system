import type { SchedulingStrategy } from '../types';

interface SchedulingStrategyProps {
  selected: SchedulingStrategy;
  onChange: (s: SchedulingStrategy) => void;
}

const STRATEGIES: { key: SchedulingStrategy; desc: string; badge: string }[] = [
  {
    key: 'Resource-Aware',
    desc: 'Weighted load score: CPU×0.6 + Memory×0.4. Selects the least-loaded worker by resource utilization.',
    badge: 'Resource-Aware',
  },
  {
    key: 'Round Robin',
    desc: 'Distributes tasks sequentially across eligible online workers in a cyclic order.',
    badge: 'Round Robin',
  },
  {
    key: 'Least Loaded',
    desc: 'Assigns each task to the worker with the fewest active tasks. Tie-breaks by resource score.',
    badge: 'Least Loaded',
  },
  {
    key: 'Priority Based',
    desc: 'Processes the highest-priority queued task first (High → Medium → Low), then assigns to the most capable worker.',
    badge: 'Priority Based',
  },
];

export default function SchedulingStrategy({ selected, onChange }: SchedulingStrategyProps) {
  const info = STRATEGIES.find(s => s.key === selected) || STRATEGIES[0];

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
                {s.key}
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
              whiteSpace: 'nowrap',
            }}
          >
            ● Active: {info.badge}
          </span>
        </div>

        <div className="strategy-info">
          <div className="strategy-name">{info.key}</div>
          <div className="strategy-desc">{info.desc}</div>
        </div>

        <div className="strategy-note">
          ℹ️ <strong>Live Backend:</strong> The selected algorithm is applied on{' '}
          <strong style={{ color: 'var(--text-primary)' }}>http://localhost:5000</strong>{' '}
          as of your last selection. All four strategies are implemented and active.
        </div>
      </div>
    </div>
  );
}
