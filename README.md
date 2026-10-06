Build a distributed task scheduling system.

The problem I'm trying to solve is that when a large number of computational tasks arrive, sending everything to a single server can overload it. So I'm building a system where multiple worker nodes can execute tasks in parallel.

There will be a central scheduler that receives tasks and decides which worker should execute each task based on factors like CPU usage, memory usage, current workload and task priority.

For the initial implementation, the workers can run as separate Docker containers on my system. Each worker will periodically send a heartbeat and resource information to the scheduler.

If a worker becomes unavailable, the scheduler will detect the failure and reassign its unfinished tasks to another available worker.

The frontend will be a monitoring dashboard where I can submit tasks, see worker CPU/RAM usage, monitor running and completed tasks, and visualize how the scheduler distributes the workload.

Later, I want to implement and compare scheduling strategies such as Round Robin, Least Loaded and Priority-Based Scheduling, and measure their performance.


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
