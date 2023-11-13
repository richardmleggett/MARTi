/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.zip.GZIPInputStream;
import uk.ac.earlham.marti.core.MARTiLog;

/**
 * Carry out Lowest Common Ancestor based classification.
 * 
 * @author Richard M. Leggett
 */
public class LCAFileParser {
    private Hashtable<String, Integer> countPerTarget = new Hashtable<String, Integer>();
    private Hashtable<String, LCAHitSet> hitsByQuery = new Hashtable<String, LCAHitSet>();
    private Hashtable<Long, Integer> countsPerTaxon = new Hashtable<Long, Integer>(); 
    private Hashtable<String, Integer> equalsPerQuery = new Hashtable<String, Integer>();
    private Taxonomy taxonomy;
    private AccessionTaxonConvertor accTaxConvert;
    private LCAParseOptions options;
    private MARTiLog log;
    private String lastFilename = "";
    private boolean keepRejectedAlignments = false;
    private boolean runningCARD;

    public LCAFileParser(Taxonomy t, LCAParseOptions o, AccessionTaxonConvertor atc, boolean rCard, MARTiLog l) {
        taxonomy = t;
        options = o;
        accTaxConvert = atc;
        runningCARD = rCard;
        log = l;
    }
    
    private void logEqual(String queryName) {
        int count = 1;
        if (equalsPerQuery.containsKey(queryName)) {
            count = equalsPerQuery.get(queryName);
        }
        count++;
        equalsPerQuery.put(queryName, count);
    }

    private LCAHit createNewHit(Taxonomy t, AccessionTaxonConvertor atc, String line) {
        LCAHit hit = null;
        
        if (options.getFileFormat() == LCAParseOptions.FORMAT_PAF) {
            hit = new PAFHit(t, atc, line);
        } else if (options.getFileFormat() == LCAParseOptions.FORMAT_SAM) {
            hit = new SAMHit(t, atc, line);
        } else if ((options.getFileFormat() == LCAParseOptions.FORMAT_NANOOK) ||
                   (options.getFileFormat() == LCAParseOptions.FORMAT_BLASTTAB) || 
                   (options.getFileFormat() == LCAParseOptions.FORMAT_BLASTTAXON))
        {
            hit = new BlastHit(t, atc, line, options.getFileFormat(), true, runningCARD);
        } else {
            System.out.println("Error in crerateNewHit - unexpected format\n");
            System.exit(1);
        }
         
        return hit;
    }
    
    private LCAHitSet createNewHitSet(String query) {
        LCAHitSet hs = null;
        
        if (options.getFileFormat() == LCAParseOptions.FORMAT_PAF) {
            hs = new PAFHitSet(query);
        } else if (options.getFileFormat() == LCAParseOptions.FORMAT_SAM) {
            hs = new SAMHitSet(query);
        } else if ((options.getFileFormat() == LCAParseOptions.FORMAT_NANOOK) ||
                   (options.getFileFormat() == LCAParseOptions.FORMAT_BLASTTAB) ||
                   (options.getFileFormat() == LCAParseOptions.FORMAT_BLASTTAXON))
        {
            BlastHitSet bhs = new BlastHitSet(query, options);
            if (keepRejectedAlignments) {
                bhs.setKeepRejectedAlignments();
            }
            hs = bhs;            
        } else {
            System.out.println("Error in crerateNewHitSet - unexpected format\n");
            System.exit(1);
        }
                
        return hs;
    }
    
    /**
    * Carry out LCA on a file. Uses LCAHit abstraction, so could be BLAST, SAM etc. 
    *
    * @param  filename   filename of alignment (e.g. BLAST) file
    * @return number of reads with hits
    */
    public int parseFile(String filename) {
        BufferedReader br = null;
        InputStream fileStream = null;
        InputStream gzipStream = null;
        Reader decoder = null;
        
        try {
            File f = new File(filename);
            if (f.exists()) {
                br = new BufferedReader(new FileReader(filename));
            } else {
                filename = filename + ".gz";
                f = new File(filename);
                if (f.exists()) {
                    fileStream = new FileInputStream(filename);
                    gzipStream = new GZIPInputStream(fileStream);
                    decoder = new InputStreamReader(gzipStream, "US-ASCII");
                    br = new BufferedReader(decoder);    
                } else {
                    log.printlnLogAndScreen("Error: can't find " + filename +" or unzipped version");
                }
            }
            
            if (br != null) {
                String line;
                String lastQuery = "";
                int equal = 0;

                do {
                    line = br.readLine();
                    if (line != null) {
                        if (line.length() > 1) {
                            LCAHit ah = createNewHit(taxonomy, accTaxConvert, line);
                            long taxonId = ah.getTaxonId();
                            String queryName = ah.getQueryName();
                            LCAHitSet hs;

                            if (hitsByQuery.containsKey(queryName)) {
                                hs = hitsByQuery.get(queryName);
                            } else {
                                hs = createNewHitSet(queryName);
                            }
                            hs.addAlignment(ah);

                            hitsByQuery.put(queryName, hs);
                        }
                    }
                } while (line != null);
                lastFilename = filename;

                br.close();
                if(fileStream != null) {
                    decoder.close();
                    gzipStream.close();
                    fileStream.close();
                }

                //printEquals();
            }
        } catch (Exception e) {
            System.out.println("readProcessFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }
        
        return hitsByQuery.size();
    }
    
    public ArrayList<String> removePoorAlignments() {
        Set<String> keys = hitsByQuery.keySet();
        ArrayList<String> idsToRemove = new ArrayList<String>();
        for (String queryName : keys) {
            LCAHitSet hs = hitsByQuery.get(queryName);
            if (!hs.hasGoodAlignment()) {
                idsToRemove.add(queryName);
                //System.out.println("Removed poor alignment for read "+queryName);
            }
        }    
                
        for (int i=0; i<idsToRemove.size(); i++) {
            //System.out.println("Removing "+idsToRemove.get(i));
            hitsByQuery.remove(idsToRemove.get(i));
        }
        
        return idsToRemove;
    }
        
    /**
    * Write results to summary file. 
    *
    * @param  summaryFilename   per taxon summary file
    * @param  perReadFilename   per read file
    */
    public void writeResults(String summaryFilename, String perReadFilename) {
        int totalCount = 0;
        int unknownTaxaCount = 0;
        Set<String> keys = hitsByQuery.keySet();
        
        try {
            //System.out.println("Writing "+perReadFilename);
            PrintWriter pwPerRead = new PrintWriter(new FileWriter(perReadFilename));
            
            for (String queryName : keys) {
                LCAHitSet hs = hitsByQuery.get(queryName);
                
                if (hs.getNumberOfAlignments() > 0) {
                    if (hs.hasGoodAlignment()) {
                        if (hs.hasUnknownTaxa()) {
                            unknownTaxaCount++;
                        }
                        
                        if (options.sortHitsbyBitscore()) {
                            hs.sortHits();                
                        }
                        
                        long ancestor = taxonomy.findAncestor(hs, options.getMaxHitsToConsider(), options.limitToSpecies());
                        int count = 0;
                        if (countsPerTaxon.containsKey(ancestor)) {
                            count = countsPerTaxon.get(ancestor);
                        }
                        count++;
                        countsPerTaxon.put(ancestor, count);
                        totalCount++;

                        String ancestorRank = "";
                        TaxonomyNode n = taxonomy.getNodeFromTaxonId(ancestor);
                        if (n != null) {
                            ancestorRank = n.getRankString();
                        }

                        pwPerRead.println(queryName + "\t" + ancestor + "\t" + taxonomy.getNameFromTaxonId(ancestor)+ "\t" +ancestorRank);
                        hs.setAssignedTaxon(ancestor);
                    } else {
                        pwPerRead.println(queryName + "\t0\tUnassigned\tBadAlignment");
                    }                
                } else {
                    pwPerRead.println(queryName + "\t0\tUnassigned\tNoAlignments");
                }
            }
            
            pwPerRead.close();
        } catch (Exception e) {
            System.out.println("readProcessFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }        
        
        // Sort
        List<Map.Entry<Long, Integer>> list = new ArrayList<Entry<Long, Integer>>(countsPerTaxon.entrySet());

        Collections.sort(list, new Comparator<Map.Entry<Long, Integer>>(){
         public int compare(Entry<Long, Integer> a, Entry<Long, Integer> b) {
             return b.getValue().compareTo(a.getValue());
         }
        });
        
        if (unknownTaxaCount > 0) {
            System.out.println("Warning: "+unknownTaxaCount + " reads with unknown taxa");
        }
        
        //System.out.println("Writing "+summaryFilename);
        // Write
        int expectedCount = 0;
        int relativeCount = 0;
        int genusCount = 0;
        int otherCount = 0;
        long expectedTaxon = options.getExpectedTaxon();
        long relatedTaxon = 0;
        long expectedGenus = 0;
        
        if (expectedTaxon > 0) {
            relatedTaxon = options.getRelatedTaxon();
            expectedGenus = taxonomy.getGenus(expectedTaxon);
            System.out.println("Genus of expected is "+expectedGenus + " (" + taxonomy.getTaxonomyStringFromId(expectedGenus) + ")");
        }
        
        try {
            PrintWriter pw = new PrintWriter(new FileWriter(summaryFilename));
            Set<Long> allTaxon = countsPerTaxon.keySet();
            //for (Long taxon : allTaxon) {
            //    pw.println(taxon + "\t" + countsPerTaxon.get(taxon));
            //    System.out.println(countsPerTaxon.get(taxon) + "\t" + taxon +"\t" + taxonomy.getTaxonomyStringFromId(taxon));
            //}

            for (Map.Entry<Long, Integer> entry : list) {
                Long taxon = entry.getKey();
                int count = countsPerTaxon.get(taxon);
                double percent = (100 * (double)count) / (double)totalCount;
                String taxonName = taxonomy.getTaxonomyStringFromId(taxon);                
                String rank = "";
                TaxonomyNode n = taxonomy.getNodeFromTaxonId(taxon);
                if (n != null) {
                    rank = n.getRankString();
                }
                
                pw.printf("%d\t%.2f\t%d\t%s\t%s\n", count, percent, taxon, taxonName, rank);
                //System.out.printf("%d\t%.2f\t%d\t%s\n", count, percent, taxon, taxonName);
                
                if (expectedTaxon > 0) {
                    long thisGenus = taxonomy.getGenus(taxon);
                    if (taxon == expectedTaxon) {
                        expectedCount+=count;
                    } else if (taxon == relatedTaxon) {
                        relativeCount+=count;
                    } else if (thisGenus == expectedGenus) {
                        genusCount+=count;
                    } else {
                        otherCount+=count;
                    }
                }
            }  

            pw.close();
        } catch (Exception e) {
            System.out.println("readProcessFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }
        
        System.out.println("Writing " + summaryFilename + " (" + totalCount + ")");

        if (expectedTaxon > 0) {
            System.out.println("");
            System.out.println("Expected: " + expectedCount);
            System.out.println("Relative: " + relativeCount);
            System.out.println("   Genus: " + genusCount);
            System.out.println("   Other: " + otherCount);            
            System.out.println("");
            System.out.println("AllFields:\tExpect\tRelated\tGenus\tOther");
            System.out.println("Summary:\t"+expectedCount+"\t"+relativeCount+"\t"+genusCount+"\t"+otherCount);
            System.out.printf("SummaryPc:\t%.2f\t%.2f\t%.2f\t%.2f\n",
                (100 * (double)expectedCount)/(double)totalCount,
                (100 * (double)relativeCount)/(double)totalCount,
                (100 * (double)genusCount)/(double)totalCount,
                (100 * (double)otherCount)/(double)totalCount);
        }        
    }
    
    /**
    * Get filename of last BLAST file parsed.
    *
    * @return Filename of last BLAST file parsed.
    */
    public String getLastParsedFilename() {
        return lastFilename;
    }
    
    private void printEquals() {
        int count = 0;
        Set<String> keys = equalsPerQuery.keySet();
        for (String queryName : keys) {
            System.out.println(queryName + " has " + equalsPerQuery.get(queryName));
            count++;
        } 
        System.out.println("Total equals count " + count);
    }
    
    public void printResults(AccessionTaxonConvertor atc) {
//        Set<String> keys = countPerTarget.keySet();
//        for (String targetName : keys) {
//            System.out.println(targetName + " " + countPerTarget.get(targetName));
//        }
        
       List<Map.Entry<Long, Integer>> list = new ArrayList<Entry<Long, Integer>>(countsPerTaxon.entrySet());

       Collections.sort(list, new Comparator<Map.Entry<Long, Integer>>(){
         public int compare(Entry<Long, Integer> a, Entry<Long, Integer> b) {
             return b.getValue().compareTo(a.getValue());
         }
       });

        for( Map.Entry<Long, Integer> entry : list  ){
            Long taxon = entry.getKey();
            int count = entry.getValue();
            System.out.println(countsPerTaxon.get(taxon) + "\t" + taxon + "\t" + taxonomy.getTaxonomyStringFromId(taxon));            
        }        
    }
    
    /**
    * Return hashtable of hits to query. 
    *
    * @return  hashtable of hits to query.
    */
    public Hashtable<String, LCAHitSet> getHitsByQuery() {
        return hitsByQuery;
    }
    
    public void setKeepRejectedAlignments() {
        keepRejectedAlignments = true;
    }    
    
    public void clearRejectedAlignments() {
        Set<String> keys = hitsByQuery.keySet();
        for (String queryName : keys) {
            LCAHitSet hs = hitsByQuery.get(queryName);
            hs.removeRejectedAlignments();
        }        
    }
    
    public LCAParseOptions getOptions() {
        return options;
    }
}
