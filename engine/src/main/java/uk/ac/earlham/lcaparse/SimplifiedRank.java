/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.lcaparse;

import java.util.Hashtable;

/**
 *
 * @author leggettr
 */
public class SimplifiedRank {
    private Hashtable<String, Short> ranks = new Hashtable<String, Short>();

    public SimplifiedRank() {
        ranks.put("biotype",(short)9);
        ranks.put("clade", (short)0);
        ranks.put("class", (short)4);
        ranks.put("cohort", (short)4);
        ranks.put("family", (short)6);
        ranks.put("forma", (short)9);
        ranks.put("forma specialis", (short)9);
        ranks.put("genotype", (short)8);
        ranks.put("genus", (short)7);
        ranks.put("infraclass", (short)4);
        ranks.put("infraorder", (short)5);
        ranks.put("isolate", (short)8);
        ranks.put("kingdom", (short)2);
        ranks.put("morph", (short)9);
        ranks.put("no rank", (short)0);
        ranks.put("order", (short)5);
        ranks.put("parvorder", (short)5);
        ranks.put("pathogroup", (short)9);
        ranks.put("phylum", (short)3);
        ranks.put("section", (short)7);
        ranks.put("series", (short)7);
        ranks.put("serogroup", (short)9);
        ranks.put("serotype", (short)9);
        ranks.put("species", (short)8);
        ranks.put("species group", (short)7);
        ranks.put("species subgroup", (short)7);
        ranks.put("strain", (short)9);
        ranks.put("subclass", (short)4);
        ranks.put("subcohort", (short)4);
        ranks.put("subfamily", (short)6);
        ranks.put("subgenus", (short)7);
        ranks.put("subkingdom", (short)2);
        ranks.put("suborder", (short)5);
        ranks.put("subphylum", (short)3);
        ranks.put("subsection", (short)7);
        ranks.put("subspecies", (short)9);
        ranks.put("subtribe", (short)6);
        ranks.put("subvariety", (short)9);
        ranks.put("superclass", (short)3);
        ranks.put("superfamily", (short)5);
        ranks.put("superkingdom", (short)1);
        ranks.put("superorder", (short)4);
        ranks.put("superphylum", (short)2);
        ranks.put("tribe", (short)6);
        ranks.put("varietas", (short)9);
    }
    
    public String getSimplifiedRankString(int n) {
        String s;
        
        switch(n) {
            case 0: s="unknown"; break;
            case 1: s="domain"; break;
            case 2: s="kingdom"; break;
            case 3: s="phylum"; break;
            case 4: s="class"; break;
            case 5: s="order"; break;
            case 6: s="family"; break;
            case 7: s="genus"; break;
            case 8: s="species"; break;
            case 9: s="subspecies"; break;
            case 10: s="alllevels"; break;
            default: s="unknown"; break;
        }
        
        return s;
    }
    
    public short getRankFromString(String s) {
        short rank = 0;
        
        if (ranks.containsKey(s)) {
            rank = ranks.get(s);
        } else {
            System.out.println("Error: unknown rank " + s);
        }        
        
        return rank;
    }
}
