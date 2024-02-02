/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.util.ArrayList;

/**
 * Interface defining a hit set (set of all hits for a query).
 * 
 * @author Richard M. Leggett
 */
public interface LCAHitSet {    
    public void addAlignment(LCAHit ph);    
    public String getQueryName();
    public int getNumberOfAlignments();    
    public LCAHit getAlignment(int n);
    public void printEntry();
    public boolean hasUnknownTaxa();
    public void setAssignedTaxon(long id);
    public long getAssignedTaxon();
    public boolean hasGoodAlignment();
    public void sortHits();
    public void removeRejectedAlignments();
    public double getBestIdentity();
    public double getMeanIdentity();
}
