/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.lcaparse;

import java.util.ArrayList;

/**
 * Interface defining a hit - implemented in e.g. BLAST, PAF versions.
 * 
 * @author Richard M. Leggett
 */
public interface LCAHit {    
    public String getQueryName();    
    public String getTargetName();    
    public double getQueryCover();    
    public double getIdentity();    
    public double getAlignmentScore();    
    public void setTaxonIdPath(ArrayList<Long> path);
    public long getTaxonId();
    public int getTaxonLevel();
    public long getTaxonNode(int level);
}
