// ─── Task Types ────────────────────────────────────────────────────────────────

export type TaskStatus = 'Queued' | 'Assigned' | 'Running' | 'Completed' | 'Failed';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskType =
  | 'Image Processing'
  | 'Data Processing'
  | 'File Compression'
  | 'Report Generation'
  | 'Custom Task'
  | string;

export interface SchedulingDecision {
  algorithm: string;
  scheduledAt: string;
  workerId: string;
  score: number;
  workerCpuBefore?: number;
  workerMemoryBefore?: number;
  workerCpuAfter?: number;
  workerMemoryAfter?: number;
}

export interface Task {
  id: string | number;
  name: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  worker: string | null;
  createdAt: string;
  cpuCores: number;
  memoryMB: number;
  schedulingDecision?: SchedulingDecision;
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
  totalCpu?: number;
  totalMemory?: number;
}

// ─── Backend DTO Types ──────────────────────────────────────────────────────────

export interface BackendTaskDTO {
  id: string;
  name: string;
  type: string;
  priority: string;
  cpu: number;
  memory: number;
  status: string;
  worker: string | null;
  createdAt: string;
  schedulingDecision?: SchedulingDecision;
}

export interface BackendWorkerDTO {
  id: string;
  status: string;
  cpuUsage: number;
  memoryUsage: number;
  totalCpu: number;
  totalMemory: number;
  activeTasks: number;
}

// ─── Activity Log ───────────────────────────────────────────────────────────────

export interface LogEntry {
  id: number;
  message: string;
  time: string;
}

// ─── Scheduling ─────────────────────────────────────────────────────────────────

export type SchedulingStrategy = 'Resource-Aware' | 'Round Robin' | 'Least Loaded' | 'Priority Based';

// ─── App Pages ──────────────────────────────────────────────────────────────────

export type Page = 'Overview' | 'Tasks' | 'Workers' | 'Activity' | 'Settings';
