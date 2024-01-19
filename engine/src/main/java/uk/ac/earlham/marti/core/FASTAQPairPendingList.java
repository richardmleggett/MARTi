/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.util.LinkedList;

/**
 * Maintains a pending list of FASTA/Q files to be processed.
 * 
 * @author Richard M. Leggett
 */
public class FASTAQPairPendingList {
    private MARTiEngineOptions options;
    private int filesToProcess = 0;
    private int filesProcessed = 0;
    private long lastFileTime = System.nanoTime();
    private LinkedList<FASTAQPair> pendingBlastFiles = new LinkedList<FASTAQPair>();
    private LinkedList<FASTAQPair> pendingCentrifugeFiles = new LinkedList<FASTAQPair>();
    private LinkedList<FASTAQPair> pendingKraken2Files = new LinkedList<FASTAQPair>();

    public FASTAQPairPendingList(MARTiEngineOptions o) {
        options = o;
        lastFileTime = System.nanoTime();
    }    
    
    public synchronized void addPendingPair(String fasta, String fastq) {
        if(options.isBlastingRead()) {
            pendingBlastFiles.add(new FASTAQPair(fasta, fastq));
        }
        if(options.isCentrifugingReads()) {
            pendingCentrifugeFiles.add(new FASTAQPair(fasta, fastq));
        }
        if(options.isKraken2ingReads()) {
            pendingKraken2Files.add(new FASTAQPair(fasta, fastq));
        }
        filesToProcess++;
        lastFileTime = System.nanoTime();
        options.getLog().println("PendingPair list +1, files to process = "+filesToProcess);        
    }    

    public synchronized FASTAQPair getBlastPendingPair() {
        if (pendingBlastFiles.size() > 0) {
            filesProcessed++;
            options.getLog().println("PendingPair list -1, files processed = "+filesProcessed);        
            return pendingBlastFiles.removeFirst();
        } else {
            return null;
        }
    }
    
    public synchronized FASTAQPair getCentrifugePendingPair() {
        if (pendingCentrifugeFiles.size() > 0) {
            filesProcessed++;
            options.getLog().println("PendingPair list -1, files processed = "+filesProcessed);        
            return pendingCentrifugeFiles.removeFirst();
        } else {
            return null;
        }
    }
    
     public synchronized FASTAQPair getKraken2PendingPair() {
        if (pendingKraken2Files.size() > 0) {
            filesProcessed++;
            options.getLog().println("PendingPair list -1, files processed = "+filesProcessed);        
            return pendingKraken2Files.removeFirst();
        } else {
            return null;
        }
    }

    public synchronized int getPendingFileCount() {
        return pendingBlastFiles.size();
    }
    
    public synchronized int getFilesProcessed() {
        return filesProcessed;
    }
    
    public synchronized boolean timedOut() {             
        long timeSince = System.nanoTime() - lastFileTime;
        long secsSinceLast = timeSince / 1000000000;
        options.getLog().println("PendingFileList not seen file for " + (secsSinceLast) + "s");
                               
        if (pendingBlastFiles.size() == 0) {        
            // + 5 allows for the FileWatcher to timeout and then for the last pending pair to be recognised
            if (secsSinceLast >= (options.getFileWatcherTimeout() + 5)) {
                return true;
            }
        }
        
        return false;               
    }    
    
    public int getFilesToProcessCount() {
        return filesToProcess;
    }
}
