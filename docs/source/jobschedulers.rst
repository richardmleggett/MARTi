.. _jobschedulers:

Job schedulers
==============

Currently MARTi supports two job schedulers to share out processing of e.g. BLAST jobs.

* **Local** - MARTi's own job scheduler used when running in local configuration. It schedules jobs across the CPUs and memory available on the current machine. Configuration options let you set the maximum number of concurrent jobs.
* **Slurm** - the popular SLURM job scheduler.

If you are running on an HPC and you don't use SLURM, the local scheduler should work. However, it will only be able to take advantage of the CPUs and memory on the node it is running on. 

SLURM jobs are submitted via the 'slurmit' script that can be found in the bin directory.