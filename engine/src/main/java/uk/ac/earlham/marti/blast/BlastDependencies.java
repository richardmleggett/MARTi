/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.blast;

import uk.ac.earlham.marti.schedule.SimpleJobScheduler;
import java.util.Hashtable;
import java.util.Set;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * Store BLAST database dependencies. For example, need VFDB or CARD to parse nt results.
 * 
 * @author Richard M. Leggett
 */
public class BlastDependencies {
    private Hashtable<String, Integer> dependencies = new Hashtable<String, Integer>();
    private Hashtable<String, String> blastFilenames = new Hashtable<String, String>();
    private MARTiEngineOptions options = null;
    private int primaryJobId;
    private String primaryDb;

    /**
    * Class constructor.
    * 
    * @param  o         global MARTiEngineOptions object
    * @param db         primary database name (e.g. "nt")
    * @param dbFilename filename of BLAST file
    * @param id         primary database BLAST jobID
    */
    public BlastDependencies(MARTiEngineOptions o, String db, String dbFilename, int id) {
        options = o;
        primaryDb = db;
        primaryJobId = id;
        dependencies.put(db, id);
        blastFilenames.put(db, dbFilename);
        options.getLog().println("New BlastDependencies "+primaryDb+" "+primaryJobId);
    }
    
    /**
    * Add a BLAST job dependency. 
    *
    * @param db       name of database - e.g. "nt"
    * @param filename filename of BLAST file
    * @param jobId    ID of running job
    */
    public void addDependency(String db, String filename, int jobId) {
        dependencies.put(db, jobId);
        blastFilenames.put(db, filename);
        options.getLog().println("Added dependency "+db+" job "+jobId+" for primary DB "+primaryDb+" primary job "+primaryJobId);
    }
    
    /**
    * Get job ID of dependency 
    *
    * @param  db     name of database - e.g. "nt"
    * @return        ID of job
    */
    public int getDependencyJobId(String db) {
        int id = -1;
        
        if (dependencies.containsKey(db)) {
            id = dependencies.get(db);
        }
        
        return id;
    }
    
    /**
    * Get filename of dependency BLAST 
    *
    * @param  db     name of database - e.g. "nt"
    * @return        filename of BLAST file
    */
    public String getDependencyFile(String db) {
        String filename = null;
        if (blastFilenames.containsKey(db)) {
            filename = blastFilenames.get(db);
        }
        
        return filename;
    }
    
    /**
    * Test if dependencies have been met 
    *
    * @return        true or false if dependencies met or not
    */
    public boolean dependenciesMet() {
        SimpleJobScheduler js = options.getJobScheduler();
        Set<String> ids = dependencies.keySet();
        boolean completed = true;

        for (String dbId: ids) {
            int jobId = dependencies.get(dbId);
            if (js.checkJobCompleted(jobId) == false) {
                completed = false;
                options.getLog().println("Dependency for "+dbId+" not met, job "+jobId);
            }
        }        
        
        return completed;
    }
}
