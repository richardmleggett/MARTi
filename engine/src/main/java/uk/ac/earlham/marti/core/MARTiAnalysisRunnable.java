/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import uk.ac.earlham.marti.blast.BlastProcessRunnable;
import uk.ac.earlham.marti.amr.AMRAnalysisTask;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Thread for processing local (MARTi) analysis tasks
 * 
 * @author Richard M. Leggett
 */
public class MARTiAnalysisRunnable  implements Runnable {
    private MARTiEngineOptions options = null;
    private MARTiPendingTaskList pendingTasksList = null;
    private boolean keepRunning = true;
    
    public MARTiAnalysisRunnable(MARTiEngineOptions o, MARTiPendingTaskList ptl) {
        options = o;
        pendingTasksList = ptl;
    }
    
    public void runAMRTask(AMRAnalysisTask aat) {
        options.getResults().getAMRResults(aat.getBarcode()).analyseChunk(aat);
        options.getProgressReport().incrementAnalysisCompleted();
    }

    public void run() {
        //while (options.getStopFlag() == false) {
        while (keepRunning) {
            MARTiAnalysisTask mat = null; 
            
            // Get next file to process
            while ((mat == null) && (options.getStopFlag() == false)) {
                mat = pendingTasksList.getPendingTask();
                if (mat != null) {
                    switch(mat.getTaskDescriptor()) {
                        case "AMRAnalysis":
                            options.getLog().println("Got AMR analysis task");
                            runAMRTask((AMRAnalysisTask)mat);
                            break;
                        default:
                            System.out.println("Unknown analysis task "+ mat.getTaskDescriptor());
                            System.exit(1);
                            break;
                    }                    
                } else  {
                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException ex) {
                        Logger.getLogger(BlastProcessRunnable.class.getName()).log(Level.SEVERE, null, ex);
                    }
                }
            }
            
            if (mat != null) {
                // Process analysis task
            }
        }
        
        options.getLog().println("MARTiAnalysisRunnable finalising");        
        options.getLog().println("Thread exiting");
    }

    public void exitThread() {
        keepRunning = false;
    }
}
