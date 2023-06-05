/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.util.ArrayList;

/**
 * Representation of a BLAST hit.
 * 
 * @author Richard M. Leggett
 */
public class BlastHit implements LCAHit,Comparable {
    public final static int UNKNOWN = -1;
    private Taxonomy taxonomy;
    private AccessionTaxonConvertor accTaxConvert;
    private String queryName;
    private int queryLength;
    private int queryStart;
    private int queryEnd;
    private double queryCoverage = UNKNOWN;
    private String targetName;
    private int targetStart;
    private int targetEnd;
    private int matches;
    private int length;
    private int mismatches;
    private double bitscore;
    private double identity;
    private double eValue;
    private long taxonId = -1;
    private boolean parseTaxon;
    private String bitscoreString;
    private String eValueString;
    private ArrayList<Long> taxonIdPath;
    private int longestDistance = 0;
    private String stitle = "";
    private boolean validAlignment = false;
    
    public BlastHit(Taxonomy t, AccessionTaxonConvertor atc, String line, int format, boolean parse, boolean formatHasStitle) {
        String[] fields = line.split("\t");
                
        taxonomy = t;
        accTaxConvert = atc;
        parseTaxon = parse;
                
        if (format == LCAParseOptions.FORMAT_NANOOK) {
            if(formatHasStitle) {
                parseNanoOKWithStitle(fields);
            } else {
                parseNanoOK(fields);
            }
        } else if ((format == LCAParseOptions.FORMAT_BLASTTAB) ||
                   (format == LCAParseOptions.FORMAT_BLASTTAXON)) {
            parseBlastTab(fields);
        }
                
        if (taxonId == -1) {            
            taxonomy.warnTaxa(targetName);
        } else {
            cacheTaxonIdPath();
        }        
    }
    
    private void parseNanoOKWithStitle(String[] fields ) {
        // NanoOK14: "qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore stitle staxids"
        // NanoOK15: "qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore stitle qcovs staxids"

        if ((fields.length == 14) || (fields.length == 15)) {        
            queryName = fields[0];
            targetName = fields[1];
            identity = Double.parseDouble(fields[2]);
            length = Integer.parseInt(fields[3]);
            mismatches = Integer.parseInt(fields[4]);
            // gapopen            
            queryStart = Integer.parseInt(fields[6]);
            queryEnd = Integer.parseInt(fields[7]);
            targetStart = Integer.parseInt(fields[8]);
            targetEnd = Integer.parseInt(fields[9]);
            eValueString = fields[10] ; eValue = Double.parseDouble(eValueString);
            bitscoreString = fields[11] ; bitscore = Double.parseDouble(bitscoreString);
            stitle = fields[12];
            
            if (fields.length == 14) {
                String taxaString = fields[13];
                String[] taxa = taxaString.split(";");
                
                try {
                    taxonId = Integer.parseInt(taxa[0]);
                } catch (NumberFormatException e) {                    
                    taxonId = -2;
                }
            } else if (fields.length == 15) {
                queryCoverage = Double.parseDouble(fields[13]);
                String taxaString = fields[14];
                String[] taxa = taxaString.split(";");
                taxonId = Integer.parseInt(taxa[0]);
            }
            
            validAlignment = true;
        } else {
            System.out.println("Error: input format doesn't seem to be NanoOK");
            System.exit(1);
        }
    }
    
    private void parseNanoOK(String[] fields ) {
        // NanoOK13: "qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore staxids"
        // NanoOK14: "qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore qcovs staxids"

        if ((fields.length == 13) || (fields.length == 14)) {        
            queryName = fields[0];
            targetName = fields[1];
            identity = Double.parseDouble(fields[2]);
            length = Integer.parseInt(fields[3]);
            mismatches = Integer.parseInt(fields[4]);
            // gapopen            
            queryStart = Integer.parseInt(fields[6]);
            queryEnd = Integer.parseInt(fields[7]);
            targetStart = Integer.parseInt(fields[8]);
            targetEnd = Integer.parseInt(fields[9]);
            eValueString = fields[10] ; eValue = Double.parseDouble(eValueString);
            bitscoreString = fields[11] ; bitscore = Double.parseDouble(bitscoreString);
            
            if (fields.length == 13) {
                String taxaString = fields[12];
                String[] taxa = taxaString.split(";");
                
                try {
                    taxonId = Integer.parseInt(taxa[0]);
                } catch (NumberFormatException e) {                    
                    taxonId = -2;
                }
            } else if (fields.length == 14) {
                queryCoverage = Double.parseDouble(fields[12]);
                String taxaString = fields[13];
                String[] taxa = taxaString.split(";");
                taxonId = Integer.parseInt(taxa[0]);
            }
            
            validAlignment = true;
        } else {
            System.out.println("Error: input format doesn't seem to be NanoOK");
            System.exit(1);
        }
    }
    
    public String getTabString() {
        String s = String.format("%s\t%s\t%.2f\t%d\t%d\t%d\t%d\t%d\t%d\t%d%.6f\t%.2f\t%d\t%d", queryName, targetName, identity, length, mismatches, -1, queryStart, queryEnd, targetStart, targetEnd, eValue, bitscore, queryCoverage, taxonId);
        
        return s;
    }

    private void parseBlastTab(String[] fields) {
        // 1.	 qseqid	 query (e.g., unknown gene) sequence id
        // 2.	 sseqid	 subject (e.g., reference genome) sequence id
        // 3.	 pident	 percentage of identical matches
        // 4.	 length	 alignment length (sequence overlap)
        // 5.	 mismatch	 number of mismatches
        // 6.	 gapopen	 number of gap openings
        // 7.	 qstart	 start of alignment in query
        // 8.	 qend	 end of alignment in query
        // 9.	 sstart	 start of alignment in subject
        // 10.	 send	 end of alignment in subject
        // 11.	 evalue	 expect value
        // 12.	 bitscore	 bit score

        if (fields.length >= 12) {        
            queryName = fields[0];
            targetName = fields[1];
            identity = Double.parseDouble(fields[2]);
            length = Integer.parseInt(fields[3]);
            mismatches = Integer.parseInt(fields[4]);
            // gapopen            
            queryStart = Integer.parseInt(fields[6]);
            queryEnd = Integer.parseInt(fields[7]);
            targetStart = Integer.parseInt(fields[8]);
            targetEnd = Integer.parseInt(fields[9]);
            eValue = Double.parseDouble(fields[10]);
            bitscore = Double.parseDouble(fields[11]);
            
            if (fields.length == 13) {
                String taxaString = fields[12];
                String[] taxa = taxaString.split(";");
                
                try {
                    taxonId = Integer.parseInt(taxa[0]);
                } catch (NumberFormatException e) {                    
                    taxonId = -2;
                }
                
            } else {
                if (parseTaxon) {
                    if (accTaxConvert != null) {
                        taxonId = accTaxConvert.getTaxonFromAccession(targetName);       
                    } else {
                        System.out.println("Error: you haven't specified a mapfile and the input file doesn't have taxon IDs");
                        System.exit(1);                
                    }
                }
            }
            
            validAlignment = true;
        } else {
            System.out.println("Error: input format doesn't seem to be BlastTab");
            System.exit(1);
        }
    }
    
    public String getQueryName() {
        return queryName;
    }
    
    public String getTargetName() {
        return targetName;
    }
    
    public double getQueryCover() {
        return queryCoverage;
    }
    
    public double getIdentity() {
        return identity;
    }
    
    public double getAlignmentScore() {
        return bitscore;
    }
    
    public double getEValue() {
        return eValue;
    }
    
    public int getLength() {
        return length;
    }
    
    public int getMismatches() {
        return mismatches;
    }
    
    public int getQueryStart() {
        return queryStart;
    }

    public int getQueryEnd() {
        return queryEnd;
    }

    public int getHitStart() {
        return targetStart;
    }

    public int getHitEnd() {
        return targetEnd;
    }
        
    public String getEValueString() {
        return eValueString;
    }
    
    public String getBitscoreString() {
        return bitscoreString;
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
    
    private void cacheTaxonIdPath() {
        if (taxonId != -1) {
            taxonIdPath = taxonomy.getTaxonIdPathFromId(taxonId);
        }
    }         

     public double getPercentIdentity() {
        return identity;
    }

    public void storeDistance(BlastHit ba) {
        int distance_end = ba.getQueryEnd() - queryEnd;
        int distance_start = queryStart - ba.getQueryStart();
                
        if (distance_end > longestDistance) {
            longestDistance = distance_end;
        }
        if (distance_start > longestDistance) {
            longestDistance = distance_start;
        }        
    }
    
    public int getDistance() {
        return longestDistance;
    }
    
    public Double getBitScore() {
        return bitscore;
    }
    
    public String getSubjectTitle() {
        if(stitle == "") {
            System.out.println("Warning: Caller has requested stitle but there is no stitle field in Blast file.");
        }
        return stitle;
    }

    public String getQueryId() {
        return queryName;
    }
    
    public boolean isValidAlignment() {
        return validAlignment;
    }    
    
    public int compareTo(Object o) {
        BlastHit bh = (BlastHit)o;
        double bitScoreDifference = this.getBitScore() - bh.getBitScore();
        return (int)bitScoreDifference;
    }
}
