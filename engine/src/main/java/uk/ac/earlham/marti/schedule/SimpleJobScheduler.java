/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.schedule;

import com.sun.management.OperatingSystemMXBean;
import java.lang.management.ManagementFactory;
import java.io.File;
import java.util.LinkedList;
import java.util.concurrent.ConcurrentHashMap;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.MARTiLog;

/**
 * Local job scheduler.
 * 
 * @author Richard M. Leggett
 */
public class SimpleJobScheduler implements JobScheduler {
    private static final int MAX_QUICK_JOB_ID = 100000;
    private ConcurrentHashMap<Integer, SimpleJobSchedulerJob> allJobs = new ConcurrentHashMap<Integer, SimpleJobSchedulerJob>();
    private ConcurrentHashMap<Integer, SimpleJobSchedulerJob> failedJobs = new ConcurrentHashMap<Integer, SimpleJobSchedulerJob>();
    private LinkedList<SimpleJobSchedulerJob> pendingJobs = new LinkedList<SimpleJobSchedulerJob>();
    private LinkedList<SimpleJobSchedulerJob> runningJobs = new LinkedList<SimpleJobSchedulerJob>();
    //private LinkedList<SimpleJobSchedulerJob> failedJobs = new LinkedList<SimpleJobSchedulerJob>();
    //private LinkedList<SimpleJobSchedulerJob> finishedJobs = new LinkedList<SimpleJobSchedulerJob>();
    private MARTiLog schedulerLog = new MARTiLog();
    private MARTiEngineOptions options;
    private int maxJobs = 4;
    private int jobId = 1;
    private boolean dontRunCommand = false;
    private boolean[] quickCompletedList = new boolean[MAX_QUICK_JOB_ID];
    public int[] exitValues = new int[MAX_QUICK_JOB_ID];
    long lastLoadReport = System.nanoTime() / 1000000; // ms
    
    public SimpleJobScheduler(int m, MARTiEngineOptions o) {
        maxJobs = m;
        options = o;
        schedulerLog.open(o.getLogsDir()+File.separator+"scheduler.txt");
        for (int i=0; i<MAX_QUICK_JOB_ID; i++) {
            quickCompletedList[i] = false;
            exitValues[i] = 0;
        }
    }
    
    private void printLoad() {
        com.sun.management.OperatingSystemMXBean osBean = ManagementFactory.getPlatformMXBean(com.sun.management.OperatingSystemMXBean.class);
        double systemCPULoad = osBean.getSystemCpuLoad();
        double processCPULoad = osBean.getProcessCpuLoad();
        long processCPUTime = osBean.getProcessCpuTime() / (1000000000); // s
        long freePhysicalMemory = osBean.getFreePhysicalMemorySize() / (1024*1024); //Mb
        long totalPhysicalMemory = osBean.getTotalPhysicalMemorySize() / (1024* 1024); // Mb
        long freeSwapSpace = osBean.getFreeSwapSpaceSize() / (1024 *1024); // Mb
        long totalSwapSpace = osBean.getTotalSwapSpaceSize() / (1024 * 1024); // Mb
        long committedVirtualMemory = osBean.getCommittedVirtualMemorySize() / (1024 * 1024); // Mb
        String s = String.format("System report sysLoad=%.2f processLoad=%.2f processTime=%d freePhys=%d totalPhys=%d freeSwap=%d totalSwap=%d commitVM=%d",
                   systemCPULoad,
                   processCPULoad,
                   processCPUTime,
                   freePhysicalMemory,
                   totalPhysicalMemory,
                   freeSwapSpace,
                   totalSwapSpace,
                   committedVirtualMemory);

        schedulerLog.println(s);
    }
    
    
    public void setDontRunCommand() {
        dontRunCommand = true;
    }
    
    public void setMaxJobs(int m) {
        maxJobs = m;
    }
        
    public synchronized int submitJob(String identifier, String[] commands, String logFilename, boolean submitJob) {
        if (MARTiEngineOptions.DEBUG_DONT_SUBMIT_JOB) {
            commands = new String[]{"echo","Hello"};
        }
        
        boolean dontRunIt = false;
        if ((dontRunCommand == true) || (submitJob == false)) {
            dontRunIt = true;
        }
                
        SimpleJobSchedulerJob j = new SimpleJobSchedulerJob(options, identifier, jobId, commands, logFilename, dontRunIt);
        pendingJobs.add(j);
        allJobs.put(jobId, j);
        schedulerLog.println("Submitted job\t"+jobId+"\t"+j.getCommand());
        return jobId++;
    }

    public synchronized int submitJob(String identifier, String[] commands, String logFilename, String errorFilename, boolean submitJob) {
        boolean dontRunIt = false;
        if ((dontRunCommand == true) || (submitJob == false)) {
            dontRunIt = true;
        }
        
        SimpleJobSchedulerJob j = new SimpleJobSchedulerJob(options, identifier, jobId, commands, logFilename, errorFilename, dontRunIt);
        pendingJobs.add(j);
        schedulerLog.println("Submitted job\t"+jobId+"\t"+j.getCommand());
        return jobId++;
    }
    
    public synchronized int submitJob(SimpleJobSchedulerJob j) {
        j.setJobId(jobId);
        pendingJobs.add(j);
        schedulerLog.println("Submitted job\t"+jobId+"\t"+j.getCommand());
        return jobId++;
    }
    
    public synchronized void manageQueue() {
        // Check for any finished jobs
        for (int i=0; i<runningJobs.size(); i++) {
            SimpleJobSchedulerJob j = runningJobs.get(i);
            if (j.hasFinished()) {
                schedulerLog.println("Finished job\t" +j.getId() + "\t" + j.getCommand());
                schedulerLog.println("Exit value was "+j.getExitValue());
                                
                runningJobs.remove(i);
                if (i < MAX_QUICK_JOB_ID) {
                    quickCompletedList[j.getId()] = true;
                    exitValues[j.getId()] = j.getExitValue();
                    //finishedJobs.add(j);
                }
            }
        }
        
        // Now can we move jobs from pending to running?
        boolean foundJobToRun = true;
        while ((runningJobs.size() < maxJobs) &&
               (pendingJobs.size() > 0) &&
               (foundJobToRun))
        {                        
            // Find next job to run
            int index = -1;
            for (int i=0; i<pendingJobs.size(); i++) {
                SimpleJobSchedulerJob job = pendingJobs.get(i);
                if (job.getNumberOfDependencies() == 0) {
                    // No dependencies, so can use this
                    index = i;
                } else {
                    // Check if job has met all dependencies
                    boolean metDependencies = true;
                    for (int j=0; j<job.getNumberOfDependencies(); j++) {
                        if (checkJobCompleted(job.getDependency(j)) == false) {
                            metDependencies = false;
                            schedulerLog.println("Job "+job.getId() + " dependency not yet met.");
                            break;
                        } else {
                            schedulerLog.println("Job "+job.getId() + " dependency has been met.");
                        }
                    }
                    
                    if (metDependencies) {
                        index = i;
                    }
                }
                
                if (index != -1) {
                    break;
                }
            }
            
            if (index != -1) {
                SimpleJobSchedulerJob j = pendingJobs.remove(index);
                schedulerLog.println("Running job\t" + j.getId() + "\t" +j.getCommand());
                //schedulerLog.println("Logging "+j.getLog());
                runningJobs.add(j);
                j.run();
            } else {
                foundJobToRun = false;
            }
            
            //SimpleJobSchedulerJob j = pendingJobs.remove();
            //schedulerLog.println("Running job\t" + j.getId() + "\t" +j.getCommand());
            //schedulerLog.println("Logging "+j.getLog());
            //runningJobs.add(j);
            //j.run();
        }
        
        long timeDiff = (System.nanoTime() - lastLoadReport) / 1000000;
        if (timeDiff > 10000) {
            this.printLoad();
            lastLoadReport = System.nanoTime();
        }
    }    
    
    public synchronized boolean checkJobCompleted(int i) {
        if (i < MAX_QUICK_JOB_ID) {
            return quickCompletedList[i];
        } else {
            return false;
        }
    }

    public synchronized boolean checkJobFailed(int i) {
        boolean failed = false;
        if (failedJobs.containsKey(i)) {
            failed = true;
        }
        return failed;
    }
    
    public synchronized int getExitValue(int i) {
        if (i < MAX_QUICK_JOB_ID) {
            return exitValues[i];
        } else {
            return 0;
        }
    }
    
    public synchronized int getRunningJobCount() {
        return runningJobs.size();
    }

    public synchronized int getPendingJobCount() {
        return pendingJobs.size();
    }
    
    public synchronized int getFailedJobCount() {
        return failedJobs.size();
    }

    public synchronized void markJobAsFailed(int i) {
        SimpleJobSchedulerJob ssj = allJobs.get(i);
        failedJobs.put(i, ssj);
    }

    public synchronized void resubmitJobIfPossible(int i) {
        // Resubmission not possible with local job scheduler.
        // Probably pointless, unlike with SLURM where it may make a differencece.
    }

    public MARTiLog getSchedulerLog() {
        return schedulerLog;
    }
}
