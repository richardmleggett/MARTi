/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.schedule;

import com.sun.management.OperatingSystemMXBean;
import java.lang.management.ManagementFactory;
import java.io.File;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.LinkedList;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingDeque;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.MARTiLog;

/**
 * Local job scheduler.
 * 
 * @author Richard M. Leggett
 */
public class SlurmScheduler implements JobScheduler {
    private static final int MAX_QUICK_JOB_ID = 100000;
    private ConcurrentHashMap<Integer, SlurmSchedulerJob> allJobs = new ConcurrentHashMap<Integer, SlurmSchedulerJob>();
    private LinkedBlockingDeque<SlurmSchedulerJob> pendingJobs = new LinkedBlockingDeque<SlurmSchedulerJob>();
    private ConcurrentHashMap<Integer, SlurmSchedulerJob> runningJobs = new ConcurrentHashMap<Integer, SlurmSchedulerJob>();
    private ConcurrentHashMap<Integer, SlurmSchedulerJob> failedJobs = new ConcurrentHashMap<Integer, SlurmSchedulerJob>();    
    private ConcurrentHashMap<Integer, Integer> jobStatus = new ConcurrentHashMap<Integer, Integer>();
    private MARTiLog schedulerLog = new MARTiLog();
    private MARTiLog slurmLog = new MARTiLog();
    private MARTiEngineOptions options;
    private int internalJobId = 1; // Id used in this Java class, not by SLURM
    private int maxJobs = 1000;
    private boolean dontRunCommand = false;
    private long lastSlurmQuery = System.nanoTime();
    
    public SlurmScheduler(MARTiEngineOptions o) {
        options = o;
        schedulerLog.open(o.getLogsDir()+File.separator+"scheduler.txt");
        schedulerLog.println("maxJobs = "+maxJobs);
        slurmLog.open(o.getLogsDir()+File.separator+"slurm.txt");
    }    
    
    public synchronized void setDontRunCommand() {
        dontRunCommand = true;
    }

    public synchronized void setMaxJobs(int m) {
        maxJobs = m;
        schedulerLog.println("maxJobs = "+maxJobs);
    }    
    
    public synchronized int submitJob(String identifier, String[] commands, String logFilename, boolean submitJob) {
        if (MARTiEngineOptions.DEBUG_DONT_SUBMIT_JOB) {
            commands = new String[]{"echo","Hello"};
        }
        
        boolean dontRunIt = false;
        if ((dontRunCommand == true) || (submitJob == false)) {
            dontRunIt = true;
        }
                
        SlurmSchedulerJob j = new SlurmSchedulerJob(options, identifier, "marti"+internalJobId, internalJobId, commands, logFilename, dontRunIt);
        j.setSchedulerFileTimeout(options.getSchedulerFileTimeout());
        j.setSchedulerFileWriteDelay(options.getSchedulerFileWriteDelay());
        j.setResubmissionAttempts(options.getSchedulerResubmissionAttempts());
        pendingJobs.add(j);
        allJobs.put(internalJobId, j);
        jobStatus.put(internalJobId, SlurmSchedulerJob.STATE_PENDING);
        schedulerLog.println("Submitted job\t"+internalJobId+"\t"+j.getCommand());
        return internalJobId++;
    }
    
    public synchronized void setJobMemory(int i, String s) {
        SlurmSchedulerJob ssj = allJobs.get(i);
        if (ssj != null) {
            ssj.setMemory(s);
        }
    }

    public synchronized void setCPUs(int i, int n) {
        SlurmSchedulerJob ssj = allJobs.get(i);
        if (ssj != null) {
            ssj.setCPUs(n);
        }
    }    

    public synchronized void setQueue(int i, String q) {
        SlurmSchedulerJob ssj = allJobs.get(i);
        if (ssj != null) {
            ssj.setQueue(q);
        }
    }
    
    // The next methods rely on our local list of jobs and don't query SLURM .
    // That's all done by manageQueue. This is because SLURM can sometimes be
    // slow, so we only query it periodically.
    public synchronized boolean checkJobCompleted(int i) {
        if (jobStatus.containsKey(i)) {    
            int s = jobStatus.get(i);
            if (s == SlurmSchedulerJob.STATE_COMPLETED) {
                return true;
            }
        } else {
            options.getLog().printlnLogAndScreen("Warning: Attempt to check completion on unknown job id " + i);
        }
        
        return false;
    }
    
    public synchronized boolean checkJobFailed(int i) {
        boolean failed = false;

        if (jobStatus.containsKey(i)) {    
            
        } else {
            options.getLog().printlnLogAndScreen("Warning: Attempt to check completion on unknown job id " + i);
        }
        
        return failed;
    }
    
    // See comment above
    public synchronized int getSlurmState(int i) {
        if (jobStatus.containsKey(i)) {    
            return jobStatus.get(i);
        } else {
            options.getLog().printlnLogAndScreen("Warning: Attempt to check exit on unknown job id " + i);
        }
        return SlurmSchedulerJob.STATE_UNKNOWN;
    }
    
    public synchronized int getExitValue(int i) {
        SlurmSchedulerJob ssj = allJobs.get(i);
        if (ssj != null) {
            return ssj.getExitValue();
        }

        return SlurmSchedulerJob.STATE_UNKNOWN;
    }
    
    public synchronized void setDependentFilename(int i, String s) {
        SlurmSchedulerJob ssj = allJobs.get(i);
        if (ssj != null) {
            ssj.setDependentFilename(s);
        }
    }
        
    public synchronized int getRunningJobCount() {
        return runningJobs.size();
    }

    public synchronized int getPendingJobCount() {
        return pendingJobs.size();
    }
    
    public synchronized void manageQueue() {
        // Check state of jobs, but only every minute or two
        long timeNow = System.nanoTime();
        long timeDiff = (timeNow - lastSlurmQuery) / 1000000; // ms
        if (timeDiff < (60*1000)) {
            return;
        }

        lastSlurmQuery = timeNow;

        // Check for any finished jobs
        Set<Integer> runningJobInternalIds = runningJobs.keySet();
        for (int id : runningJobInternalIds) {
            SlurmSchedulerJob ssj = runningJobs.get(id);
            ssj.queryJobState();
            int jState = ssj.getJobState();
            //schedulerLog.println("SLURM job "+id+" state "+jState);
            if (jState == SlurmSchedulerJob.STATE_COMPLETED) {
                schedulerLog.println("Finished job\t" +ssj.getId() + "\t" + ssj.getCommand());
                schedulerLog.println("Exit value was "+ssj.getExitValue());
                runningJobs.remove(id);
                jobStatus.put(id, jState);                
            } else if ((jState == SlurmSchedulerJob.STATE_FAILED) ||
                       (jState == SlurmSchedulerJob.STATE_BOOT_FAIL) ||
                       (jState == SlurmSchedulerJob.STATE_CANCELLED) ||
                       (jState == SlurmSchedulerJob.STATE_NODE_FAIL) ||
                       (jState == SlurmSchedulerJob.STATE_OOM) ||
                       (jState == SlurmSchedulerJob.STATE_REVOKED) ||
                       (jState == SlurmSchedulerJob.STATE_TIMEOUT)) {
                schedulerLog.println("Job "+ssj.getId()+" failed with code "+jState+" and exit value "+ssj.getExitValue()); 
                runningJobs.remove(id);
                failedJobs.put(id, ssj);
                options.getLog().printlnLogAndScreen("Failed SLURM job "+ssj.getId()+" - see scheduler log");
                options.getLog().printlnLogAndScreen("Log is at "+ssj.getLog());
            } else if ((jState != SlurmSchedulerJob.STATE_RUNNING) &&
                       (jState != SlurmSchedulerJob.STATE_PENDING)) {
                schedulerLog.println("Unknown state for job "+ssj.getId()+" "+jState);
            }
        }
        
        // Now can we move jobs from pending to running?
        boolean foundJobToRun = true;
        while ((runningJobs.size() < maxJobs) &&
               (pendingJobs.size() > 0))
        {      
            SlurmSchedulerJob ssj = pendingJobs.removeFirst();
            schedulerLog.println("Running job\t" + ssj.getId() + "\t" +ssj.getCommand());            
            ssj.run();
            runningJobs.put(ssj.getId(), ssj);
            schedulerLog.println("SLURM id for job "+ssj.getId()+" is "+ssj.getSubmittedJobId());
        }
    }
    
    public synchronized int getFailedJobCount() {
        return failedJobs.size();
    }    
    
    public synchronized void markJobAsFailed(int i) {
        SlurmSchedulerJob ssj = allJobs.get(i);
        if (ssj != null) {
            if (runningJobs.containsKey(i)) {
                runningJobs.remove(i);
            }
            failedJobs.put(i, ssj);
        }
    }
    
    public synchronized void resubmitJobIfPossible(int i) {
        SlurmSchedulerJob ssj = allJobs.get(i);
        if (ssj != null) {
            ssj.tryResubmission();
        }
    }
    
    public MARTiLog getSchedulerLog() {
        return schedulerLog;
    }
    
    public MARTiLog getSlurmLog() {
        return slurmLog;
    }
}
