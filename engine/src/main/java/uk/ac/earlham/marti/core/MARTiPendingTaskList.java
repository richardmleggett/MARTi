/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.util.LinkedList;

/**
 * Maintains list of pending analysis tasks
 * 
 * @author Richard M. Leggett
 */
public class MARTiPendingTaskList {
    private MARTiEngineOptions options;
    private int tasksToProcess = 0;
    private int tasksProcessed = 0;
    private long lastFileTime = System.nanoTime();
    private LinkedList<MARTiAnalysisTask> pendingTasks = new LinkedList<MARTiAnalysisTask>();

    public MARTiPendingTaskList(MARTiEngineOptions o) {
        options = o;
        lastFileTime = System.nanoTime();
    }    
    
    public synchronized void addPendingTask(MARTiAnalysisTask task) {
        pendingTasks.add(task);
        tasksToProcess++;
        lastFileTime = System.nanoTime();
        options.getLog().println("MARTiPendingTaskList list +1, tasks to process = "+tasksToProcess);        
    }    

    public synchronized MARTiAnalysisTask getPendingTask() {
        if (pendingTasks.size() > 0) {
            tasksProcessed++;
            options.getLog().println("MARTiPendingTaskList list -1, files processed = "+tasksProcessed);        
            return pendingTasks.removeFirst();
        } else {
            return null;
        }
    }

    public synchronized int getPendingTaskCount() {
        return pendingTasks.size();
    }
    
    public synchronized int getTasksProcessed() {
        return tasksProcessed;
    }
    
    public synchronized boolean timedOut() {             
        long timeSince = System.nanoTime() - lastFileTime;
        long secsSinceLast = timeSince / 1000000000;
        options.getLog().println("MARTiPendingTaskList not seen file for " + (secsSinceLast) + "s");
                               
        if (pendingTasks.size() == 0) {        
            // + 5 allows for the FileWatcher to timeout and then for the last pending pair to be recognised
            if (secsSinceLast >= (options.getFileWatcherTimeout() + 5)) {
                return true;
            }
        }
        
        return false;               
    }    
    
    public int getTasksToProcessCount() {
        return tasksToProcess;
    }
}
