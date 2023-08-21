/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.centrifuge;

/**
 *
 * @author martins
 */
public class CentrifugeClassifierItem {
    private int jobId;
    private String centrifugeProcessName;
    private String queryFile;
    private String classificationFile;
    
    public CentrifugeClassifierItem(String name, int id, String qf, String cf) {
        centrifugeProcessName = name;
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
