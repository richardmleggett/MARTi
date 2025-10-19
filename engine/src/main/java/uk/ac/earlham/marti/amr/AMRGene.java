/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

import java.util.Hashtable;

/**
 * Representation of a single AMR gene.
 * 
 * @author Richard M. Leggett
 */
public class AMRGene {
    private Hashtable<Integer, AMRGeneChunk> chunks = new Hashtable<Integer,AMRGeneChunk>();
    private Hashtable<Long, Integer> species = new Hashtable<Long, Integer>();
    private Hashtable<Long, Integer> plasmids = new Hashtable<Long, Integer>();
    int cardNumber = 0;
    String geneName = "Unknown";
    String cardId = "Unknown";
    double cumulativeIdentity = 0.0;
    int numberOfHits = 0;
    
    public AMRGene(String id, CARDOntology cardOntology) {
        if (id.startsWith("ARO:")) {
            String[] tokens = id.split("\\|");

            // cardId should be of form ARO:3003923|oqxB at this point
            if (tokens.length == 2) {
                cardId = tokens[0];
                cardNumber = Integer.parseInt(cardId.substring(4));
                geneName = cardOntology.getCardName(cardId); //tokens[1];
            } else {
                System.out.println("Error: couldn't parse "+id);
            }
        } else {
            System.out.println("Error: couldn't parse "+id);
        }
    }
    private void incrementCountHashtable(Hashtable<Long, Integer> countTable, Long taxonID) {
        int count = 0;
        if (countTable.containsKey(taxonID)) {
            count = countTable.get(taxonID);
        }
        count++;
        countTable.put(taxonID, count);
    }
    
    public void addHit(int originalChunkNumber, int processedChunkNumber, Long lcaHitTaxonID, boolean isIndependent, double identity, boolean isPlasmid) {
        AMRGeneChunk chunk;
                
        //System.out.println("Chunk "+processedChunkNumber+" CardID "+cardId+" Hit "+lcaHit);
        
        // Check if we have a chunk for this chunk number - if not create one
        if (chunks.containsKey(processedChunkNumber)) {
            chunk = chunks.get(processedChunkNumber);
        } else {
            chunk = new AMRGeneChunk();
            //System.out.println("18Oct: Adding new AMRGeneChunk for "+geneName+ " originalChunk "+originalChunkNumber+" processedChunk "+processedChunkNumber+" lcHitTaxonID "+lcaHitTaxonID);
            chunks.put(processedChunkNumber, chunk);
        }
    
        // Increment values in hashtables
        incrementCountHashtable(species, lcaHitTaxonID);    
        if(isPlasmid) {
            incrementCountHashtable(plasmids, lcaHitTaxonID);   
        }     
            
        // Now pass the species through to this chunk to increment the counter for that species
        // Note there may be no species...  
        if (lcaHitTaxonID != -2l) {
            //System.out.println("addHit to chunk "+processedChunkNumber+" CardID "+cardId+" Hit "+lcaHit);
            //System.out.println("18Oct: Calling addHit for "+geneName+ " originalChunk "+originalChunkNumber+" processedChunk "+processedChunkNumber+" lcHitTaxonID "+lcaHitTaxonID);
            chunk.addHit(lcaHitTaxonID, isIndependent, identity, isPlasmid);
        } else {
            //System.out.println("18Oct: Calling addHit for "+geneName+ " originalChunk "+originalChunkNumber+" processedChunk "+processedChunkNumber+" lcHitTaxonID -2l");
            chunk.addHit(-2l, isIndependent, identity, isPlasmid);
        }
        
        // Keep track of mean identity
        cumulativeIdentity += identity;
        numberOfHits++;
        //System.out.println("18Oct: Gene "+geneName+" numberOfHits="+numberOfHits);
    }
    
    public Hashtable<Long,Integer> getSpecies() {
        return species;
    }
    
    public Hashtable<Long,Integer> getPlasmids() {
        return plasmids;
    }
    
    public int getSpeciesCountForChunk(Long speciesID, int chunk) {
        int count = 0;

       if (chunks.containsKey(chunk)) {
            AMRGeneChunk agg = chunks.get(chunk);
            count = agg.getCountForSpecies(speciesID);
       }
       
       return count;         
    }
    
    public int getPlasmidCountForChunk(Long speciesID, int chunk) {
        int count = 0;
        if(chunks.containsKey(chunk)) {
            AMRGeneChunk agg = chunks.get(chunk);
            count = agg.getPlasmidCountForSpecies(speciesID);    
        }
        return count;
    }
    
    public int getOverallCountForChunk(int n) {
        int count = 0;
        if (chunks.containsKey(n)) {
            AMRGeneChunk gc = chunks.get(n);
            count = gc.getOverallCount();
        }
        
        return count;
    }
    
    public double getCumulativeMeanAccuracyAtChunk(int n) {
        double cumulativeIdentity = 0.0;
        int count = 0;
        
        for (int i=0; i<=n; i++) {
            if (chunks.containsKey(i)) {
                AMRGeneChunk gc = chunks.get(i);
                cumulativeIdentity += gc.getCumulativeIdentity();
                count += gc.getNumberOfHits();
            }
        }
        return cumulativeIdentity / (double)count;
    }
    
    public int getCARDNumber() {
        return cardNumber;
    }
    
    public String getCARDId() {
        return cardId;
    }
    
    public String getName() {
        return geneName;
    }
    
    public double getMeanIdentity() {
        return cumulativeIdentity / numberOfHits;
    }
}
