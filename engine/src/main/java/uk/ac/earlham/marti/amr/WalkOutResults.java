/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

import java.awt.Font;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * Store AMR walkout results
 * 
 * @author Richard M. Leggett
 */
public class WalkOutResults {
    private MARTiEngineOptions options;
    private Hashtable<String, Integer> bacteriaIndependentMatches = new Hashtable<String, Integer>();
    private Hashtable<String, Integer> bacteriaNotIndependentMatches = new Hashtable<String, Integer>();
    private Hashtable<String, AMRGene> amrGenes = new Hashtable<String, AMRGene>();
    private Hashtable<Integer, Integer> countPerChunk = new Hashtable<Integer, Integer>();
    private Hashtable<Integer, String> chunkTimes = new Hashtable<Integer, String>();
    private int maxChunkNumber = 0;
    private CARDOntology cardOntology = null;

    public WalkOutResults(MARTiEngineOptions o, CARDOntology ont) {
        options = o;
        cardOntology = ont;
    }        
    
    // UPDATE TO WRITE HITS TO FILE
    public void addWalkoutHit(String cardHit, String lcaHit, long lcaHitTaxonID, int originalChunkNumber, int processedChunkNumber, boolean isIndependent, int overlap, double identity) {       
        // Update overall count
        int chunkCount = 0;
        if (countPerChunk.containsKey(processedChunkNumber)) {
            chunkCount = countPerChunk.get(processedChunkNumber);
        }
        chunkCount++;
        countPerChunk.put(processedChunkNumber, chunkCount);
        if (processedChunkNumber > maxChunkNumber) {
            maxChunkNumber = processedChunkNumber;
        }

        // cardHit should be of form ARO:3003923|oqxB at this point
        AMRGene gene;
        
        // Check if we have the gene already - if not create it
        if (amrGenes.containsKey(cardHit)) {
            gene = amrGenes.get(cardHit);
        } else {
            gene = new AMRGene(cardHit, cardOntology);
            amrGenes.put(cardHit, gene);
        }
        
        // Now add this hit
        gene.addHit(originalChunkNumber, processedChunkNumber, lcaHitTaxonID, isIndependent, identity);
        
        if (lcaHit != null) {
            if (isIndependent) {
                int count = 0;
                Integer c = bacteriaIndependentMatches.get(lcaHit);

                if (c != null) {
                    count = c.intValue();
                }

                count ++;

                bacteriaIndependentMatches.put(lcaHit, count);
            } else {
                int count = 0;
                Integer c = bacteriaNotIndependentMatches.get(lcaHit);

                if (c != null) {
                    count = c.intValue();
                }

                count ++;

                bacteriaNotIndependentMatches.put(lcaHit, count);
            }
        }
    }
    
    public int getMaxChunkNumber() {
        return maxChunkNumber;
    }
    
    public int getChunkHitCount(int n) {
        int count = 0;
        
        if (countPerChunk.containsKey(n)) {
            count = countPerChunk.get(n);
        }
        
        return count;
    }
        
    public int getNumberOfGenes() {
        return amrGenes.size();
    }
    
    public Hashtable<String, AMRGene> getGenes() {
        return amrGenes;
    }
    
    public static HashMap sortByValues(HashMap map) { 
         List list = new LinkedList(map.entrySet());

         // Defined Custom Comparator here
         Collections.sort(list, new Comparator() {
              public int compare(Object o1, Object o2) {
                 return ((Comparable) ((Map.Entry) (o2)).getValue())
                    .compareTo(((Map.Entry) (o1)).getValue());
              }
         });

         // Here I am copying the sorted list in HashMap
         // using LinkedHashMap to preserve the insertion order
         HashMap sortedHashMap = new LinkedHashMap();
         for (Iterator it = list.iterator(); it.hasNext();) {
                Map.Entry entry = (Map.Entry) it.next();
                sortedHashMap.put(entry.getKey(), entry.getValue());
         } 

         return sortedHashMap;
    }    
    
    public void setChunkTime(int c, String t) {
        chunkTimes.put(c, t);
    }
    
    public String getChunkTime(int c) {
        String t = "";
        
        if (chunkTimes.containsKey(c)) {
            t = chunkTimes.get(c);
        }
        
        return t;
    }
} 
