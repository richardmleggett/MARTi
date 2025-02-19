/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.GregorianCalendar;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
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
    private int chunksKraken2d = 0;
    private int chunksParsed = 0;
    private int centrifugeChunksParsed = 0;
    private int kraken2ChunksParsed = 0;
    private int metamapsCount = 0;
    private int analysisSubmitted = 0;
    private int analysisCompleted = 0;
    private Hashtable<String, Boolean> rawSequenceFiles = new Hashtable<String, Boolean>();    
    private Hashtable<String, GregorianCalendar> completedIdentifiers = new Hashtable<String, GregorianCalendar>();
    private Hashtable<String, GregorianCalendar> startedIdentifiers = new Hashtable<String, GregorianCalendar>();
        
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
    
    public synchronized void incrementChunksKraken2dCount() {
        chunksKraken2d++;
    }
    
    public synchronized void incrementChunksParsedCount() {
        chunksParsed++;
    }
    
    public synchronized void incrementCentrifugeChunksParsedCount() {
        centrifugeChunksParsed++;
    }
    
    public synchronized void incrementKraken2ChunksParsedCount() {
        kraken2ChunksParsed++;
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
                   " CentP=" + centrifugeChunksParsed +
                   " KrakC=" + chunksKraken2d +
                   " KrakP=" + kraken2ChunksParsed;
        
        
        return s;
    }
    
    public synchronized int getChunksBlasted() {
        return chunksBlasted;
    }
    
    public synchronized boolean chunksComplete() {
        int blastProcessCount = options.getBlastProcesses().size();
        int centrifugeProcessCount = options.getCentrifugeProcesses().size();
        int kraken2ProcessCount = options.getKraken2Processes().size();
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
        
        if(kraken2ProcessCount > 0) {
              if( (chunksKraken2d == (chunkCount * kraken2ProcessCount)) &&
                (chunksKraken2d == kraken2ChunksParsed)) {
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
            options.writeOptionsToFile(pw);            
            
            
            //pw.println("RawReads");
            //Set<String> files = rawSequenceFiles.keySet();
            //for (String filename : files) {
            //    boolean processed = rawSequenceFiles.get(filename);
            //    pw.println(filename + "\t" + (processed?"1":"0"));
            //}

            // Convert Hashtable to List of Map Entries
            List<Map.Entry<String, GregorianCalendar>> entryList = new ArrayList<>(completedIdentifiers.entrySet());

            // Sort the List based on the values (GregorianCalendars)
            Collections.sort(entryList, new Comparator<Map.Entry<String, GregorianCalendar>>() {
                @Override
                public int compare(Map.Entry<String, GregorianCalendar> o1, Map.Entry<String, GregorianCalendar> o2) {
                    return o1.getValue().compareTo(o2.getValue());
                }
            });

            // Iterate through the sorted List and print the contents
            pw.println("Identifiers:"+completedIdentifiers.size());
            for (Map.Entry<String, GregorianCalendar> entry : entryList) {
                pw.println(entry.getKey() + "\t" + options.getLog().calendarToString(entry.getValue()));
            }
            
            pw.close();
        } catch (Exception e) {
            System.out.println("writeProgressFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    public synchronized void readProgressFile() {
        try {
            File progressFile = new File(options.getSampleDirectory() + File.separator + "progress.info");
            //File progressFile = new File("/Users/leggettr/Desktop/progress.info");
            if (progressFile.exists()) {
                options.getLog().printlnLogAndScreen("Existing progress file found. Will attempt to continue from last saved position.");
                options.getAlertsList().addAlert(new MARTiAlert(MARTiAlert.TYPE_NEUTRAL, "Existing progress file found - will attempt to continue from last saved position."));
                BufferedReader br = new BufferedReader(new FileReader(progressFile));
                String line = br.readLine();
                while ((line = br.readLine()) != null) {
                    if (line.startsWith("Identifiers:")) {    
                        int idCount = Integer.parseInt(line.substring(12));
                        while ((line = br.readLine()) != null) {
                            String[] tokens = line.split("\t");
                            if (tokens.length == 2) {
                                String id = tokens[0];
                                String timeString = tokens[1];
                                System.out.println("    Completed "+id);
                                recordCompleted(id);
                            } else {
                                options.getLog().printlnLogAndScreen("Unrecognised string in progress.info: ["+line+"]");
                            }
                        }
                    }
                }
                br.close();
            } else {
                options.getLog().println("No existing progress file. Starting from scratch.");
            }
        } catch (Exception e) {
            System.out.println("readProgressFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }
        //System.exit(0);
    }
    
    public synchronized void recordStarted(String identifier) {
        String timeString = options.getLog().getTime();

        if (startedIdentifiers.containsKey(identifier)) {
            options.getLog().printlnLogAndScreen("Error: identifier "+identifier+ " already found in recordStarted. Please report this to the authors.");
        } else {
            startedIdentifiers.put(identifier, new GregorianCalendar());
        }            
    }
    
    public synchronized void recordCompleted(String identifier) {
        String timeString = options.getLog().getTime();
                
        if (completedIdentifiers.containsKey(identifier)) {
            if (!options.continueFromPrevious()) {
                options.getLog().printlnLogAndScreen("Error: identifier "+identifier+" already found in recordCompleted. Please report this to the authors.");
            }
        } else {
            completedIdentifiers.put(identifier, new GregorianCalendar());
        }            
        
        writeProgressFile();
    }
    
    public synchronized boolean checkCompleted(String identifier) {
        boolean completed = false;
        if (completedIdentifiers.containsKey(identifier)) {
            completed = true;
        }
        return completed;
    }
}
