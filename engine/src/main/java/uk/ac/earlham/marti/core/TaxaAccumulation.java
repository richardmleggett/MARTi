/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.Writer;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import javax.json.Json;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.JsonWriterFactory;
import javax.json.stream.JsonGenerator;
import uk.ac.earlham.lcaparse.SimplifiedRank;
import uk.ac.earlham.lcaparse.Taxonomy;
import uk.ac.earlham.lcaparse.TaxonomyNode;

/**
 *
 * @author leggettr
 */
public class TaxaAccumulation {
    //private ArrayList<TaxaAccumulationCounts> taxaCounts = new ArrayList<TaxaAccumulationCounts>();
    private HashMap<Double,ArrayList<TaxaAccumulationCounts>> taxaCountsPerMinSupport = new HashMap<Double,ArrayList<TaxaAccumulationCounts>>();
    private MARTiEngineOptions options = null;
    private MARTiResults results = null;
    private SimplifiedRank simplifiedRank = new SimplifiedRank();
    private int bc = 0;
    private int nLeaves = 0;

    public TaxaAccumulation(MARTiEngineOptions o, MARTiResults r, int b) {
        options = o;
        results = r;
        bc = b;
    }
    
    private int exploreNode(TaxonomyNode n, int rank) {
        Taxonomy taxonomy = options.getReadClassifier().getTaxonomy();
        //options.getLog().println("    exploreNode " + taxonomy.getNameFromTaxonId(n.getId()) + " " + n.getRank() + " " + n.getSimplifiedRank());
        int markedChildren = 0;

        // See if children are at target rank (or less than)...
        ArrayList<TaxonomyNode> children = n.getChildren();
        int childCount = 0;
        for (int i=0; i<children.size(); i++) {
            TaxonomyNode c = children.get(i);
            if (c.getLCASummed(bc) > 0) {
                if (c.getSimplifiedRank() <= rank) {
                    childCount++;
                    markedChildren += exploreNode(c, rank);
                } else {
                    options.getLog().println(MARTiLog.LOGLEVEL_STOREACCUMULATION, "    Child " + taxonomy.getNameFromTaxonId(c.getId()) + " rank issue "+c.getRank() + " " + c.getSimplifiedRank());
                }
            }
        }

        // Didn't find any children at target rank (or less than)
        if (markedChildren == 0) {
            // If current rank <= target rank, then this is a leaf node
            if ((n.getSimplifiedRank() != 0) && (n.getSimplifiedRank() <= rank)) {
                if (n.getLCASummed(bc) > 0) {
                    nLeaves++;
                    options.getLog().println(MARTiLog.LOGLEVEL_STOREACCUMULATION, "    got node " + options.getReadClassifier().getTaxonomy().getNameFromTaxonId(n.getId()) + " summed "+n.getLCASummed(bc));
                    markedChildren++;
                }
            }
        }        
        
        return markedChildren;
    }
    
    public void storeAccumulation(int fastaChunkNumber, int chunkNumberByOrderCompleted, int nReadsAnalysed, int mins, double minSupport) {
        // Go through all nodes, counting assigned to each of the 9 levels.
        // Then go through leaf nodes and count each leaf node to any levels higher.
        Taxonomy taxonomy = taxonomy = options.getReadClassifier().getTaxonomy();
        long startTime = System.nanoTime();
        long timeDiff;
        ArrayList<TaxaAccumulationCounts> taxaCounts;
        
        if (taxaCountsPerMinSupport.containsKey(minSupport)) {
            taxaCounts = taxaCountsPerMinSupport.get(minSupport);
        } else {
            taxaCounts = new ArrayList<TaxaAccumulationCounts>();
            taxaCountsPerMinSupport.put(minSupport, taxaCounts);
            options.getLog().println("Creating new taxaCounts for min support "+minSupport);
        }
               
        TaxaAccumulationCounts counts = new TaxaAccumulationCounts(fastaChunkNumber, chunkNumberByOrderCompleted, nReadsAnalysed, mins);
        
        taxaCounts.add(counts);
      
        for (int rank=1; rank<=10; rank++) {
            options.getLog().println(MARTiLog.LOGLEVEL_STOREACCUMULATION, "Exploring rank "+rank+" minSupport="+minSupport+" fastaChunkNumber="+fastaChunkNumber+" chunkNumberByOrderCompleted="+chunkNumberByOrderCompleted);
            TaxonomyNode n = taxonomy.getNodeFromTaxonId(1L);
            nLeaves = 0;
            exploreNode(n, rank);
            counts.addCount(rank, nLeaves);
            options.getLog().println(MARTiLog.LOGLEVEL_STOREACCUMULATION, "Rank "+rank+" leaves "+nLeaves);
        }            

        timeDiff = (System.nanoTime() - startTime) / 1000000;
        options.getLog().println("Timing: Accumulation data stored in " + timeDiff + " ms");
    }
    
    public void writeJSON(double minSupport) {
        long startTime = System.nanoTime();
        long timeDiff;
        
        if (taxaCountsPerMinSupport.containsKey(minSupport)) {
            ArrayList<TaxaAccumulationCounts> taxaCounts = taxaCountsPerMinSupport.get(minSupport);
        
            // Build meta data
            JsonObjectBuilder metaBuilder = Json.createObjectBuilder();
            metaBuilder.add("martiVersion", MARTiEngine.VERSION_STRING);
            LocalDateTime date = LocalDateTime.now();
            String dateTimeString = date.truncatedTo(ChronoUnit.SECONDS).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME).toString();
            metaBuilder.add("fileWritten", dateTimeString);

            JsonObjectBuilder accumulationBuilder = Json.createObjectBuilder();     
            for (int rank=1; rank<=10; rank++) {
                JsonObjectBuilder rankBuilder = Json.createObjectBuilder();
                JsonArrayBuilder readsArrayBuilder = Json.createArrayBuilder();
                JsonArrayBuilder timeArrayBuilder = Json.createArrayBuilder();

                for (int chunk=0; chunk<taxaCounts.size(); chunk++) {
                    TaxaAccumulationCounts tac = taxaCounts.get(chunk);
                    JsonArrayBuilder pairArrayBuilder = Json.createArrayBuilder();
                    pairArrayBuilder.add(tac.getReadsAnalysedCount());
                    pairArrayBuilder.add(tac.getCount(rank));
                    readsArrayBuilder.add(pairArrayBuilder);

                    pairArrayBuilder = Json.createArrayBuilder();
                    pairArrayBuilder.add(tac.getMinsSinceStart());
                    pairArrayBuilder.add(tac.getCount(rank));
                    timeArrayBuilder.add(pairArrayBuilder);
                }

                rankBuilder.add("reads", readsArrayBuilder);
                rankBuilder.add("time", timeArrayBuilder);
                accumulationBuilder.add(simplifiedRank.getSimplifiedRankString(rank), rankBuilder);
            }        

            JsonObjectBuilder topLevelBuilder = Json.createObjectBuilder();
            topLevelBuilder.add("meta", metaBuilder);
            topLevelBuilder.add("accumulation", accumulationBuilder);

            JsonObject jsonObject = topLevelBuilder.build();        

            String jsonFilename;
            int fileCount = taxaCounts.size();
            if (bc > 0) {
                jsonFilename = options.getLCAParseDirectory() + File.separator + "accumulation_barcode" + bc + "_ch" + fileCount + "_ms" + minSupport + ".json";
            } else {
                jsonFilename = options.getLCAParseDirectory() + File.separator + "accumulation_ch" + fileCount + "_ms" + minSupport + ".json";
            }       
            String jsonFilenameFinal = options.getMARTiJSONDirectory(bc) + File.separator + "accumulation_ms" + minSupport + ".json";

            // Print it with pretty printing (pacing etc.)
            Map<String, Boolean> config = new HashMap<>();
            config.put(JsonGenerator.PRETTY_PRINTING, true);
            JsonWriterFactory writerFactory = Json.createWriterFactory(config);

            try {
                Writer writer = new StringWriter();
                writerFactory.createWriter(writer).write(jsonObject);
                String jsonString = writer.toString();

                PrintWriter pw = new PrintWriter(new FileWriter(jsonFilename));
                pw.write(jsonString);
                pw.close();            
            } catch (Exception e) {
                e.printStackTrace();
                System.exit(1);
            }        

            timeDiff = (System.nanoTime() - startTime) / 1000000;
            options.getLog().println("Timing: Accumulation data written in " + timeDiff + " ms");
            options.copyFile(jsonFilename, jsonFilenameFinal);
        } else {        
            options.getLog().printlnLogAndScreen("Error: rarefaction data doesn't exist for min support "+minSupport);
        }
    }
}
