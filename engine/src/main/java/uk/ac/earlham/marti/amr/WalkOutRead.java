/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import uk.ac.earlham.lcaparse.BlastHit;
import uk.ac.earlham.lcaparse.BlastHitSet;
import uk.ac.earlham.lcaparse.Taxonomy;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * Represent an AMR walkout of a read
 * 
 * @author Richard M. Leggett
 */
public class WalkOutRead {
    private ArrayList<BlastHit> cardAlignments = new ArrayList<BlastHit>();
    private BlastHit bacteriaAlignment = null;
    private BlastHitSet bacterialHitSet;
    private boolean gotIndependentHit = false;
    private MARTiEngineOptions options;
    private Taxonomy taxonomy;
    private int minOverlap = 50;
    private int longestDistance = 0;
    private CoordinateList cl = new CoordinateList();
    private double highestBitScore = 0;
    private double bitScoreThreshold = 0;

        
    public WalkOutRead(String queryName, MARTiEngineOptions o, Taxonomy t) {
        options = o;
        taxonomy = t;

        bacterialHitSet = new BlastHitSet(queryName, options.getReadClassifier().getLCAParseOptions());
    }
    
    public void addCardHit(BlastHit ba) {
        if ((ba.getPercentIdentity() >= options.getWalkoutMinID()) && (ba.getLength() >= options.getWalkoutMinLength())) {        
            int overlap = cl.getOverlap(ba.getQueryStart(), ba.getQueryEnd());
            if (overlap < (ba.getLength() / 10)) {
                cl.add(ba.getQueryStart(), ba.getQueryEnd());
                cardAlignments.add(ba); 
            }        
        }
    }
    
    public void addBacteriaHit(BlastHit ba) {       
        boolean independent = false;
        for (int i=0; i<cardAlignments.size(); i++) {
            BlastHit ca = cardAlignments.get(i);
            ca.storeDistance(ba);
            if (ca.getDistance() > minOverlap) {                
                independent = true;
            }
        }
        
        if (ba.getBitScore() > highestBitScore) {
            if (highestBitScore > 0) {
                System.out.println("Warning: Got higher bitscore than expected");
                highestBitScore = ba.getBitScore();
                bitScoreThreshold = highestBitScore * 0.9;
            }
        }
        
        if (ba.getBitScore() >= bitScoreThreshold) { //&& (blastHitSet.getNumberOfAlignments() < 10)) {
            bacterialHitSet.addAlignment(ba);
        }
        
        // If this hit is an indepdent hit
        if (independent) {
            // If we already have indepdent hit (shouldn't get here, as file should be sorted), then we'll take the new hit if it's got a better e value.
            // If we don't have one, then we'll keep it
            if (gotIndependentHit) {
                if (ba.getEValue() < bacteriaAlignment.getEValue()) {
                    System.out.println("Note: Got better host score");
                    bacteriaAlignment = ba;
                }
            } else {
                bacteriaAlignment = ba;
                gotIndependentHit = true;
            }
        // If this hit not an indepdent hit and we don't have an indepdent hit yet, then we want to store the best so far
        } else if (gotIndependentHit == false) {
            // If not already got indepdent hit, still store the best hit, but don't set the indepdence flag
            if (bacteriaAlignment != null) {
                if (ba.getEValue() < bacteriaAlignment.getEValue()) {
                    System.out.println("Note: Got better host score");
                    bacteriaAlignment = ba;
                }
            } else {
                // Don't already have a hit, so store it
                bacteriaAlignment = ba;
            }
        }
    }
    
    public String getBacterialHit() {
        String hit = "";
        if (bacteriaAlignment != null) {
            Pattern pattern = Pattern.compile("(\\S+) (\\S+)");
            Matcher matcher = pattern.matcher(bacteriaAlignment.getSubjectTitle());
            if (matcher.find()) {
                hit = matcher.group(1) + " " + matcher.group(2);
            } else {
                hit = bacteriaAlignment.getTargetName();
            }
        } else {
            hit = "No hit";
        }
        
        if (hit == null) {
            System.out.println("Something went wrong");
            System.exit(1);
        }
        
        return hit;
    }
    
    public String getLCAHit() {
        String s;     
        long id = getLCAHitTaxonID();
        s = taxonomy.getTaxonomyStringFromId(id);
        return s;
    }
    
    public long getLCAHitTaxonID() {
        if (bacterialHitSet.getNumberOfAlignments() == 0) {
            System.out.println("Er... no alignments in getLCAHit");
            System.exit(0);
        }
        return taxonomy.findAncestor(bacterialHitSet, 10, false);
    }
    
    public int getBacterialHitSetSize() {
        return bacterialHitSet.getNumberOfAlignments();
    }
        
    public boolean gotIndependentHit() {
        return gotIndependentHit;
    }
    
    public int getNumberOfGenes() {
        return cardAlignments.size();
    }
    
    public BlastHit getCardHit(int n) {
        return cardAlignments.get(n);
    }
    
    public int getLongestDistance() {
        return longestDistance;
    }

    public int getMinOverlap() {
        return minOverlap;
    }
    
    public boolean getIsPlasmid() {
        if (bacterialHitSet.getNumberOfAlignments() == 0) {
            System.out.println("[WalkOutRead::getIsPlasmid] Error: bacterialHitSet has size 0...");
            System.exit(0);
        }
        
        // If any of the highest bit score blast hits contain the word "plasmid" in the description then
        // we count this as a plasmid hit.
        double bestBitScore = bacterialHitSet.getBestBitscore();
        boolean isPlasmid = false;
        for (int i=0; i<bacterialHitSet.getNumberOfAlignments(); i++) {
            BlastHit bh = bacterialHitSet.getAlignment(i);
            if(bh.getBitScore() == bestBitScore) {
                if(bh.getSubjectTitle().toLowerCase().contains("plasmid")) {
                    isPlasmid = true;
                    break;
                }
            }

        }
        return isPlasmid;
    }


}
