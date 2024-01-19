/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.kraken2;

/**
 *
 * @author martins
 */
public class Kraken2ClassifierItem {
    private int jobId;
    private String kraken2ProcessName;
    private String queryFile;
    private String classificationFile;
    
    public Kraken2ClassifierItem(String name, int id, String qf, String cf) {
        kraken2ProcessName = name;
        jobId = id;
        queryFile = qf;
        classificationFile = cf;
    }
    
    public int getJobId() {
        return jobId;
    }
    
    public String getQueryFile() {
        return queryFile;
    }
    
    public String getClassificationFile() {
        return classificationFile;
    }
    
}
