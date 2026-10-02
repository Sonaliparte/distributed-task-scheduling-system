Build a distributed task scheduling system.

The problem I'm trying to solve is that when a large number of computational tasks arrive, sending everything to a single server can overload it. So I'm building a system where multiple worker nodes can execute tasks in parallel.

There will be a central scheduler that receives tasks and decides which worker should execute each task based on factors like CPU usage, memory usage, current workload and task priority.

For the initial implementation, the workers can run as separate Docker containers on my system. Each worker will periodically send a heartbeat and resource information to the scheduler.

If a worker becomes unavailable, the scheduler will detect the failure and reassign its unfinished tasks to another available worker.

The frontend will be a monitoring dashboard where I can submit tasks, see worker CPU/RAM usage, monitor running and completed tasks, and visualize how the scheduler distributes the workload.

Later, I want to implement and compare scheduling strategies such as Round Robin, Least Loaded and Priority-Based Scheduling, and measure their performance.