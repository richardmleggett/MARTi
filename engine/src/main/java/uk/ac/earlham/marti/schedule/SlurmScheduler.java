/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.schedule;

import com.sun.management.OperatingSystemMXBean;
import java.lang.management.ManagementFactory;
import java.io.File;
import java.util.LinkedList;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.MARTiLog;

/**
 * Local job scheduler.
 * 
 * @author Richard M. Leggett
 */
public class SlurmScheduler implements JobScheduler {
    private static final int MAX_QUICK_JOB_ID = 100000;
    private LinkedList<SimpleJobSchedulerJob> pendingJobs = new LinkedList<SimpleJobSchedulerJob>();
    private LinkedList<SimpleJobSchedulerJob> runningJobs = new LinkedList<SimpleJobSchedulerJob>();
    //private LinkedList<SimpleJobSchedulerJob> finishedJobs = new LinkedList<SimpleJobSchedulerJob>();
    private MARTiLog schedulerLog = new MARTiLog();
    private MARTiEngineOptions options;
    private int jobId = 1;
    private int maxJobs = 1000;
    private boolean dontRunCommand = false;
    private boolean[] quickCompletedList = new boolean[MAX_QUICK_JOB_ID];
    public int[] exitValues = new int[MAX_QUICK_JOB_ID];
    long lastLoadReport = System.nanoTime() / 1000000; // ms
    
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
                
        SimpleJobSchedulerJob j = new SimpleJobSchedulerJob(jobId, commands, logFilename, dontRunIt);
        pendingJobs.add(j);
        schedulerLog.println("Submitted job\t"+jobId+"\t"+j.getCommand());
        return jobId++;
    }

    // NEEDS WRITING
    public synchronized boolean checkJobCompleted(int i) {
        if (i < MAX_QUICK_JOB_ID) {
            return quickCompletedList[i];
        } else {
            return false;
        }
    }
    
    // NEEDS WRITING
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
    
    // NEEDS WRITING
    public synchronized void manageQueue() {
        // Check state of jobs, but only every minute or two
    }
}
