.. _jobschedulers:

Job schedulers
==============

Currently MARTi supports two job schedulers to share out processing of e.g. BLAST jobs.

* **Local** - MARTi's own job scheduler used when running in local configuration. It schedules jobs across the CPUs and memory available on the current machine. Configuration options let you set the maximum number of concurrent jobs.
* **Slurm** - the popular SLURM job scheduler.

If you are running on an HPC and you don't use SLURM, the local scheduler should work. However, it will only be able to take advantage of the CPUs and memory on the node it is running on. 

Notes about SLURM
-----------------

SLURM jobs are submitted via the **slurmit** script that can be found in the bin directory. It's important that that this directory is part of the PATH environment variable so that the operating system can find slurmit as MARTi is running. This is covered in the installation instructions.

Depending on the compute available to you, and in order to consider the needs of other users, you may want to restrict the number of parallel BLAST jobs that MARTi launches. You can do this with the MaxJobs parameter in MARTi config files (see :ref:`configfiles`).