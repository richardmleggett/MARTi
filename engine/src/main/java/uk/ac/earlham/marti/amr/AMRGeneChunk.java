/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

import java.util.Hashtable;

/**
 * Store AMR gene counts, accuracy etc. at per-chunk level
 * 
 * @author Richard M. Leggett
 */
public class AMRGeneChunk {
    private int overallCount = 0;
    private Hashtable<String, Integer> speciesToCount = new Hashtable<String, Integer>();
    double cumulativeIdentity = 0.0;
    int numberOfHits = 0;
    
    public void addHit(String lcaHit, boolean isIndependent, double identity) {
        int count = 0;
        if (speciesToCount.containsKey(lcaHit)) {
            count = speciesToCount.get(lcaHit);
        }
        count++;
        speciesToCount.put(lcaHit, count);
        overallCount++;
        cumulativeIdentity += identity;
        numberOfHits++;
    }
    
    public int getOverallCount() {
        return overallCount;
    }
    
    public int getCountForSpecies(String species) {
        int count = 0;
        
        if (speciesToCount.containsKey(species)) {
            count = speciesToCount.get(species);
        }
        
        return count;
    }    
    
    public double getCumulativeIdentity() {
        return cumulativeIdentity;
    }
    
    public int getNumberOfHits() {
        return numberOfHits;
    }
}
