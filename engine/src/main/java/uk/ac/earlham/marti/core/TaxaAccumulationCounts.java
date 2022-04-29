/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

/**
 *
 * @author leggettr
 */
public class TaxaAccumulationCounts {
    private int[] taxaCounts = new int[11];
    private int fastaChunkNumber = 0;
    private int chunkNumberByOrderCompleted = 0;
    private int nReadsAnalysed = 0;
    private int minsSinceStart = 0;
    
    public TaxaAccumulationCounts(int fcn, int cnboc, int nReads, int mins) {
        fastaChunkNumber = fcn;
        chunkNumberByOrderCompleted = cnboc;
        nReadsAnalysed = nReads;
        minsSinceStart = mins;
            
        for (int i=0; i<=10; i++) {
            taxaCounts[i] = 0;
        }
    }
    
    public void addCount(int rank, int count) {
        taxaCounts[rank] = count;
    }
    
    public int getCount(int rank) {
        return taxaCounts[rank];
    }
    
    public int getReadsAnalysedCount() {
        return nReadsAnalysed;
    }
    
    public int getMinsSinceStart() {
        return minsSinceStart;
    }
}
