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
    private Hashtable<String, Integer> species = new Hashtable<String, Integer>();
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

    public void addHit(int originalChunkNumber, int processedChunkNumber, String lcaHit, boolean isIndependent, double identity) {
        AMRGeneChunk chunk;
                
        //System.out.println("Chunk "+processedChunkNumber+" CardID "+cardId+" Hit "+lcaHit);
        
        // Check if we have a chunk for this chunk number - if not create one
        if (chunks.containsKey(processedChunkNumber)) {
            chunk = chunks.get(processedChunkNumber);
        } else {
            chunk = new AMRGeneChunk();
            chunks.put(processedChunkNumber, chunk);
        }
    
        // Check if we have this in he overall species list for this gene
        int speciesCount = 0;
        if (species.containsKey(lcaHit)) {
            speciesCount = species.get(lcaHit);
        }
        speciesCount++;
        species.put(lcaHit, speciesCount);
            
        // Now pass the species through to this chunk to increment the counter for that species
        // Note there may be no species...  
        if (lcaHit != null) {
            //System.out.println("addHit to chunk "+processedChunkNumber+" CardID "+cardId+" Hit "+lcaHit);
            chunk.addHit(lcaHit, isIndependent, identity);
        } else {
            chunk.addHit("null", isIndependent, identity);
        }
        
        // Keep track of mean identity
        cumulativeIdentity += identity;
        numberOfHits++;
    }
    
    public Hashtable<String,Integer> getSpecies() {
        return species;
    }
    
    public int getSpeciesCountForChunk(String species, int chunk) {
        int count = 0;

       if (chunks.containsKey(chunk)) {
            AMRGeneChunk agg = chunks.get(chunk);
            count = agg.getCountForSpecies(species);
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
