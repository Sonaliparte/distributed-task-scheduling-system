import type { Task, Worker, LogEntry } from '../types';

export const initialWorkers: Worker[] = [
  {
    id: 'w1',
    name: 'Worker-01',
    status: 'Online',
    cpu: 32,
    memory: 41,
    runningTasks: 2,
  },
  {
    id: 'w2',
    name: 'Worker-02',
    status: 'Online',
    cpu: 67,
    memory: 52,
    runningTasks: 4,
  },
  {
    id: 'w3',
    name: 'Worker-03',
    status: 'Online',
    cpu: 21,
    memory: 35,
    runningTasks: 1,
  },
];

export const initialTasks: Task[] = [
  {
    id: 1001,
    name: 'Image Processing',
    type: 'Image Processing',
    priority: 'High',
    status: 'Running',
    worker: 'Worker-02',
    createdAt: 'Just now',
    cpuCores: 2,
    memoryMB: 512,
  },
  {
    id: 1002,
    name: 'Data Processing',
    type: 'Data Processing',
    priority: 'Medium',
    status: 'Completed',
    worker: 'Worker-01',
    createdAt: '2 min ago',
    cpuCores: 1,
    memoryMB: 256,
  },
  {
    id: 1003,
    name: 'Generate Report',
    type: 'Report Generation',
    priority: 'Low',
    status: 'Queued',
    worker: null,
    createdAt: '3 min ago',
    cpuCores: 1,
    memoryMB: 128,
  },
  {
    id: 1004,
    name: 'File Compression',
    type: 'File Compression',
    priority: 'High',
    status: 'Running',
    worker: 'Worker-03',
    createdAt: '5 min ago',
    cpuCores: 1,
    memoryMB: 256,
  },
];

export const initialLogs: LogEntry[] = [
  {
    id: 1,
    message: 'Task #1004 assigned to Worker-03',
    time: '2 minutes ago',
  },
  {
    id: 2,
    message: 'Task #1003 added to queue',
    time: '3 minutes ago',
  },
  {
    id: 3,
    message: 'Worker-02 status changed to Busy',
    time: '5 minutes ago',
  },
  {
    id: 4,
    message: 'Task #1002 completed successfully',
    time: '7 minutes ago',
  },
  {
    id: 5,
    message: 'Task #1001 assigned to Worker-02',
    time: '9 minutes ago',
  },
  {
    id: 6,
    message: 'Worker-01 came online',
    time: '12 minutes ago',
  },
];
