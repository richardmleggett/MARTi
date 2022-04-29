/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.megan;

/**
 * Store BLAST and FASTA filenames associated with a MEGAN file, as well as JOB IDs.
 * 
 * @author Richard M. Leggett
 */
public class MeganFilePair {
    private String fastaFilename;
    private String blastFilename;
    private int jobId = 0;

    public MeganFilePair(String fasta, String blast, int jid) {
        fastaFilename = fasta;
        blastFilename = blast;
        jobId = jid;
    }
    
    public String getFastaFilename() {
        return fastaFilename;
    }
    
    public String getBlastFilename() {
        return blastFilename;
    }

    public int getJobId() {    
        return jobId;
    }
}
