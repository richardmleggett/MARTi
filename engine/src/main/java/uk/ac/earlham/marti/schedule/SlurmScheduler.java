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
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.MARTiLog;

/**
 * Local job scheduler.
 * 
 * @author Richard M. Leggett
 */
public class SlurmScheduler implements JobScheduler {
    private static final int MAX_QUICK_JOB_ID = 100000;
    private Hashtable<Integer, SlurmSchedulerJob> allJobs = new Hashtable<Integer, SlurmSchedulerJob>();
    private LinkedList<SlurmSchedulerJob> pendingJobs = new LinkedList<SlurmSchedulerJob>();
    private Hashtable<Integer, SlurmSchedulerJob> runningJobs = new Hashtable<Integer, SlurmSchedulerJob>();
    private Hashtable<Integer, SlurmSchedulerJob> failedJobs = new Hashtable<Integer, SlurmSchedulerJob>();    
    private Hashtable<Integer, Integer> jobStatus = new Hashtable<Integer, Integer>();
    private MARTiLog schedulerLog = new MARTiLog();
    private MARTiEngineOptions options;
    private int internalJobId = 1; // Id used in this Java class, not by SLURM
    private int maxJobs = 1000;
    private boolean dontRunCommand = false;
    private long lastSlurmQuery = System.nanoTime();
    
    public SlurmScheduler(MARTiEngineOptions o) {
        options = o;
        schedulerLog.open(o.getLogsDir()+File.separator+"scheduler.txt");
    }    
    
    public void setDontRunCommand() {
        dontRunCommand = true;
    }

    public void setMaxJobs(int m) {
        maxJobs = m;
    }    
    
    public synchronized int submitJob(String[] commands, String logFilename, boolean submitJob) {
        if (MARTiEngineOptions.DEBUG_DONT_SUBMIT_JOB) {
            commands = new String[]{"echo","Hello"};
        }
        
        boolean dontRunIt = false;
        if ((dontRunCommand == true) || (submitJob == false)) {
            dontRunIt = true;
        }
                
        SlurmSchedulerJob j = new SlurmSchedulerJob("marti"+internalJobId, internalJobId, commands, logFilename, dontRunIt);
        pendingJobs.add(j);
        allJobs.put(internalJobId, j);
        jobStatus.put(internalJobId, SlurmSchedulerJob.STATE_PENDING);
        schedulerLog.println("Submitted job\t"+internalJobId+"\t"+j.getCommand());
        return internalJobId++;
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
    
    // See comment above
    public synchronized int getExitValue(int i) {
        if (jobStatus.containsKey(i)) {    
            return jobStatus.get(i);
        } else {
            options.getLog().printlnLogAndScreen("Warning: Attempt to check exit on unknown job id " + i);
        }
        return SlurmSchedulerJob.STATE_UNKNOWN;
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
        if (timeDiff < 1000) {
            return;
        }

        lastSlurmQuery = timeNow;

        // Check for any finished jobs
        Set<Integer> runningJobInternalIds = runningJobs.keySet();
        for (int id : runningJobInternalIds) {
            SlurmSchedulerJob ssj = runningJobs.get(id);
            ssj.queryJobState();
            int jState = ssj.getJobState();
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
                schedulerLog.println("Job "+ssj.getId()+" failed with code "+ssj.getExitValue()); 
                runningJobs.remove(id);
                failedJobs.put(id, ssj);
                options.getLog().printlnLogAndScreen("Failed SLURM job "+ssj.getId()+" - see scheduler log");
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
            ssj.run();
            runningJobs.put(ssj.getId(), ssj);
            schedulerLog.println("Running job\t" + ssj.getId() + "\t" +ssj.getCommand());            
        }
    }
}
