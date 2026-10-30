Build a distributed task scheduling system.

## Current implementation

The system has an Express scheduler API, a React/Vite monitoring dashboard, a
compiled C++ scheduling engine, and independently runnable worker processes.
Tasks and worker metadata are currently process-local stores; MongoDB is not
yet wired into the runtime, so restart persistence is still pending.

Implemented capabilities:

- C++ Round Robin, Least Loaded, Priority-Based, and Resource-Aware scheduling.
- Node-to-C++ stdio integration with configurable `SCHEDULER_BINARY` and a
	JavaScript fallback when the binary cannot be started.
- Worker registration, heartbeats, resource reporting, completion callbacks,
	task history, configurable retries, and heartbeat-timeout recovery.
- Multiple worker instances through Docker Compose or Kubernetes replicas.
- A comparison API and dashboard. Scheduling latency is measured; waiting,
	completion, load distribution, and failure values are explicitly labelled
	assignment-simulation metrics until a persistent execution/metrics backend is
	added.

## Local development

Install dependencies and run the backend and frontend in separate terminals:

```powershell
cd backend
npm install
node server.js
```

```powershell
cd frontend
npm install
npm run dev
```

Run an independent worker with a unique ID and port:

```powershell
$env:SCHEDULER_URL = "http://localhost:5000/api"
$env:WORKER_ID = "worker-04"
$env:PORT = "6004"
node workers/workers.js
```

The worker registers at startup, sends heartbeats, accepts `/execute`, and
reports completion to the backend.

## C++ scheduler

The problem I'm trying to solve is that when a large number of computational tasks arrive, sending everything to a single server can overload it. So I'm building a system where multiple worker nodes can execute tasks in parallel.

There will be a central scheduler that receives tasks and decides which worker should execute each task based on factors like CPU usage, memory usage, current workload and task priority.

For the initial implementation, the workers can run as separate Docker containers on my system. Each worker will periodically send a heartbeat and resource information to the scheduler.

If a worker becomes unavailable, the scheduler will detect the failure and reassign its unfinished tasks to another available worker.

The frontend will be a monitoring dashboard where I can submit tasks, see worker CPU/RAM usage, monitor running and completed tasks, and visualize how the scheduler distributes the workload.

Later, I want to implement and compare scheduling strategies such as Round Robin, Least Loaded and Priority-Based Scheduling, and measure their performance.

## C++ scheduler

The scheduling algorithms are implemented independently in C++ under [`scheduler/`](C:/Users/sonal/OneDrive/Desktop/distributed%20task%20scheduling%20system/scheduler):

```text
scheduler/
├── include/scheduler.h
├── src/
│   ├── main.cpp
│   ├── round_robin.cpp
│   ├── least_loaded.cpp
│   ├── priority_based.cpp
│   └── resource_aware.cpp
├── tests/scheduler_tests.cpp
└── CMakeLists.txt
```

Build and run the C++ scheduler tests:

```powershell
cmake -S scheduler -B scheduler/build
cmake --build scheduler/build
ctest --test-dir scheduler/build --output-on-failure
```

The existing Node.js API remains available for the dashboard integration. The C++ target provides the modular scheduling engine and keeps each algorithm in its own translation unit.

The backend Docker image builds this executable and sets
`SCHEDULER_BINARY=/app/scheduler/build/scheduler`. On Windows, use a Visual
Studio or MinGW C++ toolchain before running the CMake commands. The current
environment has CMake but no `nmake`/C++ compiler, so the C++ build could not be
executed here.

## Docker Compose

No credentials are embedded in the images. Optional settings are supplied via
the shell environment:

```powershell
$env:TASK_MAX_RETRIES = "3"
$env:WORKER_HEARTBEAT_TIMEOUT_MS = "10000"
docker compose up --build
```

Compose starts the backend and two named workers. Add more worker services or
use Kubernetes replicas for larger deployments.

## Kubernetes

Build and load `distributed-scheduler-backend:latest` and
`distributed-scheduler-worker:latest` into the cluster, then apply:

```powershell
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/workers.yaml
kubectl scale deployment scheduler-worker --replicas=5
```

Kubernetes probes remove unhealthy pods from service traffic and restart them;
the scheduler remains responsible for task-to-worker assignment and retries.

## Validation status

- `frontend/npm run build`: passes.
- Node syntax checks for the backend and worker services: pass.
- C++ CMake configure/build and CTest: blocked in this environment because no
	C++ compiler/NMake is installed; run them on a machine with a C++ toolchain.

Pending production work includes replacing process-local stores with MongoDB,
durable task leases/idempotency keys, and real execution telemetry for a fully
measured comparison report.


## what is a job scheduler?
--> Program that automatically schedules and execute a program or job.
it can be used to run pipeline at specific intervals run reporting jobs, run backup scripts etc at specific time interval.

Real life example - azure data factory, email schedules.

# Task: some functionality to be executed
# Job: The process or container that executes the work.

## Functional Requirements:
1) Users can submit a job/ task to run based on a particular schedule and see the status of the job.
2) A suport for manual trigger should also be there.
3) Every submitted job will be a python script (later we can add suport for more languages like ruby node)
4) each job should run at-least once on the give schedule.
5) jobs can be recurring also, and there should be support for disabling the job runs.
6) Good to have features.
- support of resource allocation config.
- monitoring dashboard suport.
- log monitoring support.
7) support of dependent jobs should be there.
8) The system should be highly scalable ~ 10B jobs per day

# Back of the envelope estimation
Throughput expcted - 10^9 job per day/ 10^5 (approx sec in a day) ~ 10^4 jobs per seconds

## High Level Design
User - owner of the job who creates the scheduling of a task.
Task - python script with the logic.
Job - instance of a scheduled taskk i.e task + schedule + parameters.
Run - once a job runs at a given schedule, we create a run for it
Job schedule - stores exact time stamp for next one.
