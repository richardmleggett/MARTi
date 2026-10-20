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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
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
 * Tracks taxa accumulation (rarefaction-style) curves for one barcode.
 * After each chunk is processed, the number of taxa observed at each simplified
 * rank is recorded for each min support threshold, and written to
 * accumulation_ms<minSupport>.json for display by the GUI.
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

    // For each min support: taxon ID -> index (in completion order) of the first chunk
    // at which that taxon was present (LCA summed > 0) in the min-support-adjusted tree.
    private HashMap<Double, HashMap<Long, Integer>> firstSeenPerMinSupport = new HashMap<Double, HashMap<Long, Integer>>();
    // For each min support: leaf taxa per rank (index 1..10) at the most recent chunk.
    // These define the "final" taxa set; earlier points only count members of this set.
    private HashMap<Double, ArrayList<HashSet<Long>>> latestLeavesPerMinSupport = new HashMap<Double, ArrayList<HashSet<Long>>>();
    // Working state used by exploreNode during a single storeAccumulation call
    private HashMap<Long, Integer> currentFirstSeen = null;
    private HashSet<Long> currentLeaves = null;
    private int currentChunkIndex = 0;

    /**
     * Create an accumulation tracker for a single barcode.
     * @param o engine options (used for the taxonomy, logging and output directories)
     * @param r the results object this tracker belongs to
     * @param b barcode number (0 if the run isn't barcoded)
     */
    public TaxaAccumulation(MARTiEngineOptions o, MARTiResults r, int b) {
        options = o;
        results = r;
        bc = b;
    }
    
    /**
     * Recursively walk the LCA tree below node n, counting the leaf taxa at the
     * target simplified rank (1 = domain ... 8 = species, higher = below species).
     * Only children with LCA summed > 0 (i.e. present in the current
     * min-support-adjusted tree) and a simplified rank <= the target are followed.
     * A node counts as a leaf if it is at or above the target rank, has reads, and
     * has no qualifying children, so a genus with no species beneath it is
     * counted as a taxon at species level.
     * Each leaf found increments nLeaves and is added to currentLeaves; every
     * node visited has its first-seen chunk recorded in currentFirstSeen.
     * Returns the number of leaves found at or below n.
     */
    private int exploreNode(TaxonomyNode n, int rank) {
        Taxonomy taxonomy = options.getReadClassifier().getTaxonomy();
        //options.getLog().println("    exploreNode " + taxonomy.getNameFromTaxonId(n.getId()) + " " + n.getRank() + " " + n.getSimplifiedRank());
        int markedChildren = 0;

        // Record the first chunk at which this taxon appears in the thresholded tree
        if ((currentFirstSeen != null) && (n.getLCASummed(bc) > 0)) {
            currentFirstSeen.putIfAbsent(n.getId(), currentChunkIndex);
        }

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
                    if (currentLeaves != null) {
                        currentLeaves.add(n.getId());
                    }
                    options.getLog().println(MARTiLog.LOGLEVEL_STOREACCUMULATION, "    got node " + options.getReadClassifier().getTaxonomy().getNameFromTaxonId(n.getId()) + " summed "+n.getLCASummed(bc));
                    markedChildren++;
                }
            }
        }        
        
        return markedChildren;
    }
    
    /**
     * Record accumulation data for the chunk that has just been processed.
     * Must be called after the tree has been adjusted for minSupport (writeTree
     * does this), as it reads the LCA summed counts from the current tree.
     * For each simplified rank 1..10 it counts the leaf taxa, storing the raw
     * counts in a new TaxaAccumulationCounts entry, updating the first-seen chunk
     * for any newly observed taxa, and saving the current leaf sets, which act as
     * the "final" taxa set used by getConsistentCounts.
     * @param fastaChunkNumber chunk number taken from the input filename
     * @param chunkNumberByOrderCompleted chunk number in the order chunks finished
     * @param nReadsAnalysed cumulative reads analysed so far (x-axis of the reads curve)
     * @param mins minutes since start of the run (x-axis of the time curve)
     * @param minSupport the LCA min support percentage this data relates to
     */
    public void storeAccumulation(int fastaChunkNumber, int chunkNumberByOrderCompleted, int nReadsAnalysed, int mins, double minSupport) {
        // Go through all nodes, counting assigned to each of the 9 levels.
        // Then go through leaf nodes and count each leaf node to any levels higher.
        Taxonomy taxonomy = options.getReadClassifier().getTaxonomy();
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

        currentChunkIndex = taxaCounts.size() - 1;
        currentFirstSeen = firstSeenPerMinSupport.computeIfAbsent(minSupport, k -> new HashMap<Long, Integer>());
        ArrayList<HashSet<Long>> latestLeaves = new ArrayList<HashSet<Long>>();
        latestLeaves.add(new HashSet<Long>()); // index 0 unused, ranks are 1..10
      
        for (int rank=1; rank<=10; rank++) {
            currentLeaves = new HashSet<Long>();
            latestLeaves.add(currentLeaves);
            options.getLog().println(MARTiLog.LOGLEVEL_STOREACCUMULATION, "Exploring rank "+rank+" minSupport="+minSupport+" fastaChunkNumber="+fastaChunkNumber+" chunkNumberByOrderCompleted="+chunkNumberByOrderCompleted);
            TaxonomyNode n = taxonomy.getNodeFromTaxonId(1L);
            nLeaves = 0;
            exploreNode(n, rank);
            counts.addCount(rank, nLeaves);
            options.getLog().println(MARTiLog.LOGLEVEL_STOREACCUMULATION, "Rank "+rank+" leaves "+nLeaves);
        }            

        latestLeavesPerMinSupport.put(minSupport, latestLeaves);
        currentLeaves = null;
        currentFirstSeen = null;

        timeDiff = (System.nanoTime() - startTime) / 1000000;
        options.getLog().println("Timing: Accumulation data stored in " + timeDiff + " ms");
    }
    
    /**
     * Build accumulation counts that are consistent with the most recent chunk.
     * The taxa present at the latest chunk (after min support) define the final set.
     * For each earlier chunk we count how many of those taxa had been seen by then.
     * Taxa that met the threshold earlier but are absent from the final set are ignored,
     * so the curve is non-decreasing and its last point equals the final taxa count.
     * Returns int[chunk][rank].
     */
    private int[][] getConsistentCounts(double minSupport, int nChunks) {
        int[][] consistent = new int[nChunks][11];
        HashMap<Long, Integer> firstSeen = firstSeenPerMinSupport.get(minSupport);
        ArrayList<HashSet<Long>> finalLeaves = latestLeavesPerMinSupport.get(minSupport);

        if ((firstSeen == null) || (finalLeaves == null)) {
            return consistent;
        }

        for (int rank=1; rank<=10; rank++) {
            int[] newAtChunk = new int[nChunks];
            for (Long taxonId : finalLeaves.get(rank)) {
                Integer chunk = firstSeen.get(taxonId);
                if ((chunk != null) && (chunk < nChunks)) {
                    newAtChunk[chunk]++;
                }
            }

            int runningTotal = 0;
            for (int chunk=0; chunk<nChunks; chunk++) {
                runningTotal += newAtChunk[chunk];
                consistent[chunk][rank] = runningTotal;
            }
        }

        return consistent;
    }
    
    /**
     * Write the accumulation data for one min support value as JSON.
     * For each rank, writes "reads" and "time" arrays of [x, taxa count] pairs
     * using the consistent counts from getConsistentCounts, plus "rawReads" and
     * "rawTime" arrays containing the original per-chunk counts.
     * The file is written to the LCA parse directory with the chunk count in its
     * name, then copied to accumulation_ms<minSupport>.json in the MARTi JSON
     * directory for the GUI. Logs an error if no data exists for minSupport.
     */
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

            int[][] consistentCounts = getConsistentCounts(minSupport, taxaCounts.size());

            JsonObjectBuilder accumulationBuilder = Json.createObjectBuilder();     
            for (int rank=1; rank<=10; rank++) {
                JsonObjectBuilder rankBuilder = Json.createObjectBuilder();
                JsonArrayBuilder readsArrayBuilder = Json.createArrayBuilder();
                JsonArrayBuilder timeArrayBuilder = Json.createArrayBuilder();
                // Original per-chunk counts (threshold applied independently at each chunk)
                JsonArrayBuilder rawReadsArrayBuilder = Json.createArrayBuilder();
                JsonArrayBuilder rawTimeArrayBuilder = Json.createArrayBuilder();

                for (int chunk=0; chunk<taxaCounts.size(); chunk++) {
                    TaxaAccumulationCounts tac = taxaCounts.get(chunk);
                    JsonArrayBuilder pairArrayBuilder = Json.createArrayBuilder();
                    pairArrayBuilder.add(tac.getReadsAnalysedCount());
                    pairArrayBuilder.add(consistentCounts[chunk][rank]);
                    readsArrayBuilder.add(pairArrayBuilder);

                    pairArrayBuilder = Json.createArrayBuilder();
                    pairArrayBuilder.add(tac.getMinsSinceStart());
                    pairArrayBuilder.add(consistentCounts[chunk][rank]);
                    timeArrayBuilder.add(pairArrayBuilder);

                    pairArrayBuilder = Json.createArrayBuilder();
                    pairArrayBuilder.add(tac.getReadsAnalysedCount());
                    pairArrayBuilder.add(tac.getCount(rank));
                    rawReadsArrayBuilder.add(pairArrayBuilder);

                    pairArrayBuilder = Json.createArrayBuilder();
                    pairArrayBuilder.add(tac.getMinsSinceStart());
                    pairArrayBuilder.add(tac.getCount(rank));
                    rawTimeArrayBuilder.add(pairArrayBuilder);
                }

                rankBuilder.add("reads", readsArrayBuilder);
                rankBuilder.add("time", timeArrayBuilder);
                rankBuilder.add("rawReads", rawReadsArrayBuilder);
                rankBuilder.add("rawTime", rawTimeArrayBuilder);
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
