import type { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems: { page: Page; icon: string; label: string }[] = [
  { page: 'Overview', icon: '⬡', label: 'Overview' },
  { page: 'Tasks',    icon: '⊞', label: 'Tasks' },
  { page: 'Workers',  icon: '⎇', label: 'Workers' },
  { page: 'Activity', icon: '◎', label: 'Activity' },
  { page: 'Settings', icon: '⚙', label: 'Settings' },
];

export default function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  const handleNav = (page: Page) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 45, display: 'none',
          }}
          className="sidebar-backdrop"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⬡</div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">TaskFlow</span>
            <span className="sidebar-logo-sub">Scheduler v1.0</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-label">Main</div>
          {navItems.map(({ page, icon, label }) => (
            <button
              key={page}
              className={`nav-item${currentPage === page ? ' active' : ''}`}
              onClick={() => handleNav(page)}
              type="button"
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* Footer status */}
        <div className="sidebar-footer">
          <div className="sim-badge">
            <div className="sim-dot" />
            <div className="sim-text">
              <span className="sim-label">Simulation Mode</span>
              <span className="sim-sub">Frontend only — no backend</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
