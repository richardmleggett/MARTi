/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.schedule;

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
    public int submitJob(String[] commands, String logFilename, boolean submitJob);
    public boolean checkJobCompleted(int i);
    public int getExitValue(int i);
}
