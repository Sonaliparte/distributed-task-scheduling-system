import { useState, useCallback } from 'react';
import './index.css';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatCard from './components/StatCard';
import WorkerCard from './components/WorkerCard';
import TaskTable from './components/TaskTable';
import SubmitTaskModal from './components/SubmitTaskModal';
import ActivityLog from './components/ActivityLog';
import SchedulingStrategy from './components/SchedulingStrategy';

import { initialTasks, initialWorkers, initialLogs } from './data/mockData';
import type { Task, Worker, LogEntry, Page, SchedulingStrategy as StrategyType } from './types';

// ─── Toast ───────────────────────────────────────────────────────────────────

interface Toast { id: number; title: string; message: string }

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentPage, setCurrentPage]   = useState<Page>('Overview');
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [showModal,   setShowModal]     = useState(false);

  const [tasks,   setTasks]   = useState<Task[]>(initialTasks);
  const [workers]             = useState<Worker[]>(initialWorkers);
  const [logs,    setLogs]    = useState<LogEntry[]>(initialLogs);
  const [strategy, setStrategy] = useState<StrategyType>('Round Robin');
  const [toasts,  setToasts]  = useState<Toast[]>([]);
  const [nextTaskId, setNextTaskId] = useState(1005);
  const [nextLogId,  setNextLogId]  = useState(initialLogs.length + 1);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const addToast = useCallback((title: string, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [
      { id: nextLogId, message, time: 'Just now' },
      ...prev,
    ]);
    setNextLogId(id => id + 1);
  }, [nextLogId]);

  // ─── Submit Task ─────────────────────────────────────────────────────────────

  const handleSubmitTask = useCallback((partial: Omit<Task, 'id' | 'createdAt' | 'status' | 'worker'>) => {
    const newTask: Task = {
      ...partial,
      id: nextTaskId,
      status: 'Queued',
      worker: null,
      createdAt: 'Just now',
    };
    setTasks(prev => [newTask, ...prev]);
    setNextTaskId(id => id + 1);
    addLog(`Task #${nextTaskId} "${partial.name}" added to queue`);
    setShowModal(false);
    addToast('Task Submitted', `#${nextTaskId} "${partial.name}" added as Queued.`);
  }, [nextTaskId, addLog, addToast]);

  // ─── Cancel Task ─────────────────────────────────────────────────────────────

  const handleCancelTask = useCallback((id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'Failed' } : t));
    addLog(`Task #${id} cancelled`);
    addToast('Task Cancelled', `Task #${id} has been cancelled.`);
  }, [addLog, addToast]);

  // ─── Simulate Execution ──────────────────────────────────────────────────────

  const handleSimulate = useCallback(() => {
    const queued = tasks.find(t => t.status === 'Queued');
    if (!queued) {
      addToast('No Queued Tasks', 'Submit a task first to simulate execution.');
      return;
    }
    // Move Queued → Running
    setTasks(prev => prev.map(t =>
      t.id === queued.id
        ? { ...t, status: 'Running', worker: `Worker-0${(queued.id % 3) + 1}` }
        : t
    ));
    addLog(`Task #${queued.id} started on Worker-0${(queued.id % 3) + 1}`);

    // After 2.5s, move Running → Completed
    setTimeout(() => {
      setTasks(prev => prev.map(t =>
        t.id === queued.id ? { ...t, status: 'Completed' } : t
      ));
      addLog(`Task #${queued.id} completed successfully`);
      addToast('Task Completed', `#${queued.id} "${queued.name}" finished.`);
    }, 2500);
  }, [tasks, addLog, addToast]);

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const totalTasks   = tasks.length;
  const running      = tasks.filter(t => t.status === 'Running').length;
  const completed    = tasks.filter(t => t.status === 'Completed').length;
  const queued       = tasks.filter(t => t.status === 'Queued').length;
  const workersOnline = workers.filter(w => w.status !== 'Offline').length;

  // ─── Render ──────────────────────────────────────────────────────────────────

  const renderPage = () => {
    switch (currentPage) {
      case 'Overview': return <OverviewPage
        tasks={tasks}
        totalTasks={totalTasks} running={running} completed={completed} queued={queued}
        workersOnline={workersOnline} totalWorkers={workers.length}
        workers={workers}
        onCancelTask={handleCancelTask}
        logs={logs}
        strategy={strategy} onStrategyChange={setStrategy}
        onSimulate={handleSimulate}
      />;
      case 'Tasks': return <TasksPage tasks={tasks} onCancelTask={handleCancelTask} />;
      case 'Workers': return <WorkersPage workers={workers} />;
      case 'Activity': return <ActivityPage logs={logs} />;
      case 'Settings': return <SettingsPage strategy={strategy} onStrategyChange={setStrategy} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-area">
        <Header
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          onSubmitTask={() => setShowModal(true)}
        />

        <div className="page-content">
          {renderPage()}
        </div>
      </div>

      {showModal && (
        <SubmitTaskModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitTask}
        />
      )}

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div className="toast" key={t.id}>
            <span className="toast-icon">✓</span>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-msg">{t.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

interface OverviewPageProps {
  tasks: Task[];
  totalTasks: number; running: number; completed: number; queued: number;
  workersOnline: number; totalWorkers: number;
  workers: Worker[];
  onCancelTask: (id: number) => void;
  logs: LogEntry[];
  strategy: StrategyType; onStrategyChange: (s: StrategyType) => void;
  onSimulate: () => void;
}

function OverviewPage(props: OverviewPageProps) {
  const {
    tasks, totalTasks, running, completed, queued,
    workersOnline, totalWorkers, workers, onCancelTask,
    logs, strategy, onStrategyChange, onSimulate,
  } = props;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-desc">Real-time view of simulated task distribution and worker status</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={onSimulate}>
          ▶ Simulate Task Execution
        </button>
      </div>

      <div className="demo-banner">
        <span>⚠ SIMULATION MODE</span>
        — All data is mock frontend state. No backend is connected.
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard label="Total Tasks"    value={totalTasks}
          icon="⊞" iconBg="rgba(91,124,246,0.12)" iconColor="var(--accent)"
          sub="All submitted tasks"
        />
        <StatCard label="Running"        value={running}
          icon="⟳" iconBg="rgba(56,189,248,0.12)" iconColor="var(--blue)"
          sub="Currently executing"
        />
        <StatCard label="Completed"      value={completed}
          icon="✓" iconBg="rgba(34,197,94,0.12)" iconColor="var(--green)"
          sub="Successfully finished"
        />
        <StatCard label="Queued"         value={queued}
          icon="⏸" iconBg="rgba(245,158,11,0.12)" iconColor="var(--amber)"
          sub="Awaiting assignment"
        />
        <StatCard label="Workers Online" value={`${workersOnline} / ${totalWorkers}`}
          icon="🖥" iconBg="rgba(34,197,94,0.12)" iconColor="var(--green)"
          sub="Active worker nodes"
        />
      </div>

      {/* Workers */}
      <div className="section">
        <div className="section-header">
          <div>
            <div className="section-title">Worker Nodes</div>
            <div className="section-sub">{workersOnline} of {totalWorkers} nodes online</div>
          </div>
        </div>
        <div className="worker-grid">
          {workers.map(w => <WorkerCard key={w.id} worker={w} />)}
        </div>
      </div>

      {/* Tasks */}
      <TaskTable tasks={tasks} onCancelTask={onCancelTask} />

      {/* Bottom row: Scheduling + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <SchedulingStrategy selected={strategy} onChange={onStrategyChange} />
        <ActivityLog logs={logs} />
      </div>
    </>
  );
}

// ─── Tasks Page ──────────────────────────────────────────────────────────────

function TasksPage({ tasks, onCancelTask }: { tasks: Task[]; onCancelTask: (id: number) => void }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-desc">Manage and monitor all submitted tasks</p>
        </div>
      </div>
      <div className="demo-banner">
        <span>⚠ SIMULATION MODE</span>
        — Tasks are stored in React state only.
      </div>
      <TaskTable tasks={tasks} onCancelTask={onCancelTask} />
    </>
  );
}

// ─── Workers Page ─────────────────────────────────────────────────────────────

function WorkersPage({ workers }: { workers: Worker[] }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="page-desc">Simulated distributed worker node metrics</p>
        </div>
      </div>
      <div className="demo-banner">
        <span>⚠ SIMULATION MODE</span>
        — Worker data is static mock data. Real workers will connect via backend.
      </div>
      <div className="section">
        <div className="worker-grid">
          {workers.map(w => <WorkerCard key={w.id} worker={w} />)}
        </div>
      </div>
    </>
  );
}

// ─── Activity Page ────────────────────────────────────────────────────────────

function ActivityPage({ logs }: { logs: LogEntry[] }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-desc">Frontend event log for simulated scheduler actions</p>
        </div>
      </div>
      <div className="demo-banner">
        <span>⚠ SIMULATION MODE</span>
        — Events are generated by frontend state changes only.
      </div>
      <ActivityLog logs={logs} />
    </>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

function SettingsPage({ strategy, onStrategyChange }: {
  strategy: StrategyType;
  onStrategyChange: (s: StrategyType) => void;
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">Configure the scheduler behavior</p>
        </div>
      </div>

      <div className="settings-section">
        <h3>Application</h3>
        <div className="settings-row">
          <strong>App Mode</strong>
          <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Frontend Simulation</span>
        </div>
        <div className="settings-row">
          <strong>Backend</strong>
          <span>Not connected (Phase 2)</span>
        </div>
        <div className="settings-row">
          <strong>Worker Communication</strong>
          <span>Not connected (Phase 3)</span>
        </div>
        <div className="settings-row">
          <strong>Database</strong>
          <span>Not configured (Phase 2)</span>
        </div>
      </div>

      <div className="settings-section">
        <h3>Scheduling</h3>
        <SchedulingStrategy selected={strategy} onChange={onStrategyChange} />
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <div className="settings-row">
          <strong>Project</strong>
          <span>TaskFlow – Distributed Task Scheduler</span>
        </div>
        <div className="settings-row">
          <strong>Phase</strong>
          <span>Phase 1 — Frontend UI</span>
        </div>
        <div className="settings-row">
          <strong>Tech Stack</strong>
          <span>React · TypeScript · Vite</span>
        </div>
      </div>
    </>
  );
}
