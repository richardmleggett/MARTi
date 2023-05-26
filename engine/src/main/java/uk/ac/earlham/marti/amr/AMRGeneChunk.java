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
    private Hashtable<Long, Integer> speciesToCount = new Hashtable<Long, Integer>();
    double cumulativeIdentity = 0.0;
    int numberOfHits = 0;
    
    public void addHit(Long lcaHitTaxonID, boolean isIndependent, double identity) {
        int count = 0;
        if (speciesToCount.containsKey(lcaHitTaxonID)) {
            count = speciesToCount.get(lcaHitTaxonID);
        }
        count++;
        speciesToCount.put(lcaHitTaxonID, count);
        //System.out.println("Updated count for "+lcaHit+" to "+count);
        overallCount++;
        cumulativeIdentity += identity;
        numberOfHits++;
    }
    
    public int getOverallCount() {
        return overallCount;
    }
    
    public int getCountForSpecies(Long speciesID) {
        int count = 0;
        
        if (speciesToCount.containsKey(speciesID)) {
            count = speciesToCount.get(speciesID);
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
