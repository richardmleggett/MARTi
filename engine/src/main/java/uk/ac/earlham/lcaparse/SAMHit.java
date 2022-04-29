/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.util.ArrayList;

/**
 * SAM hit representation.
 * 
 * @author Richard M. Leggett
 */
public class SAMHit implements LCAHit {
    private Taxonomy taxonomy;
    private AccessionTaxonConvertor accTaxConvert;
    private String queryName;
    private String targetName;
    private int matches;
    private int pos;
    private int mapQ;
    private int flag;
    private long taxonId = -1;
    private ArrayList<Long> taxonIdPath;
    
    public SAMHit(Taxonomy t, AccessionTaxonConvertor atc, String line) {
        String[] fields = line.split("\t");
        
        taxonomy = t;
        accTaxConvert = atc;
        
        if (fields.length >= 11) {        
            queryName = fields[0];
            flag = Integer.parseInt(fields[1]);
            targetName = fields[2];
            pos = Integer.parseInt(fields[3]);
            mapQ = Integer.parseInt(fields[4]);
            // CIGAR 5
            // RNEXT 6
            // PNEXT 7
            // TLEN 8
            // SEQ 9
            // QUAL 10
            
        } else {
            System.out.println("Couldn't split "+line);
            System.exit(1);
        }
        
        taxonId = accTaxConvert.getTaxonFromAccession(targetName);
        if (taxonId == -1) {
            taxonomy.warnTaxa(targetName);
        } else {
            cacheTaxonIdPath();
        }
    }
    
    public String getQueryName() {
        return queryName;
    }
    
    public String getTargetName() {
        return targetName;
    }
    
    public double getQueryCover() {
        return 0;
    }
    
    public double getIdentity() {
        return 0;
    }
    
    public double getAlignmentScore() {
        return mapQ;
    }

    private void cacheTaxonIdPath() {
        if (taxonId != -1) {
            taxonIdPath = taxonomy.getTaxonIdPathFromId(taxonId);
        }
    } 
    
    public void setTaxonIdPath(ArrayList<Long> path) {
        taxonIdPath = path;
    }

    public long getTaxonId() {
        return taxonId;
    }
            
    public int getTaxonLevel() {
        if (taxonIdPath != null) {
            return taxonIdPath.size(); // 1-offset
        }
        return 0;
    }    
        
    // Note level is 1-offset
    public long getTaxonNode(int level) {
        if (taxonIdPath != null) {
            if (level <= taxonIdPath.size()) {
                return taxonIdPath.get(taxonIdPath.size() - level);
            }
        }
        return 0;
    }    
}
