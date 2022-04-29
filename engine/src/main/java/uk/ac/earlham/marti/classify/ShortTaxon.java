/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.classify;

/**
 * Short form representation of taxon data - just ID, path and count.
 * 
 * @author Richard M. Leggett
 */
public class ShortTaxon {
    private long taxonId;
    private String taxonPath;
    private long readCount = 0;
    
    public ShortTaxon(long taxon, String path, long count) {
        taxonId = taxon;
        taxonPath = path;
        readCount = count;
    }
    
    public long getTaxonId() {
        return taxonId;
    }
    
    public String getTaxonPath() {
        return taxonPath;
    }
    
    public String getTaxonName() {
        String[] path = taxonPath.split(",");
        return path[path.length - 1];
    }
    
    public long getCount() {
        return readCount;
    }
    
    public void increaseCount(long extra) {
        readCount += extra;
    }
}
