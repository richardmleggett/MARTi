/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.classify;

/**
 * An item set to be classified - consisting of BLAST file, query file, log file etc..
 * 
 * @author Richard M. Leggett
 */
public class ReadClassifierItem {
    int jobId;
    String blastProcessName;
    String queryFile;
    String blastFile;
    String logFile;
    String classifierPrefix;
    
    public ReadClassifierItem(String blastName, int id, String qf, String bf, String lf, String cf) {
        blastProcessName = blastName;
        jobId = id;
        queryFile = qf;
        blastFile = bf;
        logFile = lf;
        classifierPrefix = cf;
    }
    
    public int getJobId() {
        return jobId;
    }
    
    public String getQueryFile() {
        return queryFile;
    }
    
    public String getBlastFile() {
        return blastFile;
    }
    
    public String getLogFile() {
        return logFile;
    }
    
    public String getClassifierPrefix() {
        return classifierPrefix;
    }
    
    public String getBlastProcessName() {
        return blastProcessName;
    }
}
