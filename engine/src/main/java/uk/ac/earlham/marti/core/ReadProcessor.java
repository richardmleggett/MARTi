/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import uk.ac.earlham.marti.classify.ReadClassifier;
import uk.ac.earlham.marti.filter.ReadFilterRunnable;
import uk.ac.earlham.marti.watcher.FileWatcher;
import uk.ac.earlham.marti.blast.BlastProcess;
import uk.ac.earlham.marti.blast.BlastProcessRunnable;
import uk.ac.earlham.marti.centrifuge.CentrifugeProcessRunnable;
import uk.ac.earlham.marti.centrifuge.CentrifugeClassifier;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Main read processor class.
 * 
 * @author Richard M. Leggett
 */
public class ReadProcessor {
    private MARTiEngineOptions options;
    private ThreadPoolExecutor executor;
    private long lastCompleted = -1;
    private FileWatcher fw = null;
    private FASTAQPairPendingList pfl = null;
    private MARTiPendingTaskList ptl = null;
    private MARTiProgress progressReport;
    private ConcurrentLinkedQueue<String> fileCompressionQueue = null;

    /**
     * Constructor
     * @param o  program options
     * @param pr a ProgressReport object to keep track of progress
     */
    public ReadProcessor(MARTiEngineOptions o, MARTiProgress pr) {    
        options = o;
        fw = new FileWatcher(options, pr);
        pfl = new FASTAQPairPendingList(options);
        ptl = new MARTiPendingTaskList(options);
        fileCompressionQueue = new ConcurrentLinkedQueue<String>();

        progressReport = pr;

        //executor = Executors.newFixedThreadPool(options.getNumberOfThreads());
        //executor = new ThreadPoolExecutor(options.getNumberOfThreads(), options.getNumberOfThreads(), 10, TimeUnit.SECONDS, new LinkedBlockingQueue<Runnable>());
        executor = options.getThreadExecutor(); 
    }
    
    /**
     * Write progress of extraction
     */
    private void writeProgress() {
        long completed = executor.getCompletedTaskCount();
        long total = executor.getTaskCount();
        long e = 0;
        long s = MARTiEngineOptions.PROGRESS_WIDTH;
        
        if (total > 0) {
            e = MARTiEngineOptions.PROGRESS_WIDTH * completed / total;
            s = MARTiEngineOptions.PROGRESS_WIDTH - e;
        }
        
        if (completed != lastCompleted) {              
            System.out.print("\rExtraction [");
            for (int i=0; i<e; i++) {
                System.out.print("=");
            }
            for (int i=0; i<s; i++) {
                System.out.print(" ");
            }
            System.out.print("] " + completed +"/" +  total);
            lastCompleted = completed;
        }
    }
    
    /**
     * Process a directory and extract reads
     * @param inputDirName input directory name
     * @param outputDirName output directory name
     */
//    private void processDirectory(String inputDirName, boolean allowSubdir, boolean processThisDir, int pf) {        
//        options.getLog().println("Processing directory");
//        options.getLog().println("Input dir name: "+inputDirName);
//        options.getLog().println("allowSubdir: "+allowSubdir);        
//        options.getLog().println("processThisDir: "+processThisDir);
//                        
//        if (processThisDir) {            
//            fw.addWatchDir(inputDirName);
//        } else {
//            File inputDir = new File(inputDirName);
//            File[] listOfFiles = inputDir.listFiles();
//
//            if (listOfFiles == null) {
//                options.getLog().println("Directory "+inputDirName+" doesn't exist");
//            } else if (listOfFiles.length <= 0) {
//                options.getLog().println("Directory "+inputDirName+" empty");
//            } else {
//                for (File file : listOfFiles) {
//                    if (file.isDirectory() && allowSubdir) {
//                        processDirectory(inputDirName + File.separator + file.getName(),
//                                         false,
//                                         true,
//                                         pf);
//                    }
//                }           
//            }
//        }    
//    }

    private void addDirsForBlast() {
        if (options.isBarcoded()) {
            for (int b=1; b<=MARTiEngineOptions.MAX_BARCODES; b++) {
                if (options.getBarcodesList().isBarcodeActive(b)) {
                    fw.addWatchDir(options.getRawDataDir().getFastaPassBarcodePath(b));
                }
            }
        } else {
           fw.addWatchDir(options.getRawDataDir().getFastaPassPath());        
        }
    }
    
    private void addFastQDirs() {
        if (options.isBarcoded()) {
            for (int b=1; b<=MARTiEngineOptions.MAX_BARCODES; b++) {
                if (options.getBarcodesList().isBarcodeActive(b)) {
                    fw.addWatchDir(options.getRawDataDir().getFastqPassBarcodePath(b));
                }
            }
        } else {
           fw.addWatchDir(options.getRawDataDir().getFastqPassPath());        
        }
    }
    
    private void checkForMeganInitation() {
        ArrayList<BlastProcess> bp = options.getBlastProcesses();
        for (int i=0; i<bp.size(); i++) {
            BlastProcess blastProcess = bp.get(i);
            if (blastProcess.getRunMeganEvery() > 0) {
                options.getLog().println("Checking for MEGAN job initiation...");
                blastProcess.checkForMeganInitiation();
            }
        }                
    }
    
//    private boolean filterCompleted() {
//        boolean completed = false;
//        
//        if (pfl.getFilesToProcessCount() == 0) {
//            completed = true;
//        }
//        
//        return completed;
//    }
//    
//    private boolean blastsCompleted() {
//        boolean completed = false;
//
//        options.getBlastHandler().updateCompletedBlastJobList();
//        
//        if (options.getBlastHandler().getBlastCompletedCount() > 0) {
//            if (options.getBlastHandler().getBlastPendingCount() == 0) {
//                completed = true;
//            }            
//        }
//
//        return completed;
//    }
//    
//    private boolean classificationCompleted() {
//        ReadClassifier rc = options.getReadClassifier();
//        boolean completed = false;
//        
//        if (rc.getChunksProcessed() == pfl.getFilesToProcessCount()) {
//            completed = true;
//        } else {
//            options.getLog().println("rc="+rc.getChunksProcessed()+" pfl="+pfl.getFilesToProcessCount());
//        }
//        
//        return completed;
//    }
    
    private boolean checkForEnd() {
        boolean fEnd = true;
        
        // Used to end if scheduler has failed jobs. Now we try to continue...
        if (options.getJobScheduler().getFailedJobCount() > 0) {
            //options.getLog().printlnLogAndScreen("ERROR: failed jobs, so exiting early.");
            options.getLog().println("ERROR: failed jobs, but trying to continue.");
            //return true;
        }
        
        // We only exit if...
 
        // - we have given up looking for new reads (beacuse of time out or number reached)        
        if (!fw.timedOut()) {
            fEnd = false;
            options.getLog().println(MARTiLog.LOGLEVEL_CHECKFORENDTIMEOUT, "Not timed out");
            
            // Check for read limit reached     
            if (options.reachedReadOrTimeLimit() == true) {
                options.getLog().println("But read limit reached");
                fEnd = true;
            }
            
            if (options.getStopFlag() == true) {
                options.getLog().println("But stop flag set");
                fEnd = true;
            }
        }
        
        if (!progressReport.chunksComplete()) {
            options.getLog().println(MARTiLog.LOGLEVEL_PROGRESSREPORT, "ProgressReport not complete - " + progressReport.getProgressString());
            fEnd = false;
        } else {
            options.getLog().println(MARTiLog.LOGLEVEL_PROGRESSREPORT,"ProgressReport complete - " + progressReport.getProgressString());
        }
                
        // Check analysis jobs have all finished
        if (ptl.getPendingTaskCount() > 0) {
            options.getLog().println("Analysis jobs not complete " + ptl.getPendingTaskCount());
            fEnd = false;
        }
        
        // MEGAN jobs have all finished
        // Not necessary.
                
        // - There are no jobs in the scheduler queue (shouldn't be if above all true)
        if (options.getJobScheduler() != null) {
            if ((options.getJobScheduler().getPendingJobCount() > 0) || 
                (options.getJobScheduler().getRunningJobCount() > 0)) {
                fEnd = false;
                options.getLog().println(MARTiLog.LOGLEVEL_JOBSSTILLRUNNING, "Jobs still running");
            }
        } else {
            fEnd = false;
            options.getLog().println("Job scheduler not started");
        }
        
        return fEnd;
    }
    
    public void process() throws InterruptedException {   
        String baseDir = "";
        ReadClassifier rc = options.getReadClassifier();
        CentrifugeClassifier centrifugeClassifier = options.getCentrifugeClassifier();
        FileCompressorRunnable fileCompressor = null;
        boolean fileWatcherTimedOut = false;
        ReadFilterRunnable readFilter = new ReadFilterRunnable(options, fw, pfl);
        
        BlastProcessRunnable blastProcess = null;
        MARTiAnalysisRunnable analysisProcess = null;
        CentrifugeProcessRunnable centrifugeProcess = null;
        
        // Execute thread which checks for new reads to filter
        executor.execute(readFilter);
        if(options.getCompressBlastFiles()) {
            fileCompressor = new FileCompressorRunnable(options, fileCompressionQueue);
            rc.setFileCompressionQueue(fileCompressionQueue);
            // Execute thread which checks for files to compress and compresses them
            executor.execute(fileCompressor);
        }
        
        addFastQDirs();
        
        if(options.isBlastingRead()) {
             blastProcess = new BlastProcessRunnable(options, pfl);
             analysisProcess = new MARTiAnalysisRunnable(options, ptl, fileCompressionQueue);

            rc.setPendingTaskList(ptl);
        
            options.getLog().println("convertingFastQ: "+options.isConvertingFastQ());
            options.getLog().println("blastingReads: "+options.isBlastingRead());
                  
            // Execute thread which checks for new BLAST jobs to launch
            executor.execute(blastProcess);

            // Execute thread which checks for new local MARTi analysis jobs to launch
            executor.execute(analysisProcess);
        }
        if(options.isCentrifugingReads()) {
             centrifugeProcess = new CentrifugeProcessRunnable(options, pfl);
             options.getLog().println("centrifuging reads: "+options.isCentrifugingReads());
             executor.execute(centrifugeProcess);
        }
                        
        //for (int i=0; i<options.getNumberOfThreads(); i++) {
        //}        
        
        // Now keep scanning
        //while (!fw.timedOut() && (!options.getStopFlag())) {
        while (checkForEnd() == false) {
            // Manage the job scheduler queue
            if (options.getJobScheduler() != null) {
                options.getJobScheduler().manageQueue();
                
                // Also check for Megan initiation
                this.checkForMeganInitation();
            }
            
            // Check for new read files from the FileWatcher
            if (!fileWatcherTimedOut) {
                fw.scan();

                fileWatcherTimedOut = fw.timedOut();
                if (fw.timedOut()) {
                    System.out.println("Not found new files for "+options.getFileWatcherTimeout() + " seconds, so stopping...");
                }

                fw.writeProgress();
            }
                        
            // Check for reads to classify
            rc.checkForFilesToClassify();
            if(options.isCentrifugingReads()) {
                centrifugeClassifier.checkForFilesToClassify();
            }

            Thread.sleep(1000);            
        }           
        
        System.out.println("Stopping read filter thread...");
        readFilter.exitThread();
        if(options.isBlastingRead()) {
            System.out.println("Stopping BLAST threads...");
            blastProcess.exitThread();
            analysisProcess.exitThread();
        }
        if(options.isCentrifugingReads()) {
            System.out.println("Stopping centrifuge thread...");
            centrifugeProcess.exitThread();
        }
                                    
        // Write summaries
        System.out.println("Writing summaries...");
        rc.writeSummaries();

        // Rewrite all sample.json to indicate complete
        System.out.println("Writing SampleJSON...");
        options.writeAllSampleJSON(true);
        
        // Write stop sequencing flag
        System.out.println("Writing Stop Sequencing flag...");
        options.writeStopSequencingFlag();
        
        // Stop compression thread and compress any remaining files in the queue
        if(options.getCompressBlastFiles()) {         
            System.out.println("Stopping compression thread...");
            fileCompressor.exitThread();       
        }
                                
        // That's all - wait for all threads to finish
        System.out.println("Waiting for threads to finish...");
        executor.shutdown();
        System.out.println("Threads finished!");
 
        // Remvoe any intermediate files
        FileCleaner fc = new FileCleaner(options);
        fc.removeIntermediateFiles();        
        
        //writeProgress();
        System.out.println("");
        System.out.println("");
        System.out.println("DONE");
    }
    
//    public void oldProcess() throws InterruptedException {      
//        String baseDir = "";
//        ReadClassifier rc = options.getReadClassifier();
//        
//        options.getLog().println("convertingFastQ: "+options.isConvertingFastQ());
//        options.getLog().println("blastingReads: "+options.isBlastingRead());
//        
//        //if (options.isConvertingFastQ()) {
//            addDirsForConvertFastQ();
//        //} else if (options.isBlastingRead()) {
//            /* BLAST gets triggered after FASTQ conversion at the moment */
//            /* Need to code this eventually */            
//        //    addDirsForBlast();
//        //}
//                
//        executor.execute(new ReadFilterRunnable(options, fw, pfl));
//        
//        for (int i=0; i<options.getNumberOfThreads(); i++) {
//            executor.execute(new BlastProcessRunnable(options, pfl));
//        }
//        
//        // Now keep scanning
//        //while (!fw.timedOut() && (!options.getStopFlag())) {
//        while (!fw.timedOut() && (!options.getStopFlag())) {
//            if (options.getJobScheduler() != null) {
//                options.getJobScheduler().manageQueue();
//                this.checkForMeganInitation();
//            }
//            fw.scan();
//            rc.checkForFilesToClassify();
//            fw.writeProgress();
//            Thread.sleep(500);            
//        }
//        fw.writeProgress();
//        
//        if (fw.timedOut()) {
//            System.out.println("Not found new files for "+options.getFileWatcherTimeout() + " seconds, so stopping...");
//        }
//        
//        options.getPathogenAnalyser().runRunMetaMapsIfNecessary(true);
//        
//        options.stopProcessing();
//        
//        // Wait for any local jobs to finish
//        if (options.getJobScheduler() != null) {
//            System.out.println("Waiting for jobs to complete...");
//            while (options.getJobScheduler().getRunningJobCount() > 0) {
//                if (options.getJobScheduler() != null) {
//                    options.getJobScheduler().manageQueue();
//                    this.checkForMeganInitation();
//                }
//                rc.checkForFilesToClassify();
//                Thread.sleep(1000);
//            }
//            System.out.println("Completed.");
//        }
//        
//        options.getPathogenAnalyser().runRunMetaMapsIfNecessary(true);
//        
//        rc.writeSummaries();
//        options.writeStopSequencingFlag();
//                
//        // That's all - wait for all threads to finish
//        executor.shutdown();
//        
//        //writeProgress();
//        System.out.println("");
//        System.out.println("");
//        System.out.println("DONE");
//    }  
}


