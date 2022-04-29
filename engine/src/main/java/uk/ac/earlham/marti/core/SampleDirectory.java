/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

/**
 * Representation of a sample directory.
 * 
 * @author Richard M. Leggett
 */
public class SampleDirectory {
    private String pathname;
    
    public SampleDirectory(String d) {
        pathname = d;
    }
    
    public String getPathname() {
        return pathname;
    }
    
    public String getFastaDirectory() {
        return pathname + "fasta";
    }
}
