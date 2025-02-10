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

Local vs SLURM
--------------

While MARTi supports both local and SLURM job scheduling, choosing the right option depends on your specific computational environment and resource management needs.

**Local Scheduler**

The local scheduler is often preferred, even on HPC systems, for its efficient resource utilisation. When running in local mode, MARTi can manage jobs, allowing multiple processes (e.g., BLAST jobs) to share CPU and memory resources. This flexibility is particularly beneficial for memory-intensive analyses, as the actual memory usage of each job may vary over time. By sharing a pool of resources, the local scheduler minimises wasted memory and avoids over-provisioning.

**Advantages:**

- More efficient memory usage as jobs share a common memory pool.
- Reduced overhead compared to submitting individual jobs to SLURM.
- Simpler configuration.

**Considerations:**

- Limited to the resources available on a single node.

**SLURM Scheduler**

When using SLURM, each MARTi process (e.g., BLAST job) is submitted as an individual SLURM job, which can provide better isolation between processes but may lead to inefficient memory usage, as each job is allocated its own memory block regardless of actual usage.

**Advantages:**

- Scales easily across multiple nodes in large clusters.

**Considerations:**

- Less efficient memory usage compared to the local scheduler.
- Additional overhead from job submission and management.
- Requires correct SLURM configuration and environment setup (e.g., ensuring **slurmit** is in the PATH).

**Recommendation:**  
Unless you have specific requirements to use SLURM, we recommend using the local scheduler for most analyses, even on HPC systems. It typically offers better resource efficiency and simpler management.
