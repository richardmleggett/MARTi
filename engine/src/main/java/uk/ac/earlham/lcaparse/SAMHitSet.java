/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.util.ArrayList;
import java.util.Collections;

/**
 * SAM file hit set representation (i.e. all hits relating to a query).
 * 
 * @author Richard M. Leggett
 */
public class SAMHitSet implements LCAHitSet{    
    private String queryName;
    private ArrayList<LCAHit> alignments = new ArrayList<LCAHit>();
    private int unknownTaxa = 0;
    private long assignedTaxon = -2;
    private double bestIdentity = 0;
    
    public SAMHitSet(String query) {
        queryName = query;
    }

    public void addAlignment(LCAHit ph) {        
        if (alignments.size() > 0) {
            System.out.println("Error: current version of LCAParse only supports SAM files with one hit per query.");
        } else {
            alignments.add(ph);
            if (ph.getTaxonId() == -1) {
                unknownTaxa++;
            }
        }        
    }
    
    public boolean hasUnknownTaxa() {
        return unknownTaxa == 0 ? false:true;
    }
    
    public int getNumberOfAlignments() {
        return alignments.size();
    }
    
    public LCAHit getAlignment(int n) {
        LCAHit ph = null;
        
        if (n < alignments.size()) {
            ph = alignments.get(n);
        }
        
        return ph;
    }

    public String getQueryName() {
        return queryName;
    }
    
    public void printEntry() {
        for (int i=0; i<alignments.size(); i++) {
            System.out.println(queryName +
                               "\t" + alignments.get(i).getTargetName() +
                               "\t" + alignments.get(i).getTaxonId() +
                               "\t" + alignments.get(i).getQueryCover() + 
                               "\t" + alignments.get(i).getIdentity());
        }
    }

     public void setAssignedTaxon(long id) {
         assignedTaxon = id;
     }
     
     public long getAssignedTaxon() {
         return assignedTaxon;
     }

     public boolean hasGoodAlignment() {
        return alignments.size() > 0 ? true:false;
     }
     
    public void sortHits() {
         //Collections.sort(alignments);
    }

    public void removeRejectedAlignments() {};

    public double getBestIdentity() {
        return bestIdentity;
    }    

    public double getMeanIdentity() {
        double total = 0.0;
        double meanId;

        for (int i=0; i<alignments.size(); i++) {
            total += alignments.get(i).getIdentity();
        }

        meanId = total / alignments.size();

        return meanId;
    }
}
