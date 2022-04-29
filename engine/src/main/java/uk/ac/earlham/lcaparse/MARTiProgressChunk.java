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
public class MARTiProgressChunk {
    private Hashtable<String, String> blastJobsCompleted = new Hashtable<String, String>();
    
    public void MARTiProgressChunk(String filename) {
    }
    
    public void markBlastCompleted(String dbName, String outputFilename) {
        if (blastJobsCompleted.containsKey(dbName)) {
            System.out.println("WARNING: Marking job completed that has already been marked: "+dbName+" " +outputFilename);
        } 
        blastJobsCompleted.put(dbName, outputFilename);
    }
}
