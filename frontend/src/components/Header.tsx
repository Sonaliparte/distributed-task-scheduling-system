interface HeaderProps {
  onToggleSidebar: () => void;
  onSubmitTask: () => void;
}

export default function Header({ onToggleSidebar, onSubmitTask }: HeaderProps) {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="hamburger" onClick={onToggleSidebar} type="button" aria-label="Toggle sidebar">
          ☰
        </button>
        <div className="header-left">
          <div className="header-title">Distributed Task Scheduler</div>
          <div className="header-sub">Monitor workloads and worker allocation</div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-search">
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>🔍</span>
          <input type="text" placeholder="Search tasks, workers…" aria-label="Search" />
        </div>

        <button className="icon-btn" type="button" title="Notifications" aria-label="Notifications">
          🔔
          <span className="notif-dot" />
        </button>

        <div className="user-pill">
          <div className="user-avatar">D</div>
          <span className="user-name">Dev User</span>
        </div>

        <button className="btn btn-primary" type="button" onClick={onSubmitTask}>
          + Submit Task
        </button>
      </div>
    </header>
  );
}
