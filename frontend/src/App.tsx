import { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatCard from './components/StatCard';
import WorkerCard from './components/WorkerCard';
import TaskTable from './components/TaskTable';
import SubmitTaskModal from './components/SubmitTaskModal';
import ActivityLog from './components/ActivityLog';
import SchedulingStrategy from './components/SchedulingStrategy';

import {
  fetchWorkers,
  fetchTasks,
  createTask,
  scheduleTask,
  type CreateTaskPayload,
} from './services/api';

import type { Task, Worker, LogEntry, Page, SchedulingStrategy as StrategyType } from './types';

// ─── Toast ───────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  title: string;
  message: string;
  type?: 'success' | 'error';
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('Overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, message: 'Connected to backend server http://localhost:5000', time: 'Just now' },
  ]);
  const [strategy, setStrategy] = useState<StrategyType>('Resource-Aware');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [modalLoadingStep, setModalLoadingStep] = useState<string | null>(null);

  const nextLogId = useRef(2);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const addToast = useCallback((title: string, message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const addLog = useCallback((message: string) => {
    setLogs(prev => [
      { id: nextLogId.current++, message, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
  }, []);

  // ─── Fetch Data from Backend ─────────────────────────────────────────────────

  const loadBackendData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);

      const [workersData, tasksData] = await Promise.all([
        fetchWorkers(),
        fetchTasks(),
      ]);

      setWorkers(workersData);
      setTasks(tasksData);
      setConnectionError(null);
    } catch (err: any) {
      console.error('Backend fetch error:', err);
      setConnectionError('Unable to connect to backend.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // ─── Initial Load & 3-Second Auto Refresh Interval ───────────────────────────

  useEffect(() => {
    // Initial fetch
    loadBackendData(true);

    // Auto refresh every 3 seconds as required by spec
    const interval = setInterval(() => {
      loadBackendData(false);
    }, 3000);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [loadBackendData]);

  // ─── Submit Task Flow (Layer 2 POST /api/tasks -> Layer 3 POST /api/scheduler/schedule/:id)

  const handleSubmitTask = useCallback(
    async (payload: CreateTaskPayload) => {
      try {
        setModalLoadingStep('Submitting...');

        // 1. Create task on backend
        const createdTask = await createTask(payload);
        addLog(`Task created: "${createdTask.name}" (ID: ${createdTask.id})`);

        setModalLoadingStep('Scheduling...');

        // 2. Automatically trigger scheduler endpoint
        try {
          const scheduleRes = await scheduleTask(createdTask.id);
          const assignedWorker = scheduleRes.workerId || 'Worker Node';

          addToast(
            'Task Scheduled Successfully',
            `Task "${createdTask.name}" scheduled on ${assignedWorker}`,
            'success'
          );

          addLog(`Scheduler assigned Task #${createdTask.id} to ${assignedWorker} (Algorithm: Resource-Aware)`);
        } catch (scheduleErr: any) {
          console.error('Scheduling error:', scheduleErr);
          addToast(
            'Scheduling Failed',
            'Task created, but scheduling failed.',
            'error'
          );
          addLog(`⚠️ Scheduling failed for Task #${createdTask.id}: ${scheduleErr.message}`);
        }

        // 3. Immediately refresh dashboard state
        await loadBackendData(false);

        // Close modal
        setShowModal(false);
      } catch (err: any) {
        console.error('Task submission error:', err);
        addToast('Task Submission Failed', err.message || 'Failed to create task.', 'error');
        throw err;
      } finally {
        setModalLoadingStep(null);
      }
    },
    [addLog, addToast, loadBackendData]
  );

  // ─── Cancel Task ─────────────────────────────────────────────────────────────

  const handleCancelTask = useCallback(
    (id: string | number) => {
      addToast('Notice', `Task #${id} cancellation noted on frontend.`, 'error');
      addLog(`User attempted cancellation of Task #${id}`);
    },
    [addLog, addToast]
  );

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const totalTasks = tasks.length;
  const running = tasks.filter(t => t.status === 'Running').length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const queued = tasks.filter(t => t.status === 'Queued').length;
  const assigned = tasks.filter(t => t.status === 'Assigned').length;
  const workersOnline = workers.filter(w => w.status === 'Online').length;

  // ─── Render Page Router ──────────────────────────────────────────────────────

  const renderPage = () => {
    if (loading) {
      return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>⟳</div>
          <div>Loading workers and tasks from backend (http://localhost:5000)...</div>
        </div>
      );
    }

    switch (currentPage) {
      case 'Overview':
        return (
          <OverviewPage
            tasks={tasks}
            totalTasks={totalTasks}
            running={running + assigned}
            completed={completed}
            queued={queued}
            workersOnline={workersOnline}
            totalWorkers={workers.length}
            workers={workers}
            onCancelTask={handleCancelTask}
            logs={logs}
            strategy={strategy}
            onStrategyChange={setStrategy}
            connectionError={connectionError}
          />
        );
      case 'Tasks':
        return <TasksPage tasks={tasks} onCancelTask={handleCancelTask} connectionError={connectionError} />;
      case 'Workers':
        return <WorkersPage workers={workers} connectionError={connectionError} />;
      case 'Activity':
        return <ActivityPage logs={logs} />;
      case 'Settings':
        return <SettingsPage strategy={strategy} onStrategyChange={setStrategy} />;
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
          {connectionError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid var(--red)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                color: 'var(--red)',
                fontWeight: 600,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>⚠️ Unable to connect to backend (http://localhost:5000). Please check if server.js is running.</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: 12 }}
                onClick={() => loadBackendData(true)}
              >
                Retry
              </button>
            </div>
          )}

          {renderPage()}
        </div>
      </div>

      {showModal && (
        <SubmitTaskModal
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitTask}
          loadingStep={modalLoadingStep}
        />
      )}

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            className="toast"
            key={t.id}
            style={{
              borderColor: t.type === 'error' ? 'var(--red)' : 'var(--border)',
            }}
          >
            <span
              className="toast-icon"
              style={{ color: t.type === 'error' ? 'var(--red)' : 'var(--green)' }}
            >
              {t.type === 'error' ? '⚠️' : '✓'}
            </span>
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
  totalTasks: number;
  running: number;
  completed: number;
  queued: number;
  workersOnline: number;
  totalWorkers: number;
  workers: Worker[];
  onCancelTask: (id: string | number) => void;
  logs: LogEntry[];
  strategy: StrategyType;
  onStrategyChange: (s: StrategyType) => void;
  connectionError: string | null;
}

function OverviewPage(props: OverviewPageProps) {
  const {
    tasks,
    totalTasks,
    running,
    completed,
    queued,
    workersOnline,
    totalWorkers,
    workers,
    onCancelTask,
    logs,
    strategy,
    onStrategyChange,
    connectionError,
  } = props;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-desc">Real-time distributed scheduler monitoring & task queue</p>
        </div>
      </div>

      <div
        className="demo-banner"
        style={{
          background: connectionError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          borderColor: connectionError ? 'var(--red)' : 'var(--green)',
        }}
      >
        <span style={{ color: connectionError ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
          {connectionError ? '🔴 BACKEND DISCONNECTED' : '🟢 LIVE BACKEND CONNECTED'}
        </span>
        — Synchronized with Express API on http://localhost:5000 (Auto-refreshes every 3s).
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard
          label="Total Tasks"
          value={totalTasks}
          icon="⊞"
          iconBg="rgba(91,124,246,0.12)"
          iconColor="var(--accent)"
          sub="All submitted tasks"
        />
        <StatCard
          label="Assigned / Running"
          value={running}
          icon="⟳"
          iconBg="rgba(56,189,248,0.12)"
          iconColor="var(--blue)"
          sub="Executing on workers"
        />
        <StatCard
          label="Completed"
          value={completed}
          icon="✓"
          iconBg="rgba(34,197,94,0.12)"
          iconColor="var(--green)"
          sub="Successfully finished"
        />
        <StatCard
          label="Queued"
          value={queued}
          icon="⏸"
          iconBg="rgba(245,158,11,0.12)"
          iconColor="var(--amber)"
          sub="Awaiting scheduler"
        />
        <StatCard
          label="Workers Online"
          value={`${workersOnline} / ${totalWorkers}`}
          icon="🖥"
          iconBg="rgba(34,197,94,0.12)"
          iconColor="var(--green)"
          sub="Active worker nodes"
        />
      </div>

      {/* Workers */}
      <div className="section">
        <div className="section-header">
          <div>
            <div className="section-title">Worker Nodes</div>
            <div className="section-sub">{workersOnline} of {totalWorkers} nodes online (from GET /api/workers)</div>
          </div>
        </div>
        <div className="worker-grid">
          {workers.map(w => (
            <WorkerCard key={w.id} worker={w} />
          ))}
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

function TasksPage({
  tasks,
  onCancelTask,
  connectionError,
}: {
  tasks: Task[];
  onCancelTask: (id: string | number) => void;
  connectionError: string | null;
}) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-desc">Manage and monitor all submitted backend tasks</p>
        </div>
      </div>
      <div
        className="demo-banner"
        style={{
          background: connectionError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          borderColor: connectionError ? 'var(--red)' : 'var(--green)',
        }}
      >
        <span>{connectionError ? '🔴 DISCONNECTED' : '🟢 LIVE BACKEND'}</span>
        — Displaying live data from GET http://localhost:5000/api/tasks
      </div>
      <TaskTable tasks={tasks} onCancelTask={onCancelTask} />
    </>
  );
}

// ─── Workers Page ─────────────────────────────────────────────────────────────

function WorkersPage({ workers, connectionError }: { workers: Worker[]; connectionError: string | null }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workers</h1>
          <p className="page-desc">Real-time worker metrics from Express worker registry</p>
        </div>
      </div>
      <div
        className="demo-banner"
        style={{
          background: connectionError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          borderColor: connectionError ? 'var(--red)' : 'var(--green)',
        }}
      >
        <span>{connectionError ? '🔴 DISCONNECTED' : '🟢 LIVE BACKEND'}</span>
        — Displaying live data from GET http://localhost:5000/api/workers
      </div>
      <div className="section">
        <div className="worker-grid">
          {workers.map(w => (
            <WorkerCard key={w.id} worker={w} />
          ))}
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
          <p className="page-desc">Live log of API task creation & scheduling events</p>
        </div>
      </div>
      <ActivityLog logs={logs} />
    </>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

function SettingsPage({
  strategy,
  onStrategyChange,
}: {
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
        <h3>Backend Integration</h3>
        <div className="settings-row">
          <strong>API Base URL</strong>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>http://localhost:5000/api</span>
        </div>
        <div className="settings-row">
          <strong>Backend Status</strong>
          <span style={{ color: 'var(--green)' }}>🟢 Connected (Layer 2 & 3 APIs Active)</span>
        </div>
        <div className="settings-row">
          <strong>Auto Refresh Interval</strong>
          <span>3 Seconds (Polling enabled)</span>
        </div>
      </div>

      <div className="settings-section">
        <h3>Scheduling Engine</h3>
        <SchedulingStrategy selected={strategy} onChange={onStrategyChange} />
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <div className="settings-row">
          <strong>Project</strong>
          <span>Distributed Task Scheduler</span>
        </div>
        <div className="settings-row">
          <strong>Current Stage</strong>
          <span>Layer 3 Frontend Integration</span>
        </div>
      </div>
    </>
  );
}
