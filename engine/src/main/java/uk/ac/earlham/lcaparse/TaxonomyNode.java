/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;

/**
 * Representation of a taxonomy node.
 * 
 * @author Richard M. Leggett
 */
public class TaxonomyNode<T> {
    public static final short RANK_UNKNOWN = 0;
    public static final short RANK_CLASS = 1;
    public static final short RANK_COHORT = 2;
    public static final short RANK_FAMILY = 3;
    public static final short RANK_FORMA = 4;
    public static final short RANK_GENUS = 5;
    public static final short RANK_INFRACLASS = 6;
    public static final short RANK_INFRAORDER = 7;
    public static final short RANK_KINGDOM = 8;
    public static final short RANK_NO_RANK = 9;
    public static final short RANK_ORDER = 10;
    public static final short RANK_PARVORDER = 11;
    public static final short RANK_PHYLUM = 12;
    public static final short RANK_SPECIES = 13;
    public static final short RANK_SPECIES_GROUP = 14;
    public static final short RANK_SPECIES_SUBGROUP = 15;
    public static final short RANK_SUBCLASS = 16;
    public static final short RANK_SUBFAMILY = 17;
    public static final short RANK_SUBGENUS = 18;
    public static final short RANK_SUBKINGDOM = 19;
    public static final short RANK_SUBORDER = 20;
    public static final short RANK_SUBPHYLUM = 21;
    public static final short RANK_SUBSPECIES = 22;
    public static final short RANK_SUBTRIBE = 23;
    public static final short RANK_SUPERCLASS = 24;
    public static final short RANK_SUPERFAMILY = 25;
    public static final short RANK_SUPERKINGDOM = 26;
    public static final short RANK_SUPERORDER = 27;
    public static final short RANK_SUPERPHYLUM = 28;
    public static final short RANK_TRIBE = 29;
    public static final short RANK_VARIETAS = 30;

    public static final short RANK_STRAIN = 31;
    public static final short RANK_SEROGROUP = 32;
    public static final short RANK_BIOTYPE = 33;
    public static final short RANK_CLADE = 34;
    public static final short RANK_FORMA_SPECIALIS = 35;
    public static final short RANK_ISOLATE = 36;
    public static final short RANK_SEROTYPE = 37;    
    public static final short RANK_SUBCOHORT = 38;
    public static final short RANK_GENOTYPE = 39;
    public static final short RANK_SECTION = 40;
    public static final short RANK_SERIES = 41;
    public static final short RANK_SUBVARIETY = 42;
    public static final short RANK_MORPH = 43;
    public static final short RANK_SUBSECTION = 44;
    public static final short RANK_PATHOGROUP = 45;    
    
    // This value needs to be something that it is impossible to get a barcode ID for
    public static final int LCA_BARCODE = 100000;
    
    private T data;
    private ArrayList<TaxonomyNode> children = new ArrayList<TaxonomyNode>();
    private Long taxonId;
    private Long parentId = null;
    private short rank;
    private short simplifiedRank;
    private int assigned = 0;
    private int summed = 0;
    private int displayColumn = 0;
    private int displayRow = 0;
    private int maxAssigned = 0;
    private Hashtable<Integer,Integer> assignedCount = new Hashtable<Integer,Integer>();
    private Hashtable<Integer,Integer> summedCount = new Hashtable<Integer,Integer>();
    private Hashtable<Integer,Long> assignedYield = new Hashtable<Integer,Long>();
    private Hashtable<Integer,Long> summedYield = new Hashtable<Integer,Long>();
//    private Hashtable<Integer,Integer> maxAssignedCount = new Hashtable<Integer,Integer>();
    private Hashtable<Integer,Integer> lcaAssignedCount = new Hashtable<Integer,Integer>();
    private Hashtable<Integer,Integer> lcaSummedCount = new Hashtable<Integer,Integer>();
    private Hashtable<Integer,Long> lcaYield = new Hashtable<Integer,Long>();
    private Hashtable<Integer,Long> lcaSummedYield = new Hashtable<Integer,Long>();
    
    public TaxonomyNode(Long id) {
        taxonId = id;
        
        //for (int i=0; i<16; i++) {
        //    assignedCount.put(i, 0);
        //    summedCount.put(i, 0);
        //    maxAssignedCount.put(i, 0);
        //}
    }
    
    public Long getId() {
        return taxonId;
    }
    
    public void setParent(Long p) {
        if (parentId != null) {
            System.out.println("Warning: resetting parentId for taxon "+taxonId);
        }
        if (p != taxonId) {
            parentId = p;
        }
    }
    
    public Long getParent() {
        return parentId;
    }
    
    public void addChild(TaxonomyNode n) {
        children.add(n);
    }
    
    public boolean isLeafNode() {
        return children.size() == 0 ? true:false;
    }
    
    public ArrayList<TaxonomyNode> getChildren() {
        return children;
    }
            
    public void incrementAssignedAndAddYield(int bc, long length) {        
        assigned++;
        
        if (assigned > maxAssigned) {
            maxAssigned = assigned;
        }
        
        
        // New version
        int c = 0;
        int m = 0;

        if (assignedCount.containsKey(bc)) {
            c = assignedCount.get(bc);
            //m = maxAssignedCount.get(bc);
        }
        
        c++;        
        assignedCount.put(bc, c);
        
        //if (c > m) {
        //    maxAssignedCount.put(bc, c);
        //}
        
        long yield = length;
        if(assignedYield.containsKey(bc)) {
            yield += assignedYield.get(bc);
        }
        assignedYield.put(bc, yield);
    }
    
//    public int getMaxAssigned(int bc) {
//        int m = 0;
//        
//        if (maxAssignedCount.containsKey(bc)) {
//            m = maxAssignedCount.get(bc);
//        }
//
//        return m;
//        //return maxAssigned;
//    }
    
    public void incrementSummedAndAddYield(int bc, long length) {
        summed++;
        
        int s = 0;
        if (summedCount.containsKey(bc)) {
            s = summedCount.get(bc);
        }
        s++;
        summedCount.put(bc, s);
        
        long yield = length;
        if(summedYield.containsKey(bc)) {
            yield += summedYield.get(bc);
        }
        summedYield.put(bc, yield);
    }
    
    public int getAssigned(int bc) {
        int c = 0;
        
        if (assignedCount.containsKey(bc)) {
            c = assignedCount.get(bc);
        }
        
        // CHECK
        //if (c != assigned) {
        //    System.out.println("ERROR: c not equal to assigned in getAssigned");
        //}
        
        return c;
        //return assigned;
    }

    public int getLCAAssigned(int bc) {
        int c = 0;
        
        if (lcaAssignedCount.containsKey(bc)) {
            c = lcaAssignedCount.get(bc);
        }
        
        return c;
    }
    
    public long getAssignedYield(int bc) {
        long c = 0;    
        if (assignedYield.containsKey(bc)) {
            c = assignedYield.get(bc);
        }    
        return c;     
    }
    
    public long getSummedYield(int bc) {
        long c = 0;    
        if (summedYield.containsKey(bc)) {
            c = summedYield.get(bc);
        }    
        return c;     
    }  
    
    public long getLCAYield(int bc) {
        long c = 0;    
        if (lcaYield.containsKey(bc)) {
            c = lcaYield.get(bc);
        }    
        return c;     
    }
    
    public long getLCASummedYield(int bc) {
        long c = 0;    
        if (lcaSummedYield.containsKey(bc)) {
            c = lcaSummedYield.get(bc);
        }    
        return c;     
    }  
    
    public void setDisplayPosition(int c, int r) {
        displayColumn = c;
        displayRow = r;
    }
    
    public int getDisplayCol() {
        return displayColumn;
    }

    public int getDisplayRow() {
        return displayRow;
    }
    
    public int getSummed(int bc) {
        int s = 0;
        
        if (summedCount.containsKey(bc)) {
            s = summedCount.get(bc);
        }
        
        // CHECK
        //if (s != summed) {
        //    System.out.println("ERROR: s not equal to summed in getSummed");
        //}
        
        return s;
        //return summed;
    }

    public int getLCASummed(int bc) {
        int s = 0;
        
        if (lcaSummedCount.containsKey(bc)) {
            s = lcaSummedCount.get(bc);
        }
        return s;
    }
    
    public void setRank(Taxonomy taxonomy, String s) {
        switch(s) {
            case "class": rank=RANK_CLASS; break;
            case "cohort": rank=RANK_COHORT; break;
            case "family": rank=RANK_FAMILY; break;
            case "forma": rank=RANK_FORMA; break;
            case "genus": rank=RANK_GENUS; break;
            case "infraclass": rank=RANK_INFRACLASS; break;
            case "infraorder": rank=RANK_INFRAORDER; break;
            case "kingdom": rank=RANK_KINGDOM; break;
            case "no rank": rank=RANK_NO_RANK; break;
            case "order": rank=RANK_ORDER; break;
            case "parvorder": rank=RANK_PARVORDER; break;
            case "phylum": rank=RANK_PHYLUM; break;
            case "species": rank=RANK_SPECIES; break;
            case "species group": rank=RANK_SPECIES_GROUP ; break;
            case "species subgroup": rank=RANK_SPECIES_SUBGROUP ; break;
            case "subclass": rank=RANK_SUBCLASS; break;
            case "subfamily": rank=RANK_SUBFAMILY; break;
            case "subgenus": rank=RANK_SUBGENUS; break;
            case "subkingdom": rank=RANK_SUBKINGDOM; break;
            case "suborder": rank=RANK_SUBORDER; break;
            case "subphylum": rank=RANK_SUBPHYLUM; break;
            case "subspecies": rank=RANK_SUBSPECIES; break;
            case "subtribe": rank=RANK_SUBTRIBE; break;
            case "superclass": rank=RANK_SUPERCLASS; break;
            case "superfamily": rank=RANK_SUPERFAMILY; break;
            case "superkingdom": rank=RANK_SUPERKINGDOM; break;
            case "superorder": rank=RANK_SUPERORDER; break;
            case "superphylum": rank=RANK_SUPERPHYLUM; break;
            case "tribe": rank=RANK_TRIBE; break;
            case "varietas": rank=RANK_VARIETAS; break;
            
            case "strain": rank = RANK_STRAIN; break;
            case "serogroup": rank = RANK_SEROGROUP ; break;
            case "biotype": rank = RANK_BIOTYPE ; break;
            case "clade": rank = RANK_CLADE ; break;
            case "forma specialis": rank = RANK_FORMA_SPECIALIS; break;
            case "isolate": rank = RANK_ISOLATE; break;
            case "serotype": rank = RANK_SEROTYPE; break;
            case "subcohort": rank = RANK_SUBCOHORT; break;
            case "genotype": rank = RANK_GENOTYPE; break;
            case "section": rank = RANK_SECTION; break;
            case "series": rank = RANK_SERIES; break;
            case "subvariety": rank = RANK_SUBVARIETY; break;
            case "morph": rank = RANK_MORPH; break;
            case "subsection": rank = RANK_SUBSECTION; break;
            case "pathogroup": rank = RANK_PATHOGROUP; break;
            
            default:
                taxonomy.warnRank(s);
                rank=RANK_UNKNOWN;
                break;
        }
    }
    
    public void setSimplifiedRank(short r) {
        simplifiedRank = r;
    }
    
    public short getSimplifiedRank() {
        return simplifiedRank;
    }
    
    public short getRank() {
        return rank;
    }
    
    public String getRankString() {
        String r = "Unknown";
        switch(rank) {
            case RANK_CLASS: r="class"; break;
            case RANK_COHORT: r="cohort"; break;
            case RANK_FAMILY: r="family"; break;
            case RANK_FORMA: r="forma"; break;
            case RANK_GENUS: r="genus"; break;
            case RANK_INFRACLASS: r="infraclass"; break;
            case RANK_INFRAORDER: r="infraorder"; break;
            case RANK_KINGDOM: r="kingdom"; break;
            case RANK_NO_RANK: r="no rank"; break;
            case RANK_ORDER: r="order"; break;
            case RANK_PARVORDER: r="parvorder"; break;
            case RANK_PHYLUM: r="phylum"; break;
            case RANK_SPECIES: r="species"; break;
            case RANK_SPECIES_GROUP: r="species group"; break;
            case RANK_SPECIES_SUBGROUP: r="species subgroup"; break;
            case RANK_SUBCLASS: r="subclass"; break;
            case RANK_SUBFAMILY: r="subfamily"; break;
            case RANK_SUBGENUS: r="subgenus"; break;
            case RANK_SUBKINGDOM: r="subkingdom"; break;
            case RANK_SUBORDER: r="suborder"; break;
            case RANK_SUBPHYLUM: r="subphylum"; break;
            case RANK_SUBSPECIES: r="subspecies"; break;
            case RANK_SUBTRIBE: r="subtribe"; break;
            case RANK_SUPERCLASS: r="superclass"; break;
            case RANK_SUPERFAMILY: r="superfamily"; break;
            case RANK_SUPERKINGDOM: r="superkingdom"; break;
            case RANK_SUPERORDER: r="superorder"; break;
            case RANK_SUPERPHYLUM: r="superphylum"; break;
            case RANK_TRIBE: r="tribe"; break;
            case RANK_VARIETAS: r="varietas"; break;

            case RANK_STRAIN: r="strain"; break;
            case RANK_SEROGROUP: r="serogroup"; break;
            case RANK_BIOTYPE: r="biotype" ; break;
            case RANK_CLADE: r="clade"; break;
            case RANK_FORMA_SPECIALIS: r="forma specialis"; break;
            case RANK_ISOLATE: r="isolate"; break;
            case RANK_SEROTYPE: r="serotype"; break;
            case RANK_SUBCOHORT: r="subcohort"; break;
            case RANK_GENOTYPE: r="genotype"; break;
            case RANK_SECTION: r="section"; break;
            case RANK_SERIES: r="series"; break;
            case RANK_SUBVARIETY: r="subvariety"; break;
            case RANK_MORPH: r="morph"; break;
            case RANK_SUBSECTION: r="subsection"; break;
            case RANK_PATHOGROUP: r="pathogroup"; break;
        }
        
        return r;
    }
    
    public void setLCACountsToMatch(int bc) {
        int a = 0;
        int s = 0;
        
        if (assignedCount.containsKey(bc)) {
            a = assignedCount.get(bc);
        }
        
        if (summedCount.containsKey(bc)) {
            s = summedCount.get(bc);
        }
        
        if (!assignedCount.containsKey(bc) && !summedCount.containsKey(bc)) {
            System.out.println("Node "+taxonId+" doesn't have assigned or summed");
        }
        
        lcaAssignedCount.put(bc, a);
        lcaSummedCount.put(bc, s);
        
        long yield = 0;
        long summed = 0;
        
        if(assignedYield.containsKey(bc)) {
            yield = assignedYield.get(bc);
        }
        
        if(summedYield.containsKey(bc)) {
            summed = summedYield.get(bc);
        }
        
        if (!assignedYield.containsKey(bc) && !summedYield.containsKey(bc)) {
            System.out.println("Node "+taxonId+" doesn't have assigned or summed");
        }
        
        lcaYield.put(bc, yield);
        lcaSummedYield.put(bc, summed);
    }
         
    public void zeroLCACounts(int bc) {
        lcaAssignedCount.put(bc, 0);
        lcaSummedCount.put(bc, 0);
        lcaYield.put(bc, 0l);
        lcaSummedYield.put(bc, 0l);  
    }
    
    
    public void zeroLCAAssignedCount(int bc) {
        lcaAssignedCount.put(bc, 0);
        lcaYield.put(bc, 0l);
    }

    public void zeroLCASummmmarisedCount(int bc) {
        lcaSummedCount.put(bc, 0);
        lcaSummedYield.put(bc, 0l);
    }
      
    public void addToLCAAssigned(int bc, int addCount, long yield) {
        int count = 0;
        if (lcaAssignedCount.containsKey(bc)) {
            count = lcaAssignedCount.get(bc);
        }
        count += addCount;
        
        lcaAssignedCount.put(bc, count);
        
        long yieldCount = 0;
        if (lcaYield.containsKey(bc)) {
            yieldCount = lcaYield.get(bc);
        }
        yieldCount += yield;
        
        lcaYield.put(bc, yieldCount);  
    }
     
}