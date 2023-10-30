/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.schedule;

import uk.ac.earlham.marti.core.MARTiLog;

/**
 *
 * @author leggettr
 */
public interface JobScheduler {
    public void manageQueue();
    public void setDontRunCommand();
    public void setMaxJobs(int m);
    public int getRunningJobCount();
    public int getPendingJobCount();
    public int getFailedJobCount();
    public int submitJob(String identifier, String[] commands, String logFilename, boolean submitJob);
    public boolean checkJobCompleted(int i);
    public boolean checkJobFailed(int i);
    public int getExitValue(int i);
    public void markJobAsFailed(int i);
    public void resubmitJobIfPossible(int i);
    public MARTiLog getSchedulerLog();
}
