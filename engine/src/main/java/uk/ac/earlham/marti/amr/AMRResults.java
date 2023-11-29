/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.Writer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;
import uk.ac.earlham.lcaparse.Taxonomy;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import javax.json.*;
import javax.json.stream.JsonGenerator;
import uk.ac.earlham.lcaparse.TaxonomyNode;
import uk.ac.earlham.marti.core.MARTiEngine;

/**
 * Store AMR analysis results
 * 
 * @author Richard M. Leggett
 */
public class AMRResults {
    private MARTiEngineOptions options;
    private WalkOutResults wor = null;
    private CARDOntology cardOntology = null;
    private int readCountWithAMRHits = 0;
    private int barcode = 0;
    
    /**
    * Class constructor.
    * 
    * @param  o  global MARTiEngineOptions object
    */
    public AMRResults(MARTiEngineOptions o, int bc) {
        options = o;     
        barcode = bc;
        
        if (options.getCARDDatabasePath() != null) {
            cardOntology = new CARDOntology(options, options.getCARDDatabasePath());
        } else {
            System.out.println("ERROR: Trying to create CARD ontology before card process created.");
        }
        
        // Now we've got the ontology, we can create WalkOutResults
        wor = new WalkOutResults(options, cardOntology);
    }    
    
    /**
    * Analyse a file chunk for AMR using nt and CARD results.
    * 
    * @param  aat  an AMRAnalysisTask object containing details of the analysis to be performed
    */
    public void analyseChunk(AMRAnalysisTask aat) {
        long startTime = System.nanoTime();
        
        options.getLog().println("Running AMR analysis on...");
        options.getLog().println("  Barcode: " + aat.getBarcode());
        options.getLog().println("    Chunk: " + aat.getProcessedChunkNumber());
        options.getLog().println("     CARD: "+aat.getCARDBlastFilename());
        options.getLog().println("       nt: "+aat.getNtBlastFilename());

        WalkOutChunk woc = new WalkOutChunk(options, options.getReadClassifier().getTaxonomy(), aat.getOriginalChunkNumber(), aat.getProcessedChunkNumber());
        woc.load(aat.getCARDBlastFilename(), aat.getNtBlastFilename());
        options.getLog().println("Chunks loaded, processing hits");
        woc.processHits(wor);
        readCountWithAMRHits += woc.getReadCountWithAMRHits();
        options.getLog().println("Read count with AMR hits "+readCountWithAMRHits);
        
        writeJSON(aat.getProcessedChunkNumber());
        
        long timeDiff = (System.nanoTime() - startTime) / 1000000;
        options.getLog().println("Timing: AMR analysis on chunk " + aat.getProcessedChunkNumber() + " completed in " + timeDiff + " ms");
    }
    
    /**
    * Write AMR json file.
    * 
    * @param  cn  chunk number
    */
    public void writeJSON(int cn) {
        Hashtable<String, AMRGene> genes = wor.getGenes();
        Taxonomy taxonomy = options.getReadClassifier().getTaxonomy();
        // chunkTime object
        JsonObjectBuilder chunkTimes = Json.createObjectBuilder();
        
        options.getLog().println("Writing JSON for chunk "+cn);
        
        for (int c=1; c<=wor.getMaxChunkNumber(); c++) {
           chunkTimes.add(Integer.toString(c), wor.getChunkTime(c));
        }
        
        // Build geneList array
        JsonArrayBuilder arrayBuilder = Json.createArrayBuilder();
        for (String key : genes.keySet()) {
            AMRGene gene = genes.get(key);
            
            JsonObjectBuilder geneBuilder = Json.createObjectBuilder();
            geneBuilder.add("cardId", gene.getCARDId());
            geneBuilder.add("name", gene.getName());
 
            // Build average accuracy and count objects
            JsonObjectBuilder accuracyBuilder = Json.createObjectBuilder();
            JsonObjectBuilder countBuilder = Json.createObjectBuilder();
            
            int cumulativeCount = 0;
            for (int c=1; c<=wor.getMaxChunkNumber(); c++) {
                int count = gene.getOverallCountForChunk(c);
                cumulativeCount += count;
                if (count > 0) {
                    // Count
                    countBuilder.add(Integer.toString(c), cumulativeCount);
                    
                    // Mean accuracy
                    String meanIdString = String.format("%.2f", gene.getCumulativeMeanAccuracyAtChunk(c));            
                    accuracyBuilder.add(Integer.toString(c), Double.parseDouble(meanIdString));
                }
            }
 
            //String meanIdString = String.format("%.2f", gene.getMeanIdentity());            
            //geneBuilder.add("averageAccuracy", Double.parseDouble(meanIdString));            
            geneBuilder.add("description", cardOntology.getDescription(gene.getCARDId()));   
            geneBuilder.add("shortName", cardOntology.getShortName(gene.getCARDId()));               
            geneBuilder.add("drugClass", cardOntology.getDrugClass(gene.getCARDId()));
            geneBuilder.add("geneFamily", cardOntology.getGeneFamily(gene.getCARDId()));
            geneBuilder.add("resistanceMechanism", cardOntology.getResistanceMechanism(gene.getCARDId()));
            geneBuilder.add("count", countBuilder);
            geneBuilder.add("averageAccuracy", accuracyBuilder);

            JsonArrayBuilder speciesArrayBuilder = Json.createArrayBuilder();
                    
            // Loop through species
            Hashtable<Long, Integer> species = gene.getSpecies();
            for (Long id : species.keySet()) {
                // Add species section
                JsonObjectBuilder speciesBuilder = Json.createObjectBuilder();
                String speciesName = taxonomy.getNameFromTaxonId(id);
                if(id == -2l){
                    speciesName = "Unassigned";
                }
                
                short rank = 0;
                TaxonomyNode node = taxonomy.getNodeFromTaxonId(id);
                if(node != null) {
                    rank = node.getSimplifiedRank();
                }
                
                speciesBuilder.add("name", speciesName);
                speciesBuilder.add("ncbiID", id);
                speciesBuilder.add("rank", rank);
                JsonObjectBuilder speciesCountBuilder = Json.createObjectBuilder();
                JsonObjectBuilder plasmidCountBuilder = Json.createObjectBuilder();
                cumulativeCount = 0;
                int cumalativePlasmidCount = 0;
                for (int c=0; c<=wor.getMaxChunkNumber(); c++) {
                    int count = gene.getSpeciesCountForChunk(id, c);
                    cumulativeCount += count;
                    if (count > 0) {
                        speciesCountBuilder.add(Integer.toString(c), cumulativeCount);
                    }
                    int plasmidCount = gene.getPlasmidCountForChunk(id, c);
                    cumalativePlasmidCount += plasmidCount;
                    if (plasmidCount > 0) {
                        plasmidCountBuilder.add(Integer.toString(c), cumalativePlasmidCount);
                    }
                }
                speciesBuilder.add("chunkCounts", speciesCountBuilder);
                speciesBuilder.add("chunkPlasmidCounts", plasmidCountBuilder);
                speciesArrayBuilder.add(speciesBuilder);
              
                
                
            }
            geneBuilder.add("species", speciesArrayBuilder);

            // Add this gene to the array
            arrayBuilder.add(geneBuilder);
        }

        // Buld AMR object
        JsonObjectBuilder amrBuilder = Json.createObjectBuilder();
        amrBuilder.add("currentChunk", cn);
        amrBuilder.add("chunkTime", chunkTimes);
        amrBuilder.add("readsWithAMRHits", readCountWithAMRHits);
        amrBuilder.add("geneList", arrayBuilder);

        // Build meta data
        JsonObjectBuilder metaBuilder = Json.createObjectBuilder();
        metaBuilder.add("martiVersion", MARTiEngine.VERSION_STRING);
        LocalDateTime date = LocalDateTime.now();
        String dateTimeString = date.truncatedTo(ChronoUnit.SECONDS).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME).toString();
        metaBuilder.add("fileWritten", dateTimeString);
                
        // Build top-level object
        JsonObjectBuilder objectBuilder = Json.createObjectBuilder();
        objectBuilder.add("meta", metaBuilder);
        objectBuilder.add("amr", amrBuilder);
        JsonObject jsonObject = objectBuilder.build();        

        // Print it with pretty printing (pacing etc.)
        Map<String, Boolean> config = new HashMap<>();
        config.put(JsonGenerator.PRETTY_PRINTING, true);
        JsonWriterFactory writerFactory = Json.createWriterFactory(config);
        
        try {
            Writer writer = new StringWriter();
            writerFactory.createWriter(writer).write(jsonObject);
            String jsonString = writer.toString();
            String filename = options.getAMRDirectory() + File.separator + "amr_"+cn+".json";
            String filenameFinal = options.getMARTiJSONDirectory(barcode) + File.separator + "amr.json";
            
            PrintWriter pw = new PrintWriter(new FileWriter(filename));
            pw.write(jsonString);
            pw.close();            
            
            options.copyFile(filename, filenameFinal);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
        options.getLog().println("JSON written for chunk "+cn);                
    }
    
    public CARDOntology getOntology() {
        return cardOntology;
    }
}
