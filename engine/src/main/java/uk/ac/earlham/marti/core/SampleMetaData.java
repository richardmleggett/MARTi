/*
 * Author: Richard M. Leggett
 * © Copyright 2021
 */
package uk.ac.earlham.marti.core;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.Writer;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;
import javax.json.*;
import javax.json.stream.JsonGenerator;
import uk.ac.earlham.marti.blast.BlastProcess;
import uk.ac.earlham.marti.centrifuge.CentrifugeProcess;

/**
 *
 * @author leggettr
 */
public class SampleMetaData {
    private MARTiEngineOptions options;
    private int barcode = 0;
    private int inputReadCount = 0;
    private int readsPassedFilter = 0;
    private int readsPassedFilterByChunk = 0; // Using this to check for bug in counting
    private int readsFailedFilter = 0;
    private int readsClassified = 0;
    private int readsWithPoorAlignments = 0;
    private int readsAnalysed = 0;
    private long totalInputBp = 0;
    private int countByQuality[] = new int[51];
    private double totalQuality = 0;
    private Hashtable<String,Integer> chunkCounts = new Hashtable<String,Integer>();
    private long startTime = System.nanoTime();
    private int lastChunkAnalysedTime = 0;
    private ArrayList<Integer> chunkAnalysedTimings = new ArrayList<Integer>();
    private String sequencingTimeString = "";
    private String analysingTimeString = "";
    
    public SampleMetaData(MARTiEngineOptions o, int bc) {
        options = o;
        barcode = bc;
        for (int i=0; i<=50; i++) {
            countByQuality[i] = 0;
        }
        
        LocalDateTime date = LocalDateTime.now();
        sequencingTimeString = date.truncatedTo(ChronoUnit.SECONDS).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME).toString();
        analysingTimeString = date.truncatedTo(ChronoUnit.SECONDS).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME).toString();
    }
    
    public int getMinutesSinceStart() {
        long timeDiffSecs = (System.nanoTime() - startTime) / 1000000000;
        // FOR DEBUGGING - return seconds instead
        //long timeDiffMins = timeDiffSecs;
        long timeDiffMins = timeDiffSecs / 60;
        return (int)timeDiffMins;
    }
    
    public int getLastChunkAnalysedTime() {
        return lastChunkAnalysedTime;
    }
            
    public synchronized void registerNewInputRead(int bp, double meanQ, boolean passed) { 
        inputReadCount++;
        totalInputBp += bp;
        totalQuality += meanQ;
        int qualityInt = (int) Math.round(meanQ);
        if (qualityInt > 50) {
            qualityInt = 50;
            System.out.println("Warning: unlikely MeanQ of "+meanQ+" ("+qualityInt+") rounded fown to 50");
        }
        countByQuality[qualityInt]++;
        
        if (passed) {
            readsPassedFilter++;
        } else {            
            readsFailedFilter++;
        }
    }  
    
    public synchronized void registerFilteredFastaChunk(String fastaFilename, int count) {
        options.getLog().println("Registering filtered chunk "+fastaFilename + " with "+count+" reads");
        readsPassedFilterByChunk += count;
        if (chunkCounts.containsKey(fastaFilename)) {
            options.getLog().printlnLogAndScreen("Error: filename "+fastaFilename+" already seen.");
        } else {
            chunkCounts.put(fastaFilename, count);
        }
    }
    
    public synchronized void registerChunkAnalysed(String fastaFilename) {
        if (chunkCounts.containsKey(fastaFilename)) {
            int count = chunkCounts.get(fastaFilename);
            options.getLog().println("Chunk analysed "+fastaFilename+" with "+count+" reads");
            readsAnalysed += count;
            lastChunkAnalysedTime = this.getMinutesSinceStart();
            chunkAnalysedTimings.add(lastChunkAnalysedTime);
        } else {
            options.getLog().println("Error: can't find "+fastaFilename+" in registered chunks");
        }
    }
    
    public synchronized void addToReadsClassified(int n) {
        readsClassified+=n;
    }
    
    public synchronized void markPoorAlignments(int n) {
        readsClassified-=n;
        readsWithPoorAlignments+=n;
    }
    
    public int getReadsAnalysed() {
        return readsAnalysed;
    }
    
    public int getReadsUnclassified() {
        //System.out.println("readsPassedFilter "+readsPassedFilter);
        //System.out.println("readsClassified "+readsClassified);
        return readsAnalysed - readsClassified;
    }
    
    public synchronized void writeSampleJSON(boolean martiComplete) {
        options.getLog().printlnLogAndScreen("Writing sample.json for barcode "+barcode);
        
        String filename = options.getSampleDirectory() + File.separator + "sample_bc"+barcode+".json";
        String filenameFinal = options.getMARTiJSONDirectory(barcode) + File.separator + "sample.json";
        String classificationProcess = "";
        boolean foundClassifyingProcess = false;
        JsonObjectBuilder metaBuilder = Json.createObjectBuilder();
        metaBuilder.add("martiVersion", MARTiEngine.VERSION_STRING);
                
        JsonObjectBuilder classificationObjectBuilder = Json.createObjectBuilder();
        JsonObjectBuilder analysisObjectBuilder = Json.createObjectBuilder();
        JsonObjectBuilder amrObjectBuilder = Json.createObjectBuilder();
        
        ArrayList<BlastProcess> blastProcesses = options.getBlastProcesses();
        ArrayList<CentrifugeProcess> centrifugeProcesses = options.getCentrifugeProcesses();
        for(BlastProcess bp : blastProcesses) {
            if(bp.useForClassifying()) {
                assert(!foundClassifyingProcess);
                classificationProcess = "BlastLCA";
                classificationObjectBuilder.add("algorithm", classificationProcess);
                classificationObjectBuilder.add("blastTool", bp.getBlastTask());
                classificationObjectBuilder.add("blastVersion", options.getBlastVersion());
                classificationObjectBuilder.add("database", bp.getBlastDatabase());
                //classificationObjectBuilder.add("databaseVersion", "01-01-1900");
                foundClassifyingProcess = true;
            }
            if(bp.getBlastName().equalsIgnoreCase("card")) {
                assert(options.runningCARD());
                amrObjectBuilder.add("algorithm", "Blast");
                amrObjectBuilder.add("blastTool", bp.getBlastTask());
                amrObjectBuilder.add("blastVersion", options.getBlastVersion());
                amrObjectBuilder.add("database", bp.getBlastDatabase());
                //amrObjectBuilder.add("databaseVersion", "0.0.0");              
            }
        }
        
        for(CentrifugeProcess cp : centrifugeProcesses) {
            if(cp.useForClassifying()) {
                assert(!foundClassifyingProcess);
                classificationProcess = "Centrifuge";
                classificationObjectBuilder.add("algorithm", classificationProcess);
                classificationObjectBuilder.add("centrifugeVersion", options.getCentrifugeVersion());
                classificationObjectBuilder.add("database", cp.getDatabase());
                //classificationObjectBuilder.add("databaseVersion", "01-01-1900");
                foundClassifyingProcess = true;
            }
        }
               
        if (options.runningCARD()) {            
            analysisObjectBuilder.add("pipeline", classificationProcess + "-CARD");
        } else {
            analysisObjectBuilder.add("pipeline", classificationProcess);
        }
        
        analysisObjectBuilder.add("classification", classificationObjectBuilder);
        analysisObjectBuilder.add("accumulation", "true");   
 
        if (options.runningCARD()) {
            analysisObjectBuilder.add("amr", amrObjectBuilder);
        }
        
        JsonObjectBuilder sampleObjectBuilder = Json.createObjectBuilder();
        sampleObjectBuilder.add("id", options.getSampleIdByBarcode(barcode));
        sampleObjectBuilder.add("uuid", options.getSampleUUIDByBarcode(barcode));
        sampleObjectBuilder.add("barcode", barcode);        
        sampleObjectBuilder.add("runId", options.getSampleName());
        sampleObjectBuilder.add("sequencingDate", sequencingTimeString);
        sampleObjectBuilder.add("analysisDate", analysingTimeString);
        sampleObjectBuilder.add("yieldBases", totalInputBp);
        sampleObjectBuilder.add("yieldGb", (double)totalInputBp / (double)(1000*1000*1000));
        sampleObjectBuilder.add("readsPassBasecall", inputReadCount);
        sampleObjectBuilder.add("readsFailedFilter", readsFailedFilter);
        sampleObjectBuilder.add("readsPassedFilter", readsPassedFilter);
        sampleObjectBuilder.add("readsWithClassification", readsClassified);
        sampleObjectBuilder.add("readsUnclassified", getReadsUnclassified());
        sampleObjectBuilder.add("readsWithPoorAlignments", readsWithPoorAlignments);
        sampleObjectBuilder.add("readsAnalysed", readsAnalysed);       
        sampleObjectBuilder.add("sequencingStatus", "Complete");
        sampleObjectBuilder.add("martiStatus", martiComplete ? "Complete":"Processing");
        sampleObjectBuilder.add("analysis", analysisObjectBuilder);

        //options.getLog().println("readsPassedFilter1 = "+readsPassedFilter+" ReadsPassedFilter2 = "+readsPassedFilterByChunk);
        
        // Build top-level object
        JsonObjectBuilder objectBuilder = Json.createObjectBuilder();
        objectBuilder.add("meta", metaBuilder);
        objectBuilder.add("sample", sampleObjectBuilder);
        JsonObject jsonObject = objectBuilder.build();        

        // Print it with pretty printing (pacing etc.)
        Map<String, Boolean> config = new HashMap<>();
        config.put(JsonGenerator.PRETTY_PRINTING, true);
        JsonWriterFactory writerFactory = Json.createWriterFactory(config);
        
        try {
            Writer writer = new StringWriter();
            writerFactory.createWriter(writer).write(jsonObject);
            String jsonString = writer.toString();
            
            PrintWriter pw = new PrintWriter(new FileWriter(filename+".tmp"));
            pw.write(jsonString);
            pw.close();            

            Path source = Paths.get(filename + ".tmp");
            Path dest = Paths.get(filename);
            Files.move(source, dest, StandardCopyOption.REPLACE_EXISTING);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
        
        options.copyFile(filename, filenameFinal);
    }
}
