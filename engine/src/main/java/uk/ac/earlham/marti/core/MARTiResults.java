/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.BufferedReader;
import uk.ac.earlham.lcaparse.SimplifiedRank;
import uk.ac.earlham.marti.amr.AMRResults;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.Reader;
import java.io.StringWriter;
import java.io.Writer;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;
import java.util.Set;
import java.util.zip.GZIPInputStream;
import uk.ac.earlham.lcaparse.LCAFileParser;
import uk.ac.earlham.lcaparse.LCAHitSet;
import uk.ac.earlham.lcaparse.Taxonomy;
import uk.ac.earlham.lcaparse.TaxonomyNode;
import javax.json.*;
import javax.json.stream.JsonGenerator;
import uk.ac.earlham.lcaparse.TaxonomyNodeData;
import uk.ac.earlham.marti.centrifuge.CentrifugeClassifierItem;
import uk.ac.earlham.marti.kraken2.Kraken2ClassifierItem;

/**
 * Represent overall results (essentially, taxonomic classifications) for all barcodes.
 * 
 * @author Richard M. Leggett
 */
public class MARTiResults {
    private MARTiEngineOptions options = null;
    //private Hashtable<Integer, MARTiResultsSample> sampleResults = new Hashtable<Integer, MARTiResultsSample>();
    private Hashtable<Integer, Integer> chunkCount = new Hashtable<Integer, Integer>();
    private Taxonomy taxonomy = null;
    private Hashtable<Integer, AMRResults> amrResults = new Hashtable<Integer, AMRResults>();
    private Hashtable<Integer, ArrayList<String>> fileOrder = new Hashtable<Integer, ArrayList<String>>();
    private Hashtable<Integer, TaxaAccumulation> taxaAccumulation = new Hashtable<Integer, TaxaAccumulation>();
    private SimplifiedRank mr = new SimplifiedRank();
    
    /**
    * Class constructor.
    * 
    * @param  o  global MARTiEngineOptions object
    */
    public MARTiResults(MARTiEngineOptions o) {
        options = o;
    }

    /**
    * Add a parsed BLAST chunk to the results list. 
    *
    * @param  bc   barcode index (or 0 if not barcoded)
    * @param  pfp  LCAFileParser object of the parsed file
    * @return chunk number 
    */
    public int addChunk(int bc, LCAFileParser pfp) {
        int fileCount = 0;
        
        options.getLog().println("MARTiResults received file for barcode "+bc);
        //MARTiResultsSample sample;
        taxonomy = options.getReadClassifier().getTaxonomy();

        //if (sampleResults.containsKey(bc)) {
        //    sample = sampleResults.get(bc);
        //} else {
        //    sample = new MARTiResultsSample(bc, options);
        //    sampleResults.put(bc, sample);
        //}
        
        //sample.addFile(pfp);    
        
        Hashtable<String, LCAHitSet> hitsByQuery = pfp.getHitsByQuery();
        Set<String> keys = hitsByQuery.keySet();        
        for (String queryName : keys) {
            LCAHitSet hs = hitsByQuery.get(queryName);      
            long taxon = hs.getAssignedTaxon();
            long readLength = options.getReadStatistics().getReadLength(bc, queryName, true);
            taxonomy.countRead(bc, taxon, readLength);            
        }
        
        if (chunkCount.containsKey(bc)) {
            fileCount = chunkCount.get(bc);
        }        
        fileCount++;        
        chunkCount.put(bc, fileCount);

        ArrayList<String> l;
        if (fileOrder.containsKey(bc)) {
            l = fileOrder.get(bc);        
        } else {
            l = new ArrayList<String>();
            fileOrder.put(bc, l);
        }
        l.add(pfp.getLastParsedFilename());
        
        return fileCount;
    }
        
    /**
    * Output a taxon node to the JSON. 
    *
    * @param  bc    barcode index (or 0 if not barcoded)
    * @param  n     the node to output
    * @param  jf    the JSON file we're writing to
    * @param  comma true if there should be a comma after this element
    */
    private void outputNode(int bc, TaxonomyNode n, JsonObjectBuilder treeBuilder, PrintWriter pwAssignments, boolean useLCA) {                
        if (n != null) {
            ArrayList<TaxonomyNode> children = n.getChildren();
            String ncbiRankString = n.getRankString();
            int summedCount;
            int assignedCount;
            long yield;
            long summedYield;
            int rank = 0;

            if (useLCA) {
                summedCount = n.getLCASummed(bc);
                assignedCount = n.getLCAAssigned(bc);
                yield = n.getLCAYield(bc);
                summedYield = n.getLCASummedYield(bc);
            } else {
                summedCount = n.getSummed(bc);
                assignedCount = n.getAssigned(bc);
                yield = n.getAssignedYield(bc);
                summedYield = n.getSummedYield(bc);
            }
            
            // If root node, need to add unclassified count
            if (n.getId() == 1) {
                summedCount += options.getSampleMetaData(bc).getReadsUnclassified();
                summedYield  += options.getSampleMetaData(bc).getYieldUnclassified();
            }            
                     
            rank = mr.getRankFromString(ncbiRankString);
                        
            treeBuilder.add("name", taxonomy.getNameFromTaxonId(n.getId()));
            treeBuilder.add("rank", rank);
            treeBuilder.add("ncbiRank", ncbiRankString);
            treeBuilder.add("ncbiID", n.getId());
            treeBuilder.add("value", assignedCount);
            treeBuilder.add("summedValue", summedCount);
            treeBuilder.add("yield", yield);
            treeBuilder.add("summedYield", summedYield);
            
            TaxonomyNodeData tnd = taxonomy.getNodeData(n.getId());
            if (tnd != null) {
                String meanStr = String.format("%.1f", tnd.getMeanMean());
                String maxStr = String.format("%.1f", tnd.getMeanMax());
                tnd.calculateMeans();
                treeBuilder.add("meanIdentity", meanStr);
                treeBuilder.add("meanMaxIdentity", maxStr);               
            }
            
            if(pwAssignments != null) {
                pwAssignments.print(taxonomy.getNameFromTaxonId(n.getId()) + ",");
                pwAssignments.println(n.getId() + "," + assignedCount + "," + summedCount);
            }
            
            // Now output children as array
            JsonArrayBuilder arrayBuilder = Json.createArrayBuilder();
            for (int i=0; i<children.size(); i++) {
                TaxonomyNode c = children.get(i);
                int childSummarisedCount;
                
                if (useLCA) {
                    childSummarisedCount = c.getLCASummed(bc);
                } else {
                    childSummarisedCount = c.getSummed(bc);
                }
                
                if (childSummarisedCount > 0) {
                    JsonObjectBuilder childBuilder = Json.createObjectBuilder();
                    outputNode(bc, c, childBuilder, pwAssignments, useLCA);
                    arrayBuilder.add(childBuilder);                  
                }                
                
            }        

            // Add unclassified to root node
            if (n.getId() == 1) {
                JsonObjectBuilder unclassifiedBuilder = Json.createObjectBuilder();
                JsonArrayBuilder unclassifiedArrayBuilder = Json.createArrayBuilder();
                int unclassifiedCount = options.getSampleMetaData(bc).getReadsUnclassified();
                long unclassifiedYield = options.getSampleMetaData(bc).getYieldUnclassified();
                unclassifiedBuilder.add("name", "unclassified");
                unclassifiedBuilder.add("rank", 0);
                unclassifiedBuilder.add("ncbiRank", "no rank");
                unclassifiedBuilder.add("ncbiID", 0);
                unclassifiedBuilder.add("value", unclassifiedCount);
                unclassifiedBuilder.add("summedValue", unclassifiedCount);
                unclassifiedBuilder.add("yield", unclassifiedYield);
                unclassifiedBuilder.add("summedYield", unclassifiedYield);
                unclassifiedBuilder.add("children", unclassifiedArrayBuilder);
                arrayBuilder.add(unclassifiedBuilder);                  
            }                                    

            treeBuilder.add("children", arrayBuilder);
        } else {
            System.out.println("Error: null node passed to outputNode!");
        }
    }    
    
    /**
    * Write JSON file. 
    *
    * @param  bc    barcode index (or 0 if not barcoded)
    */
    public synchronized void writeTree(int bc, double minSupport) {
        int fileCount = 0;
        String jsonFilename;
        String jsonFilenameFinal;
        String assignmentsFilename;
        String assignmentsFilenameFinal;
        PrintWriter pwAssignments = null;
                
        if (chunkCount.containsKey(bc)) {
            fileCount = chunkCount.get(bc);
        } else {
            System.out.println("Error: no chunk count found in writeJSONFile");
            System.exit(1);
        }
        
        if (bc > 0) {
            jsonFilename = options.getLCAParseDirectory() + File.separator + "tree_barcode" + bc + "_ch" + fileCount + "_ms" + minSupport + ".json";
            assignmentsFilename = options.getLCAParseDirectory() + File.separator + "assignments_barcode" + bc + "_ch" + fileCount + "_ms" + minSupport + ".csv";
        } else {
            jsonFilename = options.getLCAParseDirectory() + File.separator + "tree_ch" + fileCount + "_ms" + minSupport + ".json";
            assignmentsFilename = options.getLCAParseDirectory() + File.separator + "assignments_ch" + fileCount + "_ms" + minSupport + ".csv";
        }

        jsonFilenameFinal = options.getMARTiJSONDirectory(bc) + File.separator + "tree_ms" + minSupport + ".json";
        assignmentsFilenameFinal = options.getMARTiJSONDirectory(bc) + File.separator + "assignments_ms" + minSupport + ".csv";
        
        // Open assignments file
        try {
            pwAssignments = new PrintWriter(new FileWriter(assignmentsFilename, false));
        } catch (Exception e) {
            System.out.println("Error in openPutativePathogenReadFile");
            e.printStackTrace();
            System.exit(1);
        }        
        
        options.getLog().printlnLogAndScreen("Writing MARTi tree JSON to "+jsonFilename);
        options.getLog().println("Writing assignments to "+assignmentsFilename);
        ArrayList<String> fo;
        if (fileOrder.containsKey(bc)) {
            fo = fileOrder.get(bc);
            for (int i=0; i<fo.size(); i++) {
                options.getLog().println("File "+i+": "+fo.get(i));
            }
        } else {
            System.out.println("Error: couldn't find file order for barcode "+bc);
        }

        // Create tree object
        JsonObjectBuilder treeBuilder = Json.createObjectBuilder();
        
        // Adjust for min support
        long startTime = System.nanoTime();
        // minSuppport of 100 is special case to output the non-LCA counts
        if (minSupport < 100) {
            taxonomy.adjustForMinSupport(bc, minSupport, true);
        }
        long timeDiff = (System.nanoTime() - startTime) / 1000000;
        options.getLog().println("Timing: Min support refactoring for barcode "+bc+" minSupport "+minSupport+" completed in "+timeDiff+" ms");

        
        TaxonomyNode n = taxonomy.getNodeFromTaxonId(1L);

        // minSuppport of 100 is special case to output the non-LCA counts
        if (minSupport == 100) {
            outputNode(bc, n, treeBuilder, pwAssignments, false);
        } else {
            outputNode(bc, n, treeBuilder, pwAssignments, true);
        }
                     
        JsonObjectBuilder treeYieldBuilder = Json.createObjectBuilder();
        // Adjust for min support
        startTime = System.nanoTime();
        // minSuppport of 100 is special case to output the non-LCA counts
        if (minSupport < 100) {
            taxonomy.adjustForMinSupport(bc, minSupport, false);
        }
        timeDiff = (System.nanoTime() - startTime) / 1000000;
        options.getLog().println("Timing: Min support refactoring for barcode "+bc+" minSupport "+minSupport+" completed in "+timeDiff+" ms");

        // minSuppport of 100 is special case to output the non-LCA counts
        if (minSupport == 100) {
            outputNode(bc, n, treeYieldBuilder, null, false);
        } else {
            outputNode(bc, n, treeYieldBuilder, null, true);
        }
        
        
        // Build meta data
        JsonObjectBuilder metaBuilder = Json.createObjectBuilder();
        metaBuilder.add("martiVersion", MARTiEngine.VERSION_STRING);
        LocalDateTime date = LocalDateTime.now();
        String dateTimeString = date.truncatedTo(ChronoUnit.SECONDS).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME).toString();
        metaBuilder.add("fileWritten", dateTimeString);
                        
        JsonObjectBuilder fileBuilder = Json.createObjectBuilder();
        ArrayList<String> files = fileOrder.get(bc);
        for (int i=0; i<files.size(); i++) {
            fileBuilder.add(Integer.toString(i), files.get(i));
        }
        metaBuilder.add("blastFiles", fileBuilder);
        
        // Build top-level object
        JsonObjectBuilder objectBuilder = Json.createObjectBuilder();
        objectBuilder.add("meta", metaBuilder);
        objectBuilder.add("tree", treeBuilder);
        objectBuilder.add("treeYield", treeYieldBuilder);
        JsonObject jsonObject = objectBuilder.build();        

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
            pwAssignments.close();
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }        

        options.getLog().println("Finished MARTi tree JSON");
        options.copyFile(jsonFilename, jsonFilenameFinal);
        //options.copyFile(assignmentsFilename,  assignmentsFilenameFinal); // No longer needed by GUI      
    }    
    
    /**
    * Get AMR results object. 
    *
    * @param   bc  barcode for results
    * @return  AMR results object
    */
    public AMRResults getAMRResults(int bc) {
        AMRResults results = null;
        
        // Create AMRResults object for this barcode if it doesn't exist
        if (amrResults.containsKey(bc)) {
            results = amrResults.get(bc);
        } else {
            results = new AMRResults(options, bc);
            amrResults.put(bc, results);
        }
        
        return results;
    }    
    
    public void storeAccumulationData(int bc, int fastaChunkNumber, int chunkNumberByOrderCompleted, int nReadsAnalysed, int minsSinceStart, double minSupport) {
        TaxaAccumulation ta;

        if (taxaAccumulation.containsKey(bc)) {
            ta = taxaAccumulation.get(bc);
        } else {
            ta = new TaxaAccumulation(options, this, bc);
            taxaAccumulation.put(bc, ta);
        }
        
        ta.storeAccumulation(fastaChunkNumber, chunkNumberByOrderCompleted, nReadsAnalysed, minsSinceStart, minSupport);
    }
    
    public void writeAccumulationJson(int bc, double minSupport) {
        TaxaAccumulation ta;

        if (taxaAccumulation.containsKey(bc)) {
            ta = taxaAccumulation.get(bc);
            ta.writeJSON(minSupport);
        } else {
            options.getLog().printlnLogAndScreen("Error: can't find accumulation data for barcode "+bc);
        }
    }
    
    public int addChunk(int bc, CentrifugeClassifierItem cci) {
        int fileCount = 0;
        
        options.getLog().println("MARTiResults received file for barcode "+bc);
        SampleMetaData md = options.getSampleMetaData(bc);
        taxonomy = options.getReadClassifier().getTaxonomy();

        // Read the Centrifuge file - no need for some intermediate class to 
        // hold all of this data when all we do it write it back out.
        BufferedReader br;
        InputStream fileStream = null;
        InputStream gzipStream = null;
        Reader decoder = null;
        String filename = cci.getClassificationFile();
        try {
            File f = new File(filename);
            if(f.exists()){
                br = new BufferedReader(new FileReader(filename));
            } else {
                filename = filename + ".gz";
                fileStream = new FileInputStream(filename);
                gzipStream = new GZIPInputStream(fileStream);
                decoder = new InputStreamReader(gzipStream, "US-ASCII");
                br = new BufferedReader(decoder);    
            }
            
            //ignore header line
            int readsClassified = 0;
            long totalBpClassified = 0l;
            String line = br.readLine();
            while ((line = br.readLine()) != null) {
                String[] fields = line.split("\\t");
                //TODO: min hit length
                long taxid = Long.parseLong(fields[2]);
                long readLength = Long.parseLong(fields[6]);
                taxonomy.countRead(bc, taxid, readLength);
                readsClassified++;
                totalBpClassified += readLength;
            }
            
            br.close();
            if(fileStream != null) {
                decoder.close();
                gzipStream.close();
                fileStream.close();
            }
            
            md.addToReadsClassified(readsClassified, totalBpClassified);
            
        } catch (Exception e) {
            System.out.println("readProcessFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }

     
        
        if (chunkCount.containsKey(bc)) {
            fileCount = chunkCount.get(bc);
        }        
        fileCount++;        
        chunkCount.put(bc, fileCount);

        ArrayList<String> l;
        if (fileOrder.containsKey(bc)) {
            l = fileOrder.get(bc);        
        } else {
            l = new ArrayList<String>();
            fileOrder.put(bc, l);
        }
        l.add(filename);
        
        return fileCount;
    }
    
    public int addChunk(int bc, Kraken2ClassifierItem k2ci) {
        int fileCount = 0;
        
        options.getLog().println("MARTiResults received file for barcode "+bc);
        SampleMetaData md = options.getSampleMetaData(bc);
        taxonomy = options.getReadClassifier().getTaxonomy();

        // Read the Kraken2 file - no need for some intermediate class to 
        // hold all of this data when all we do is write it back out.
        BufferedReader br;
        InputStream fileStream = null;
        InputStream gzipStream = null;
        Reader decoder = null;
        String filename = k2ci.getClassificationFile();
        try {
            File f = new File(filename);
            if(f.exists()){
                br = new BufferedReader(new FileReader(filename));
            } else {
                filename = filename + ".gz";
                fileStream = new FileInputStream(filename);
                gzipStream = new GZIPInputStream(fileStream);
                decoder = new InputStreamReader(gzipStream, "US-ASCII");
                br = new BufferedReader(decoder);    
            }
            
            //ignore header line
            int readsClassified = 0;
            long totalBpClassified = 0l;
            String line = br.readLine();
            while ((line = br.readLine()) != null) {           
                String[] fields = line.split("\\t");
                if(fields[0].equalsIgnoreCase("C")) {
                    long taxid = Long.parseLong(fields[2]);
                    long readLength = Long.parseLong(fields[3]);
                    taxonomy.countRead(bc, taxid, readLength);
                    readsClassified++;
                    totalBpClassified += readLength;   
                }
            }
            
            br.close();
            if(fileStream != null) {
                decoder.close();
                gzipStream.close();
                fileStream.close();
            }
            
            md.addToReadsClassified(readsClassified, totalBpClassified);
            
        } catch (Exception e) {
            System.out.println("readProcessFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }

     
        
        if (chunkCount.containsKey(bc)) {
            fileCount = chunkCount.get(bc);
        }        
        fileCount++;        
        chunkCount.put(bc, fileCount);

        ArrayList<String> l;
        if (fileOrder.containsKey(bc)) {
            l = fileOrder.get(bc);        
        } else {
            l = new ArrayList<String>();
            fileOrder.put(bc, l);
        }
        l.add(filename);
        
        return fileCount;
    }
}
