/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.util.ArrayList;
import java.util.Collections;

/**
 * PAF file hit set representation (i.e. all hits relating to a query).
 * 
 * @author Richard M. Leggett
 */
public class PAFHitSet implements LCAHitSet {    
    private String queryName;
    private ArrayList<LCAHit> alignments = new ArrayList<LCAHit>();
    private double bestQueryCover = 0;
    private double bestIdentity = 0;
    private int unknownTaxa = 0;
    private long assignedTaxon = -2;

    
    public PAFHitSet(String query) {
        queryName = query;
    }

    public void addAlignment(LCAHit ph) {
        boolean addAlignment = false;
        boolean updateBest = false;
        
        if (alignments.size() > 0) {
            // Is this better than our best?
            boolean foundNewBest = false;

            if (ph.getQueryCover() > bestQueryCover) {
                alignments.clear();
                addAlignment = true;
                updateBest = true;
            } else if (ph.getQueryCover() == bestQueryCover) {
                if (ph.getIdentity() > bestIdentity) {
                    alignments.clear();
                    addAlignment = true;
                    updateBest = true;
                } else if (ph.getIdentity() == bestIdentity) {
                    // Ok, it's just as good, so keep it as well
                    addAlignment = true;
                }
            }
        } else {
            addAlignment = true;
            updateBest = true;
        }
        
        if (addAlignment) {
            alignments.add(ph);
            if (ph.getTaxonId() == -1) {
                unknownTaxa++;
            }
        }
        if (updateBest) {
            bestQueryCover = ph.getQueryCover();
            bestIdentity = ph.getIdentity();
        }
    }
    
    public boolean hasUnknownTaxa() {
        //if (unknownTaxa > 0) {
        //    System.out.println(unknownTaxa + " out of "+alignments.size() + " unknown taxa");
        //}
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
