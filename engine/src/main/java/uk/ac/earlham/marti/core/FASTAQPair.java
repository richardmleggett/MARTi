/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

/**
 * Representation of a FASTA, FASTQ file pair.
 * 
 * @author Richard M. Leggett
 */
public class FASTAQPair {
    private String fastaPathname = null;
    private String fastqPathname = null;
    
    public FASTAQPair(String fasta, String fastq) {
        fastaPathname = fasta;
        fastqPathname = fastq;
    }
    
    public String getFasta() {
        return fastaPathname;
    }
    
    public String getFastq() {
        return fastqPathname;
    }
}
