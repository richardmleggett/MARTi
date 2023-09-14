/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.File;
import java.io.PrintWriter;
import java.util.Hashtable;
import java.util.Set;

/**
 * Class to keep track of overall progress from read filtering to parsing alignments.
 * 
 * @author Richard M. Leggett
 */
public class MARTiProgress {
    private MARTiEngineOptions options;
    private int rawFileCount = 0;
    private int chunkCount = 0;
    private int chunksBlasted = 0;
    private int chunksCentrifuged = 0;
    private int chunksParsed = 0;
    private int centrifugeChunksParsed = 0;
    private int metamapsCount = 0;
    private int analysisSubmitted = 0;
    private int analysisCompleted = 0;
    private Hashtable<String, Boolean> rawSequenceFiles = new Hashtable<String, Boolean>();    
        
    public MARTiProgress(MARTiEngineOptions o) {
        options = o;
    }
    
    public synchronized void incrementRawFileCount(String filename) {
        rawFileCount++;
        
        if (rawSequenceFiles.containsKey(filename)) {
            options.getLog().printlnLogAndScreen("Warning: already got file "+filename);
        } else {
            rawSequenceFiles.put(filename, false);
        }
    }
    
    public synchronized void markRawFileProcessed(String filename) {
        if (!rawSequenceFiles.containsKey(filename)) {
            options.getLog().printlnLogAndScreen("Warning: not seen file  being marked as completed - "+filename);            
        }
        rawSequenceFiles.put(filename, true);        
        writeProgressFile();
    }
    
    public synchronized void incrementChunkCount() {
        chunkCount++;
    }

    public synchronized void decrementChunkCount() {
        chunkCount--;
    }
    
    public synchronized void incrementChunksBlastedCount() { 
        chunksBlasted++;
    }
    
    public synchronized void incrementChunksCentrifugedCount() {
        chunksCentrifuged++;
    }
    
    public synchronized void incrementChunksParsedCount() {
        chunksParsed++;
    }
    
    public synchronized void incrementCentrifugeChunksParsedCount() {
        centrifugeChunksParsed++;
    }
    
    public synchronized void incrementAnalysisSubmitted() {
        analysisSubmitted++;
    }

    public synchronized void incrementAnalysisCompleted() {
        analysisCompleted++;
    }
    
    public synchronized String getProgressString() {
        String s = "Progress report RF=" + rawFileCount + 
                   " CC=" + chunkCount +
                   " CB=" + chunksBlasted + 
                   " CP=" + chunksParsed + 
                   " AS=" + analysisSubmitted + 
                   " AC=" + analysisCompleted + 
                   " CentC=" + chunksCentrifuged + 
                   " CentP=" + centrifugeChunksParsed ;
        
        
        return s;
    }
    
    public synchronized int getChunksBlasted() {
        return chunksBlasted;
    }
    
    public synchronized boolean chunksComplete() {
        int blastProcessCount = options.getBlastProcesses().size();
        int centrifugeProcessCount = options.getCentrifugeProcesses().size();       
        boolean complete = false;        
       
        if(blastProcessCount > 0) {
            if ((chunksParsed == chunksBlasted) &&
                (chunksBlasted == (chunkCount * blastProcessCount)) &&
                (analysisCompleted == analysisSubmitted)) {
                complete = true;
            } else {
                return false;
            }
        }
        
        if(centrifugeProcessCount > 0) {
            if( (chunksCentrifuged == (chunkCount * centrifugeProcessCount)) &&
                (chunksCentrifuged == centrifugeChunksParsed)) {
                complete = true;
            } else {
                return false;
            }
        }
        
        return complete;
    }
    
    public synchronized void writeProgressFile() {
        try {
            options.getLog().println("Writing progress file");
            PrintWriter pw = new PrintWriter(options.getSampleDirectory() + File.separator + "progress.info");
            pw.println("RawReads");
            Set<String> files = rawSequenceFiles.keySet();
            for (String filename : files) {
                boolean processed = rawSequenceFiles.get(filename);
                pw.println(filename + "\t" + (processed?"1":"0"));
            }
            pw.close();
        } catch (Exception e) {
            System.out.println("writeProgressFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }
    }
}
