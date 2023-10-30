/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.filter;

import uk.ac.earlham.marti.watcher.FileWatcherItem;
import uk.ac.earlham.marti.watcher.FileWatcher;
import uk.ac.earlham.marti.blast.BlastProcessRunnable;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.logging.Level;
import java.util.logging.Logger;
import uk.ac.earlham.marti.core.FASTAQPairPendingList;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * The read filter thread class.
 * 
 * @author Richard M. Leggett
 */
public class ReadFilterRunnable implements Runnable {
    private final static int MAX_BARCODES = MARTiEngineOptions.MAX_BARCODES;
    private final static int TYPE_FASTQ = 1;
    private final static int TYPE_FASTA = 2;
    private MARTiEngineOptions options;
    private FileWatcher fileWatcher;
    private boolean isNewStyleDir;
    private int numberOfReadsProcessed = 0;
    private boolean writeFastq = true;
    private boolean writeFasta = true;
    PrintWriter pwFastq = null;
    PrintWriter pwFasta = null;
    private int chunkNumber = -1;
    private int readCountInChunk = 0;
    private String currentFastqChunkFilename = null;
    private String currentFastaChunkFilename = null;
    private ArrayList<Integer> allReadLengths = new ArrayList<Integer>();
    private ArrayList<Integer> writtenReadLengths = new ArrayList<Integer>();
    private ArrayList<Integer> chunkReadLengths = new ArrayList<Integer>();
    private int readsFilteredFromChunk = 0;
    private int readsFilteredTotal = 0;
    private FASTAQPairPendingList pendingPairList = null;
    private ReadFilterSample[] samples = new ReadFilterSample[MAX_BARCODES+1];
    private boolean keepRunning = true;
    
    public ReadFilterRunnable(MARTiEngineOptions o, FileWatcher f, FASTAQPairPendingList pfl) {
        options = o;
        fileWatcher = f;
        pendingPairList = pfl;
        
        for (int i=0; i<=MAX_BARCODES; i++) {
            samples[i] = null;
        }
    }
    
    public void exitThread() {
        keepRunning = false;
    }    
//
//    private String generateFastaFastqChunkPath(String fastqPathname, int type) {
//        File f = new File(fastqPathname);
//        String fastqLeafname = f.getName();
//        String chunkPathname = "";
//        String suffix = "";
//        String aqDir;
//        
//        if (type == TYPE_FASTA) {
//            aqDir = options.getFastaDir();
//            suffix = ".fasta";
//        } else {
//            aqDir = options.getFastqDir();
//            suffix = ".fastq";
//        }                     
//            
//        if (options.isBarcoded()) {
//            if (fastqLeafname.contains("barcode")) {
//                String bcString = fastqLeafname.substring(fastqLeafname.indexOf("barcode")+7, fastqLeafname.indexOf("barcode")+9);
//                int barcode = Integer.parseInt(bcString);
//                String dir = aqDir + "_chunks/barcode" + bcString;
//                File df = new File(dir);
//                if (!df.exists()) {
//                    df.mkdir();
//                }
//                chunkPathname = dir + "/" + fastqLeafname.substring(0,fastqLeafname.lastIndexOf('_')) + "_filtered_" + chunkNumber + suffix;
//            }
//        } else {
//            chunkPathname = aqDir + "_chunks/"+fastqLeafname.substring(0,fastqLeafname.lastIndexOf('_')) + "_filtered_" + chunkNumber + suffix;
//        }
//                
//        return chunkPathname;
//    }
//
//    
//    private void checkForNewChunk(String fastqFilename) {
//        if (readCountInChunk == 0) {
//            chunkNumber++;
//            chunkReadLengths = new ArrayList<Integer>();
//            readsFilteredFromChunk = 0;
//                        
//            if (writeFastq) {                
//                currentFastqChunkFilename = generateFastaFastqChunkPath(fastqFilename, TYPE_FASTQ);
//                options.getLog().println("Creating FASTQ chunk " + currentFastqChunkFilename + ".tmp");
//                try {
//                    pwFastq = new PrintWriter(new FileWriter(currentFastqChunkFilename + ".tmp"));
//                } catch (Exception e) {
//                    System.out.println("Error opening "+currentFastqChunkFilename);
//                    e.printStackTrace();
//                }
//            }
//            
//            if (writeFasta) {
//                currentFastaChunkFilename = generateFastaFastqChunkPath(fastqFilename, TYPE_FASTA);
//                options.getLog().println("Creating FASTA chunk " + currentFastaChunkFilename + ".tmp");
//                try {
//                    pwFasta = new PrintWriter(new FileWriter(currentFastaChunkFilename + ".tmp"));
//                } catch (Exception e) {
//                    System.out.println("Error opening "+currentFastaChunkFilename);
//                    e.printStackTrace();
//                }
//            }
//            
//            options.getProgressReport().incrementChunkCount();
//        }
//    }
//    
//    
//    private void writeFastq(String header, String seq, String plus, String qual) {
//        if (pwFastq != null) {
//            pwFastq.print(header);
//            pwFastq.print(seq);
//            pwFastq.print(plus);
//            pwFastq.print(qual);
//        }
//    }
//    
//    private void writeFasta(String header, String seq) {
//        if (pwFasta != null) {
//            pwFasta.println(">"+header.substring(1));
//            pwFasta.println(seq);
//        }
//    }
//    
//    private void endChunks() {
//        try {
//            if (pwFastq != null) {
//                pwFastq.close();
//                options.getLog().println("Removing .tmp from " + currentFastqChunkFilename + ".tmp");
//                Path source = Paths.get(currentFastqChunkFilename + ".tmp");
//                Path dest = Paths.get(currentFastqChunkFilename);
//                Files.move(source, dest, StandardCopyOption.REPLACE_EXISTING);
//            }
//
//            if (pwFasta != null) {
//                pwFasta.close();
//                options.getLog().println("Removing .tmp from " + currentFastaChunkFilename + ".tmp");
//                Path source = Paths.get(currentFastaChunkFilename + ".tmp");
//                Path dest = Paths.get(currentFastaChunkFilename);
//                Files.move(source, dest, StandardCopyOption.REPLACE_EXISTING);
//                
//            }                  
//            
//            pendingPairList.addPendingPair(currentFastaChunkFilename, currentFastqChunkFilename);
//            
//            double meanLength = getMeanReadLength(chunkReadLengths);
//            options.getLog().println("Chunk mean read length = "+meanLength);
//            options.getLog().println("Reads filtered from chunk = "+readsFilteredFromChunk);
//
//            readCountInChunk = 0;
//        } catch (Exception e) {
//            System.out.println("Error in checkForEndChunk");
//            e.printStackTrace();
//        }
//    }
//    
//    private double calculateMeanQuality(String qual) {
//        long totalQ = 0;
//        double totalProb = 0;              
//        
//        for (int i=0; i<qual.length(); i++) {
//            int qScore = (int)qual.charAt(i) - 33;
//            double prob = Math.pow(10.0, -((double)qScore / (double)10.0));
//            
//            totalQ += qScore;
//            totalProb += prob;
//        }
//
//        double meanProb = totalProb / qual.length();        
//        double meanQFromP = -10 * Math.log10(meanProb);        
//        double meanQ = (double)totalQ / (double)qual.length();
//        
//        //System.out.println("meanQFromP "+meanQFromP + " meanQ "+meanQ);
//                        
//        return meanQFromP;
//    }

    private void processFile(String fastqPathname) {
        options.getLog().printlnLogAndScreen("Processing file (RFR) "+fastqPathname);

        int barcode = options.getBarcodeFromPath(fastqPathname);
        if (samples[barcode] == null) {
            samples[barcode] = new ReadFilterSample(options, fileWatcher, pendingPairList, barcode);
        }
        
        samples[barcode].processFile(fastqPathname);
        
//        try {
//            String header;
//            BufferedReader br = new BufferedReader(new FileReader(fastqPathname));
//            while ((header = br.readLine()) != null) {
//                if (header.startsWith("@")) {
//                    String seq = br.readLine();
//                    String plus = br.readLine();
//                    String qual = br.readLine();
//
//                                        
//                    if (plus.equals("+")) {                        
//                        double meanQ = calculateMeanQuality(qual);
//                        allReadLengths.add(seq.length());
//                        
//                        if ((meanQ >= options.getReadFilterMinQ()) &&
//                            (seq.length() >= options.getReadFilterMinLength()))
//                        {                        
//                            checkForNewChunk(fastqPathname);
//
//                            if (writeFastq) {
//                                writeFastq(header, seq, plus, qual);
//                            }
//
//                            if (writeFasta) {
//                                writeFasta(header, seq);
//                            }
//
//                            readCountInChunk++;
//                            writtenReadLengths.add(seq.length());
//                            chunkReadLengths.add(seq.length());
//
//                            if (readCountInChunk == options.getReadsPerBlast()) {
//                                endChunks();
//                            }                            
//                        } else {
//                            //if ((meanQ < options.getReadFilterMinQ()) && (seq.length() < options.getReadFilterMinLength())) {
//                            //    options.getLog().println("Failed filter on Q and length");
//                            //} else if (meanQ < options.getReadFilterMinQ()) {
//                            //    options.getLog().println("Failed filter on just Q");
//                            //} else if (seq.length() < options.getReadFilterMinLength()) {
//                            //    options.getLog().println("Failed filter on just length");                            
//                            //}
//                            readsFilteredFromChunk++;
//                            readsFilteredTotal++;
//                        }
//
//                        numberOfReadsProcessed++;
//                    } else {
//                        System.out.println("ERROR: Badly formatted FASTQ entry in "+fastqPathname);
//                    }
//                } else {
//                    System.out.println("ERROR: Badly formatted FASTQ file: "+fastqPathname);
//                }
//            }
//            br.close();
//        } catch (IOException e) {
//            System.out.println("runConvertFastQ exception");
//            e.printStackTrace();
//        }
    }                
    
    private boolean checkValidExtension(String filename) {
        boolean valid = false;
        if ((filename.toLowerCase().endsWith(".fastq")) || (filename.toLowerCase().endsWith(".fq"))) {
            valid = true;
        } else if ((filename.toLowerCase().endsWith(".fastq.gz")) || (filename.toLowerCase().endsWith(".fq.gz"))) {
            // We process .fastq.gz only if there isn't a .fastq file with the same prefix
            String withoutGz = filename.substring(0, filename.length()-3);
            File f = new File(withoutGz);
            if (!f.exists()) {
                valid = true;
                System.out.println("Processing "+filename+" because "+withoutGz+" doesn't exist");
            } else {
                System.out.println("Not processing "+filename+" because "+withoutGz+" exists");
            }
        }
        return valid;
    }
    
    private void processPendingFiles() {
        FileWatcherItem fwi = null;
        
        options.getLog().println("Checking for any final pending files...");
        
        do {
            fwi = fileWatcher.getPendingFile();
    
            if (fwi != null) {
                String nextPathname = fwi.getPathname();

                if (checkValidExtension(nextPathname)) {
                    processFile(nextPathname);
                }
            }
        } while (fwi != null);
    }
      
    public void run() {
        while (!fileWatcher.timedOut() &&  (options.getStopFlag() == false)) {
            FileWatcherItem fwi = null; 
            
            // Get next file to process
            while ((fwi == null) && (!fileWatcher.timedOut()) && (options.getStopFlag() == false)) {
                fwi = fileWatcher.getPendingFile();
                if (fwi == null) {
                    try {
                        Thread.sleep(500);
                    } catch (InterruptedException ex) {
                        Logger.getLogger(ReadFilterRunnable.class.getName()).log(Level.SEVERE, null, ex);
                    }
                }
            }
            
            if (fwi != null) {
                String nextPathname = fwi.getPathname();
                
                if (checkValidExtension(nextPathname)) {
                    processFile(nextPathname);
                }
            }
        }
        
        options.getLog().println("ReadFilterRunnable finalising");
        for (int i=0; i<MAX_BARCODES; i++) {
            if (samples[i] != null) {
                samples[i].finalise();
            }            
        }
        // The above finalisation (closing of chunks) might have created more pending files
        processPendingFiles();
        
//        if (readCountInChunk > 0) {
//            endChunks();
//        }
        
        options.getLog().println("ReadFilterRunnable thread exiting");

        outputStats();
    }
    
    private void outputStats() {
        for (int i=0; i<MAX_BARCODES; i++) {
            if (samples[i] != null) {
                samples[i].outputStats();
            }
        }
        
//        options.getLog().println("Total reads filtered "+readsFilteredTotal);
//        
//        options.getLog().println("Thread exiting");
//        double meanLength = getMeanReadLength(allReadLengths);
//        options.getLog().println("Mean read length (all) = "+meanLength);
//        meanLength = getMeanReadLength(writtenReadLengths);
//        options.getLog().println("Mean read length (written) = "+meanLength);
    }
    
//    private double getMeanReadLength(ArrayList<Integer> lengths) {
//        double mean = 0;
//        long total = 0;
//        
//        for (int i=0; i<lengths.size(); i++) {
//            total += lengths.get(i);
//        }
//        
//        mean = (double)total / (double)lengths.size();
//        
//        return mean;
//    }
//    
//    public int getPendingCount() {
//        return pendingPairList.getFilesToProcessCount();
//    }
    
}
