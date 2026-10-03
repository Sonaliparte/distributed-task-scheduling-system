// ─── Task Types ────────────────────────────────────────────────────────────────

export type TaskStatus = 'Queued' | 'Running' | 'Completed' | 'Failed';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskType =
  | 'Image Processing'
  | 'Data Processing'
  | 'File Compression'
  | 'Report Generation'
  | 'Custom Task';

export interface Task {
  id: number;
  name: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  worker: string | null;
  createdAt: string; // human-readable relative time
  cpuCores: number;
  memoryMB: number;
}

// ─── Worker Types ───────────────────────────────────────────────────────────────

export type WorkerStatus = 'Online' | 'Offline' | 'Busy';

export interface Worker {
  id: string;
  name: string;
  status: WorkerStatus;
  cpu: number;       // percentage 0-100
  memory: number;    // percentage 0-100
  runningTasks: number;
}

// ─── Activity Log ───────────────────────────────────────────────────────────────

export interface LogEntry {
  id: number;
  message: string;
  time: string;
}

// ─── Scheduling ─────────────────────────────────────────────────────────────────

export type SchedulingStrategy = 'Round Robin' | 'Least Loaded' | 'Priority Based';

// ─── App Pages ──────────────────────────────────────────────────────────────────

export type Page = 'Overview' | 'Tasks' | 'Workers' | 'Activity' | 'Settings';
