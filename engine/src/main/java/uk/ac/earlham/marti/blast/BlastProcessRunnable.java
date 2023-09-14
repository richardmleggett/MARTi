/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.blast;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.EnumSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import uk.ac.earlham.marti.core.FASTAQPair;
import uk.ac.earlham.marti.core.FASTAQPairPendingList;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.ProcessLogger;

/**
 * Enable multi-threading of BLAST execution
 * 
 * @author Richard M. Leggett
 */
public class BlastProcessRunnable implements Runnable {
    private MARTiEngineOptions options;
    //private FileWatcher fileWatcher = null;
    private FASTAQPairPendingList pendingFileList = null;
    private boolean isNewStyleDir;
    private int numberOfReadsProcessed = 0;
    private boolean keepRunning = true;
    
    //public BlastProcessRunnable(MARTiEngineOptions o, FileWatcher f) {
    //    options = o;
    //    fileWatcher = f;
    //}      
    
    public BlastProcessRunnable(MARTiEngineOptions o, FASTAQPairPendingList pfl) {
        options = o;
        pendingFileList = pfl;
    }      


    private void runCommandLocal(String command, String outPath) {
        ProcessLogger pl = new ProcessLogger();
        
        // outPath only non-null if aligner will only write to screen (yes, BWA, I'm talking about you)
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
    
    private String generateFastaPathFromFastq(String fastqPathname) {
        File f = new File(fastqPathname);
        String fastqLeafname = f.getName();
        String fastaPathname = "";
            
        if (options.isBarcoded()) {
            if (fastqLeafname.contains("barcode")) {
                String bcString = fastqLeafname.substring(fastqLeafname.indexOf("barcode")+7, fastqLeafname.indexOf("barcode")+9);
                int barcode = Integer.parseInt(bcString);
                String dir = options.getFastaDir() + "_chunks/barcode" + bcString;
                File df = new File(dir);
                if (!df.exists()) {
                    df.mkdir();
                }
                fastaPathname = dir + "/" + fastqLeafname.substring(0,fastqLeafname.lastIndexOf('.'))+".fasta";
            }
        } else {
            fastaPathname = options.getFastaDir() + "_chunks/"+fastqLeafname.substring(0,fastqLeafname.lastIndexOf('.'))+".fasta";
        }
                
        return fastaPathname;
    }
    
//    public void runConvertFastQ(String fastqPathname) {
//        String fastaPathname = generateFastaPathFromFastq(fastqPathname);
//        //File f = new File(fastqPathname);
//        //String fastqLeafname = f.getName();
//        //String fastaPathname = options.getFastaDir() + "_chunks/"+fastqLeafname.substring(0,fastqLeafname.lastIndexOf('.'))+".fasta";
//        options.getLog().println("Converting "+fastqPathname);        
//        options.getLog().println("        to "+fastaPathname);
//        try {
//            String header;
//            PrintWriter pw = new PrintWriter(new FileWriter(fastaPathname));        
//            BufferedReader br = new BufferedReader(new FileReader(fastqPathname));
//            while ((header = br.readLine()) != null) {
//                if (header.startsWith("@")) {
//                    String seq = br.readLine();
//                    String plus = br.readLine();
//                    String qual = br.readLine();
//                    if (plus.equals("+")) {
//                        pw.println(">"+header.substring(1));
//                        pw.println(seq);
//                        numberOfReadsProcessed++;
//                    } else {
//                        System.out.println("ERROR: Badly formatted FASTQ entry in "+fastqPathname);
//                    }
//                } else {
//                    System.out.println("ERROR: Badly formatted FASTQ file: "+fastqPathname);
//                }
//            }
//            br.close();
//            pw.close();
//        } catch (IOException e) {
//            System.out.println("runConvertFastQ exception");
//            e.printStackTrace();
//        }
//        runBlast(fastaPathname);        
//    }
            
    private void runBlast(String fastaPathname) {
        options.getLog().println("Adding read chunk "+fastaPathname);        
        options.getBlastHandler().addReadChunk(fastaPathname);
        
        if (options.getStopProcessingAfter() > 0) {
            if (numberOfReadsProcessed > options.getStopProcessingAfter()) {
                options.getLog().println("Note: Number of FASTQ reads processed ("+numberOfReadsProcessed+") exceeeds limit ("+options.getStopProcessingAfter()+"). Sending STOP command.");
                options.stopProcessing();
            }
        }
    }
    
    public void run() {
        //while (!fileWatcher.timedOut() &&  (options.getStopFlag() == false)) {
        //while (!pendingFileList.timedOut() && (options.getStopFlag() == false)) {
        while (keepRunning) {
            //FileWatcherItem fwi = null;
            FASTAQPair fa = null;
            String fastaqPathname = null;
            String alignmentPathname = null;
            String parsedPathname = null;
            String alignmentLogPathname = null;
            
            // Get next file to process
            //while ((fwi == null) && (!fileWatcher.timedOut()) && (options.getStopFlag() == false)) {
            //while ((fa == null) && (!pendingFileList.timedOut()) && (options.getStopFlag() == false)) {
            while ((fa == null) && (keepRunning)) {
                fa = pendingFileList.getBlastPendingPair();
                if (fa == null) {
                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException ex) {
                        Logger.getLogger(BlastProcessRunnable.class.getName()).log(Level.SEVERE, null, ex);
                    }
                }
            }
            
            if (fa != null) {
                //String nextPathname = fwi.getPathname();
                // Check valid filename
                //if (options.isConvertingFastQ()) {
                //    if (nextPathname.toLowerCase().endsWith(".fastq")) {
                //        runConvertFastQ(nextPathname);
                //    }
                //} else if (options.isBlastingRead()) {

                //if (nextPathname.toLowerCase().endsWith(".fasta")) {
                //    runBlast(nextPathname);
                //}                

                String pendingFile = fa.getFasta();                
                if (pendingFile.toLowerCase().endsWith(".fasta")) {
                    runBlast(pendingFile);
                } else {               
                    System.out.println("Unexpected filename extension in PendingFileList: "+pendingFile);
                }
                
                //}
            }
        }
        
        options.getLog().println("BlastProcessRunnable thread ended");
    }
}
