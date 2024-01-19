/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.kraken2;

import java.util.logging.Level;
import java.util.logging.Logger;
import uk.ac.earlham.marti.core.FASTAQPair;
import uk.ac.earlham.marti.core.FASTAQPairPendingList;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.ProcessLogger;

/**
 *
 * @author martins
 */
public class Kraken2ProcessRunnable implements Runnable {
    private MARTiEngineOptions options;
    private FASTAQPairPendingList pendingFileList = null;
    private boolean keepRunning = true;
    private int numberOfReadsProcessed = 0;
    
    public Kraken2ProcessRunnable(MARTiEngineOptions o, FASTAQPairPendingList pfl) {
        options = o;
        pendingFileList = pfl;
    }
    
    private void runCommandLocal(String command, String outPath) {
        ProcessLogger pl = new ProcessLogger();
        
        // outPath only non-null if aligner will only write to screen
        if (outPath != null) {
            pl.setWriteFormat(false, true, false);
            pl.runAndLogCommand(command, outPath, false);
        } else {
            pl.runCommand(command);
        }
    }    
    
    public void exitThread() {
        keepRunning = false;
    }
    
            
    private void runKraken2(String fastqPathname) {       
       options.getKraken2Handler().addReadChunk(fastqPathname); 
        if (options.getStopProcessingAfter() > 0) {
            if (numberOfReadsProcessed > options.getStopProcessingAfter()) {
                options.getLog().println("Note: Number of FASTQ reads processed ("+numberOfReadsProcessed+") exceeeds limit ("+options.getStopProcessingAfter()+"). Sending STOP command.");
                options.stopProcessing();
            }
        }

    }
    
    public void run() {
        while (keepRunning) {
            FASTAQPair fa = null;
            // Get next file to process
           while ((fa == null) && (keepRunning)) {
                fa = pendingFileList.getKraken2PendingPair();
                if (fa == null) {
                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException ex) {
                        Logger.getLogger(Kraken2ProcessRunnable.class.getName()).log(Level.SEVERE, null, ex);
                    }
                }
            }   
            if (fa != null) {            
                String pendingFile = fa.getFastq();
                runKraken2(pendingFile);
            }         
        }
        
        options.getLog().println("Kraken2ProcessRunnable thread ended");
    }
    
}
