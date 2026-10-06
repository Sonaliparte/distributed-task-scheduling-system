import type {
  Task,
  Worker,
  BackendTaskDTO,
  BackendWorkerDTO,
  TaskPriority,
  TaskStatus,
  WorkerStatus,
} from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

// Helper to capitalize first letter
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Format backend task type to UI display label
function formatTaskType(type: string): string {
  switch (type.toLowerCase()) {
    case 'image-processing':
      return 'Image Processing';
    case 'data-processing':
      return 'Data Processing';
    case 'file-compression':
      return 'File Compression';
    case 'report-generation':
      return 'Report Generation';
    default:
      return type;
  }
}

// Convert ISO timestamp or string to human-readable format
function formatCreatedAt(dateStr: string): string {
  if (!dateStr) return 'Just now';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return dateStr;
  }
}

// Map Backend Worker DTO -> Frontend Worker Model
function mapWorker(dto: BackendWorkerDTO): Worker {
  const status: WorkerStatus =
    dto.status.toLowerCase() === 'online'
      ? 'Online'
      : dto.status.toLowerCase() === 'offline'
      ? 'Offline'
      : 'Busy';

  // Capitalize ID for UI name: worker-01 -> Worker-01
  const formattedName = dto.id.replace(/^worker-/, 'Worker-');

  return {
    id: dto.id,
    name: formattedName,
    status,
    cpu: dto.cpuUsage,
    memory: dto.memoryUsage,
    runningTasks: dto.activeTasks,
    totalCpu: dto.totalCpu,
    totalMemory: dto.totalMemory,
  };
}

// Map Backend Task DTO -> Frontend Task Model
function mapTask(dto: BackendTaskDTO): Task {
  return {
    id: dto.id,
    name: dto.name,
    type: formatTaskType(dto.type),
    priority: capitalize(dto.priority) as TaskPriority,
    status: capitalize(dto.status) as TaskStatus,
    worker: dto.worker ? dto.worker.replace(/^worker-/, 'Worker-') : null,
    createdAt: formatCreatedAt(dto.createdAt),
    cpuCores: dto.cpu,
    memoryMB: dto.memory,
    schedulingDecision: dto.schedulingDecision,
  };
}

// ─── API Client Methods ─────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchWorkers(): Promise<Worker[]> {
  const res = await fetch(`${API_BASE_URL}/workers`);
  if (!res.ok) throw new Error('Failed to fetch workers');
  const dtos: BackendWorkerDTO[] = await res.json();
  return dtos.map(mapWorker);
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${API_BASE_URL}/tasks`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  const dtos: BackendTaskDTO[] = await res.json();
  return dtos.map(mapTask);
}

export interface CreateTaskPayload {
  name: string;
  type: string;
  priority: string;
  cpu: number;
  memory: number;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to create task');
  }

  const dto: BackendTaskDTO = await res.json();
  return mapTask(dto);
}

export interface ScheduleResponse {
  message: string;
  taskId: string;
  workerId?: string;
  algorithm?: string;
  reason?: {
    cpuUsage: number;
    memoryUsage: number;
    score: number;
  };
  status?: string;
}

export async function scheduleTask(taskId: string | number): Promise<ScheduleResponse> {
  const res = await fetch(`${API_BASE_URL}/scheduler/schedule/${taskId}`, {
    method: 'POST',
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || 'Scheduling failed');
  }

  return res.json();
}
