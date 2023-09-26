/*
 * Author: Richard M. Leggett
 * © Copyright 2020 Earlham Institute
 */
package uk.ac.earlham.marti.filter;

import uk.ac.earlham.marti.watcher.FileWatcher;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.logging.*;
import java.util.zip.*;
import uk.ac.earlham.marti.core.*;

/**
 * Read filter for a sample (e.g. barcode).
 * 
 * @author Richard M. Leggett
 */
public class ReadFilterSample {
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
    private boolean stopProcessingChunks = false;
    private int barcode = 0;
    private SampleMetaData metaData = null;
    private ReadStatistics readStatistics = null;
    
    public ReadFilterSample(MARTiEngineOptions o, FileWatcher f, FASTAQPairPendingList pfl, int bc) {
        options = o;
        fileWatcher = f;
        pendingPairList = pfl;
        barcode = bc;
        metaData = options.getSampleMetaData(barcode);
        if(options.isBlastingRead()) {
            writeFasta = true;
        }
        readStatistics = options.getReadStatistics();
    }

    private String generateFastaFastqChunkPath(String fastqPathname, int type) {
        File f = new File(fastqPathname);
        String fastqLeafname = f.getName();
        String chunkPathname = "";
        String suffix = "";
        String aqDir;
        int lastUnderscore = fastqLeafname.lastIndexOf('_');
        String newLeafname = "";
                
        if (type == TYPE_FASTA) {
            aqDir = options.getFastaDir();
            suffix = ".fasta";
        } else {
            aqDir = options.getFastqDir();
            suffix = ".fastq";
        } 
        
        if (lastUnderscore > 0) {
            newLeafname = fastqLeafname.substring(0, lastUnderscore) + "_filtered_" + chunkNumber + suffix;
        } else {
            int lastDot = fastqLeafname.lastIndexOf('.');
            if (lastDot > 0) {            
                newLeafname = fastqLeafname.substring(0, lastDot) + "_filtered_" + chunkNumber + suffix;
                options.getLog().println("Warning: FASTA/Q filename not as expected: "+fastqLeafname);
                options.getLog().println("Results unpredictable");                
                System.out.println("Warning: FASTA/Q filename not as expected: "+fastqLeafname);
            } else {
                newLeafname = fastqLeafname + "_filtered_" + chunkNumber + suffix;
                options.getLog().println("Error: FASTA/Q filename not as expected: "+fastqLeafname);                
                System.out.println("Error: FASTA/Q filename not as expected: "+fastqLeafname);                
                options.getLog().println("Results unpredictable");                
            }                    
        }
                           
        String chunksDir = aqDir + "_chunks";
        if (options.isBarcoded()) {
            int barcode = options.getBarcodeFromPath(fastqPathname);
            String bcDir;
            
            if (barcode < 10) {
                bcDir = chunksDir + File.separator + "barcode0" + barcode;
            } else {
                bcDir = chunksDir + File.separator + "barcode" + barcode;
            }
            
            File df = new File(bcDir);
            if (!df.exists()) {
                df.mkdir();
            }
            chunkPathname = bcDir + File.separator + newLeafname;            
        } else {
            chunkPathname = chunksDir + File.separator + newLeafname;
        }
                
        return chunkPathname;
    }

    
    private void checkForNewChunk(String fastqFilename) {
        if (readCountInChunk == 0) {
            chunkNumber++;
            chunkReadLengths = new ArrayList<Integer>();
            readsFilteredFromChunk = 0;
                        
            if (writeFastq) {                
                currentFastqChunkFilename = generateFastaFastqChunkPath(fastqFilename, TYPE_FASTQ);
                options.getLog().println("Creating FASTQ chunk " + currentFastqChunkFilename + ".tmp");
                try {
                    pwFastq = new PrintWriter(new FileWriter(currentFastqChunkFilename + ".tmp"));
                } catch (Exception e) {
                    System.out.println("Error opening "+currentFastqChunkFilename);
                    e.printStackTrace();
                }
            }
            
            if (writeFasta) {
                currentFastaChunkFilename = generateFastaFastqChunkPath(fastqFilename, TYPE_FASTA);
                options.getLog().println("Creating FASTA chunk " + currentFastaChunkFilename + ".tmp");
                try {
                    pwFasta = new PrintWriter(new FileWriter(currentFastaChunkFilename + ".tmp"));
                } catch (Exception e) {
                    System.out.println("Error opening "+currentFastaChunkFilename);
                    e.printStackTrace();
                }
            }
            
            options.getProgressReport().incrementChunkCount();
        }
    }
    
    
    private void writeFastq(String header, String seq, String plus, String qual) {
        if (pwFastq != null) {
            pwFastq.println(header);
            pwFastq.println(seq);
            pwFastq.println(plus);
            pwFastq.println(qual);
        }
    }
    
    private void writeFasta(String header, String seq) {
        if (pwFasta != null) {
            pwFasta.println(">"+header.substring(1));
            pwFasta.println(seq);
        }
    }
    
    private synchronized void endChunks() {
        try {
            if (pwFastq != null) {
                pwFastq.close();
                options.getLog().println("Removing .tmp from " + currentFastqChunkFilename + ".tmp");
                Path source = Paths.get(currentFastqChunkFilename + ".tmp");
                Path dest = Paths.get(currentFastqChunkFilename);
                try {
                    Files.move(source, dest, StandardCopyOption.REPLACE_EXISTING);
                } catch (Exception e) {
                    options.getLog().println("Move failed");
                    options.getLog().println("Source was "+source);
                    options.getLog().println("Destination was "+dest);
                }
            } else {
                options.getLog().println("No FASTQ to move");
            }

            if (pwFasta != null) {
                pwFasta.close();
                options.getLog().println("Removing .tmp from " + currentFastaChunkFilename + ".tmp");
                Path source = Paths.get(currentFastaChunkFilename + ".tmp");
                Path dest = Paths.get(currentFastaChunkFilename);
                try {
                    Files.move(source, dest, StandardCopyOption.REPLACE_EXISTING);
                } catch (Exception e) {
                    options.getLog().println("Move failed");
                    options.getLog().println("Source was "+source);
                    options.getLog().println("Destination was "+dest);
                }
            } else {
                options.getLog().println("No FASTA to move");
            }
            
            options.getLog().println("Moves complete.");

            metaData.registerFilteredFastaChunk(currentFastaChunkFilename, readCountInChunk);  
            metaData.writeSampleJSON(false);

            options.getLog().println("Now to add to pending pair list");
            pendingPairList.addPendingPair(currentFastaChunkFilename, currentFastqChunkFilename);
            
            double meanLength = getMeanReadLength(chunkReadLengths);
            options.getLog().println("Chunk mean read length = "+meanLength+" for "+currentFastaChunkFilename);
            options.getLog().println("Reads filtered from chunk = "+readsFilteredFromChunk);

            readCountInChunk = 0;
            
            if (options.getStopProcessingAfter() > 0) {
                if (writtenReadLengths.size() >= options.getStopProcessingAfter()) {
                    options.getLog().println("Got enough reads, so stopping ");

                    stopProcessingChunks = true;
                    options.setHasReachedReadOrTimeLimit();
                }
            }
            
            if (stopProcessingChunks == false) {
                if (options.timeUp()) {           
                    options.getLog().println("Time up, so stopping ");
                    stopProcessingChunks = true;
                    options.setHasReachedReadOrTimeLimit();
                }
            }
        } catch (Exception e) {
            System.out.println("Error in checkForEndChunk");
            e.printStackTrace();
        }
    }
    
    private double calculateMeanQuality(String qual) {
        long totalQ = 0;
        double totalProb = 0;              
        
        for (int i=0; i<qual.length(); i++) {
            int qScore = (int)qual.charAt(i) - 33;
            double prob = Math.pow(10.0, -((double)qScore / (double)10.0));
            
            totalQ += qScore;
            totalProb += prob;
        }

        double meanProb = totalProb / qual.length();        
        double meanQFromP = -10 * Math.log10(meanProb);        
        double meanQ = (double)totalQ / (double)qual.length();
        
        //System.out.println("meanQFromP "+meanQFromP + " meanQ "+meanQ);
                        
        return meanQFromP;
    }

    public void processFile(String fastqPathname) {
        boolean processThis = true;
        
        //if (options.runBlastCommand() == false) {
        //    System.out.println("-dontrunblast specified, so not filtering files");
        //    processThis = false;
        //}        
        
        if (stopProcessingChunks) {
            options.getLog().println("Got enough reads, so ignoring file "+fastqPathname);
            options.getLog().println("PendingPairList: processed=" + pendingPairList.getFilesProcessed() + " pending=" + pendingPairList.getPendingFileCount());
        }

        if (!stopProcessingChunks) {
            options.getLog().println("Processing file "+fastqPathname);
            System.out.println("Processing file "+fastqPathname);

            try {
                String header;
                BufferedReader br = null;
                InputStream fileStream = null;
                InputStream gzipStream = null;
                Reader decoder = null;
                
                if (fastqPathname.toLowerCase().endsWith(".fastq") ||
                    fastqPathname.toLowerCase().endsWith(".fq")) {                
                    br = new BufferedReader(new FileReader(fastqPathname));
                    if (br == null) {
                        options.getLog().printlnLogAndScreen("Couldn't open file "+fastqPathname);
                        System.exit(1);
                    }
                } else if ( fastqPathname.toLowerCase().endsWith(".fastq.gz") ||
                            fastqPathname.toLowerCase().endsWith(".fq.gz")) {
                    fileStream = new FileInputStream(fastqPathname);
                    if (fileStream != null) {
                        gzipStream = new GZIPInputStream(fileStream);
                        if (gzipStream != null) {
                            decoder = new InputStreamReader(gzipStream, "US-ASCII");
                            if (decoder != null) {
                                br = new BufferedReader(decoder);                      

                                if (br == null) {
                                    options.getLog().printlnLogAndScreen("Couldn't open file "+fastqPathname);
                                    System.exit(1);
                                }
                            } else {
                                options.getLog().printlnLogAndScreen("Couldn't open decoder for "+fastqPathname);
                                System.exit(1);
                            }
                        } else {
                            options.getLog().printlnLogAndScreen("Couldn't open GZIP stream for "+fastqPathname);
                            System.exit(1);
                        }
                    } else {
                        options.getLog().printlnLogAndScreen("Couldn't open filestream for "+fastqPathname);
                        System.exit(1);
                    }
                } else {
                    options.getLog().printlnLogAndScreen("Unknown suffix for "+fastqPathname);
                    System.exit(1);
                }
                
                if (br == null) {
                    options.getLog().printlnLogAndScreen("Ooops shouldn't have got to here without a .fastq or a .fq or a .fastq.gz or a .fq.gz");
                    System.exit(1);
                }
                                
                while (((header = br.readLine()) != null) && (stopProcessingChunks == false)) {
                    if (header.startsWith("@")) {
                        String seq = br.readLine();
                        String plus = br.readLine();
                        String qual = br.readLine();
                        boolean readPassedFilter = true;
                        String readID = header.split(" ")[0].substring(1);
                        
                        if (plus.equals("+")) {                        
                            double meanQ = calculateMeanQuality(qual);
                            allReadLengths.add(seq.length());

                            if ((meanQ >= options.getReadFilterMinQ()) &&
                                (seq.length() >= options.getReadFilterMinLength()))
                            {                        
                                checkForNewChunk(fastqPathname);

                                if (writeFastq) {
                                    writeFastq(header, seq, plus, qual);
                                }

                                if (writeFasta) {
                                    writeFasta(header, seq);
                                }

                                readCountInChunk++;
                                writtenReadLengths.add(seq.length());
                                chunkReadLengths.add(seq.length());
                                readStatistics.addReadLength(barcode, readID,seq.length(), true);

                                if (readCountInChunk == options.getReadsPerBlast()) {
                                    endChunks();
                                }                            
                            } else {
                                //if ((meanQ < options.getReadFilterMinQ()) && (seq.length() < options.getReadFilterMinLength())) {
                                //    options.getLog().println("Failed filter on Q and length");
                                //} else if (meanQ < options.getReadFilterMinQ()) {
                                //    options.getLog().println("Failed filter on just Q");
                                //} else if (seq.length() < options.getReadFilterMinLength()) {
                                //    options.getLog().println("Failed filter on just length");                            
                                //}
                                readsFilteredFromChunk++;
                                readsFilteredTotal++;
                                readPassedFilter = false;
                                readStatistics.addReadLength(barcode, readID,seq.length(), false);
                            }

                            metaData.registerNewInputRead(seq.length(), meanQ, readPassedFilter);
                            
                            numberOfReadsProcessed++;
                        } else {
                            System.out.println("ERROR: Badly formatted FASTQ entry in "+fastqPathname);
                        }
                    } else {
                        System.out.println("ERROR: Badly formatted FASTQ file: "+fastqPathname);
                    }
                }
                br.close();
                
                if (fastqPathname.toLowerCase().endsWith(".gz")) {
                    decoder.close();
                    gzipStream.close();
                    fileStream.close();
                }
                options.getProgressReport().markRawFileProcessed(fastqPathname);
            } catch (IOException e) {
                System.out.println("runConvertFastQ exception");
                e.printStackTrace();
            }
        }
    }                
      
//    public void run() {
//        while (!fileWatcher.timedOut() &&  (options.getStopFlag() == false)) {
//            FileWatcherItem fwi = null; 
//            
//            // Get next file to process
//            while ((fwi == null) && (!fileWatcher.timedOut()) && (options.getStopFlag() == false)) {
//                fwi = fileWatcher.getPendingFile();
//                if (fwi == null) {
//                    try {
//                        Thread.sleep(500);
//                    } catch (InterruptedException ex) {
//                        Logger.getLogger(BlastProcessRunnable.class.getName()).log(Level.SEVERE, null, ex);
//                    }
//                }
//            }
//            
//            if (fwi != null) {
//                String nextPathname = fwi.getPathname();
//                
//                if (nextPathname.toLowerCase().endsWith(".fastq")) {
//                    processFile(nextPathname);
//                }
//            }
//        }
//        
//        if (readCountInChunk > 0) {
//            endChunks();
//        }
//        
//        options.getLog().println("Total reads filtered "+readsFilteredTotal);
//                
//        options.getLog().println("Thread exiting");
//        double meanLength = getMeanReadLength(allReadLengths);
//        options.getLog().println("Mean read length (all) = "+meanLength);
//        meanLength = getMeanReadLength(writtenReadLengths);
//        options.getLog().println("Mean read length (written) = "+meanLength);
//    }
    
    private double getMeanReadLength(ArrayList<Integer> lengths) {
        double mean = 0;
        long total = 0;
        
        for (int i=0; i<lengths.size(); i++) {
            total += lengths.get(i);
        }
        
        mean = (double)total / (double)lengths.size();
        
        return mean;
    }
    
    public int getPendingCount() {
        return pendingPairList.getFilesToProcessCount();
    }
    
    public void finalise() {
        if (readCountInChunk > 0) {
            endChunks();
        }
    }
    
    public void outputStats() {         
        options.getLog().println("Barcode " + barcode + " Total reads filtered "+readsFilteredTotal);        
        double meanLength = getMeanReadLength(allReadLengths);
        options.getLog().println("Barcode " + barcode + " Mean read length (all) = "+meanLength);
        meanLength = getMeanReadLength(writtenReadLengths);
        options.getLog().println("Barcode " + barcode + " Mean read length (written) = "+meanLength);
    }
    
}
