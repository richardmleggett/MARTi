/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.kraken2;

import java.io.File;
import java.util.Hashtable;
import java.util.Set;
import java.util.concurrent.ConcurrentLinkedQueue;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.MARTiLog;
import uk.ac.earlham.marti.core.SampleMetaData;
import uk.ac.earlham.marti.schedule.JobScheduler;

/**
 *
 * @author martins
 */
public class Kraken2Classifier {
    private MARTiEngineOptions options;
    private Hashtable<Integer, Kraken2ClassifierItem> pendingFiles = new Hashtable<Integer, Kraken2ClassifierItem>();
    private Hashtable<String, Integer> barcodes = new Hashtable<String, Integer>();
    private ConcurrentLinkedQueue<String> fileCompressionQueue = null;
    private int filesProcessed = 0;
    private int fileCount = 0;
    
    public Kraken2Classifier(MARTiEngineOptions o) {
        options = o;
    }
    
    
    public synchronized void addFile(String kraken2ProcessName, int id, String queryFilename, String classificationFilename) {
        boolean ignoreThis = false;
        
        //TODO: Add -dontrunkraken2
        if (options.runBlastCommand() == false) {
            File f = new File(classificationFilename);
            if (!f.exists()) {
                File fgz = new File(classificationFilename + ".gz");
                if(!fgz.exists()) {
                    options.getLog().println("dontrunblast - files "+classificationFilename+" and " + classificationFilename + ".gz don't exist, so ignoring");
                    ignoreThis = true;
                }
            }
        }

        if (ignoreThis == false) {
            pendingFiles.put(id, new Kraken2ClassifierItem(kraken2ProcessName, id, queryFilename, classificationFilename));
            fileCount++;

            if (classificationFilename.contains("barcode")) {
                String bcString = classificationFilename.substring(classificationFilename.indexOf("barcode"), classificationFilename.indexOf("barcode")+9);
                if (!barcodes.containsKey(bcString)) {
                    barcodes.put(bcString, 1);
                }
            }
        }
    }
    
    public void setFileCompressionQueue(ConcurrentLinkedQueue<String> queue) {
        if(fileCompressionQueue == null) {
            fileCompressionQueue = queue;
        } else {
            System.out.println("[Kraken2Classifier] Warning: Setting file compression queue but this has already been set. "
                                + "Something has gone wrong.");
        }
    }
    
    private boolean checkKraken2Completed(Kraken2ClassifierItem f, int exitValue) {
        if(exitValue != 0) {
            return false;
        }       
        //TODO: make this robust.
        return true;
    }
    
    public synchronized void checkForFilesToClassify() {
        JobScheduler js = options.getJobScheduler();
        Set<Integer> asSet = pendingFiles.keySet();
        Integer[] ids = asSet.toArray(new Integer[asSet.size()]);        

        options.getLog().println(MARTiLog.LOGLEVEL_CHECKFORFILESTOCLASSIFY, "In checkForFilesToClassify Kraken2 - size "+ids.length);
        
        for(int i=0; i<ids.length; i++) {
            int thisId = ids[i];
            Kraken2ClassifierItem f = pendingFiles.get(thisId);
            
            // Check if job completed
            if (js.checkJobCompleted(thisId)) {
                // Check if Centrifuge completed ok
                if (checkKraken2Completed(f, js.getExitValue(thisId))) {                        
                    
                    options.getLog().println("Running parse on " + f.getClassificationFile());
                    long startTime = System.nanoTime();
                    long timeDiff;
                    int barcode = options.getBarcodeFromPath(f.getClassificationFile());
                    SampleMetaData md = options.getSampleMetaData(barcode);
                    options.getLog().println("Got sample metadata");
                    
                    options.getLog().println("Registering chunks");
                    //TODO: Remove this hack.
                    md.registerChunkAnalysed(f.getQueryFile().replaceAll("fastq", "fasta"));
                    
                    int fastaChunkNumber = getChunkNumber(f.getClassificationFile());
                    int chunkNumberByOrderCompleted = options.getResults().addChunk(barcode, f);
                    
                    options.getResults().writeTree(barcode, 0);
                    options.getResults().storeAccumulationData(barcode, fastaChunkNumber, chunkNumberByOrderCompleted, md.getReadsAnalysed(), md.getLastChunkAnalysedTime(), 0);
                    options.getResults().writeAccumulationJson(barcode, 0);                                

                    options.getResults().writeTree(barcode, 0.1);
                    options.getResults().storeAccumulationData(barcode, fastaChunkNumber, chunkNumberByOrderCompleted, md.getReadsAnalysed(), md.getLastChunkAnalysedTime(), 0.1);
                    options.getResults().writeAccumulationJson(barcode, 0.1);                                

                    options.getResults().writeTree(barcode, 1);
                    options.getResults().storeAccumulationData(barcode, fastaChunkNumber, chunkNumberByOrderCompleted, md.getReadsAnalysed(), md.getLastChunkAnalysedTime(), 1);
                    options.getResults().writeAccumulationJson(barcode, 1);                                

                    options.getResults().writeTree(barcode, 2);
                    options.getResults().storeAccumulationData(barcode, fastaChunkNumber, chunkNumberByOrderCompleted, md.getReadsAnalysed(), md.getLastChunkAnalysedTime(), 2);
                    options.getResults().writeAccumulationJson(barcode, 2);     
                    
                    filesProcessed++;
                    pendingFiles.remove(thisId);
                    options.getProgressReport().incrementKraken2ChunksParsedCount();
                    md.writeSampleJSON(false);
                                  
                }
            }
        }        
    }
    
    private int getChunkNumber(String filename) {
        int chunkNumber = -1;
        File f = new File(filename);
        String leafName = f.getName();
        String[] fields = leafName.split("_");
        chunkNumber = Integer.parseInt(fields[fields.length - 2]); 
        return chunkNumber; 
    }
}
