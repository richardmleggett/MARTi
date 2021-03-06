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
    private int chunksParsed = 0;
    private int metamapsCount = 0;
    private int analysisSubmitted = 0;
    private int analysisCompleted = 0;
    private Hashtable<String, Boolean> rawSequenceFiles = new Hashtable<String, Boolean>();    
        
    public MARTiProgress(MARTiEngineOptions o) {
        options = o;
    }
    
    public void incrementRawFileCount(String filename) {
        rawFileCount++;
        
        if (rawSequenceFiles.containsKey(filename)) {
            options.getLog().printlnLogAndScreen("Warning: already got file "+filename);
        } else {
            rawSequenceFiles.put(filename, false);
        }
    }
    
    public void markRawFileProcessed(String filename) {
        if (!rawSequenceFiles.containsKey(filename)) {
            options.getLog().printlnLogAndScreen("Warning: not seen file  being marked as completed - "+filename);            
        }
        rawSequenceFiles.put(filename, true);        
        writeProgressFile();
    }
    
    public void incrementChunkCount() {
        chunkCount++;
    }

    public void decrementChunkCount() {
        chunkCount--;
    }
    
    public void incrementChunksBlastedCount() {
        chunksBlasted++;
    }
    
    public void incrementChunksParsedCount() {
        chunksParsed++;
    }
    
    public void incrementAnalysisSubmitted() {
        analysisSubmitted++;
    }

    public void incrementAnalysisCompleted() {
        analysisCompleted++;
    }
    
    public String getProgressString() {
        String s = "Progress report RF=" + rawFileCount + 
                   " CC=" + chunkCount +
                   " CB=" + chunksBlasted + 
                   " CP=" + chunksParsed + 
                   " AS=" + analysisSubmitted + 
                   " AC=" + analysisCompleted;
        
        return s;
    }
    
    public int getChunksBlasted() {
        return chunksBlasted;
    }
    
    public boolean chunksComplete() {
        int blastProcessCount = options.getBlastProcesses().size();
        
        boolean complete = false;        
       
        if ((chunksParsed == chunksBlasted) &&
            (chunksBlasted == (chunkCount * blastProcessCount)) &&
            (analysisCompleted == analysisSubmitted)) {
            complete = true;
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
