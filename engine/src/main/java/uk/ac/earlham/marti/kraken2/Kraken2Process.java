/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.kraken2;

import java.io.BufferedReader;
import java.io.File;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.schedule.SlurmScheduler;

/**
 *
 * @author martins
 */
public class Kraken2Process {
    
    private MARTiEngineOptions options;
    private String kraken2Name = null;
    private String kraken2Database = null;
    private int numThreads = 1;
    private boolean classifyThis = false;
    private String kraken2Memory = null;
    private String jobQueue = null;
    private int minHitGroups = 1;
    private int primaryAssignments = 1;

    
    public Kraken2Process(MARTiEngineOptions o) {
        options = o;
    }
    
    
    public String readConfigFile(BufferedReader br) {
        String line = null;
        
        // Default job queue
        jobQueue = options.getQueue();
        
        boolean keepReading = true;
        try {
            do {
                line = br.readLine();
                if (line != null) {
                    line = line.trim();
                    if (line.length() > 1) {
                        if (!line.startsWith("#")) {
                            String[] tokens = line.split(":");
                            if (tokens[0].compareToIgnoreCase("Name") == 0) {
                                kraken2Name = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Database") == 0) {
                                kraken2Database = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Memory") == 0) {
                                kraken2Memory = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Queue") == 0) {
                                jobQueue = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Kraken2Threads") == 0) {
                                numThreads = Integer.parseInt(tokens[1]);
                            } else if (tokens[0].compareTo("UseToClassify") == 0) {
                                classifyThis = true;
                            } else {
                                keepReading = false;
                            }
                        }
                    }
                }              
            } while ((line != null) && (keepReading));
        } catch (Exception e) {
            System.out.println("readConfigFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }
        
        if (kraken2Name == null) {
            System.out.println("Error: missing Kraken2 name.");
            System.exit(1);
        }

        if (kraken2Database == null) {
            System.out.println("Error: missing Kraken2 database.");
            System.exit(1);
        }

        if (options.getJobScheduler() instanceof SlurmScheduler) {    
            if (kraken2Memory == null) {
                System.out.println("Error: missing memory in Kraken2 process config.");
                System.exit(1);
            }
            
            if (jobQueue == null) {
                System.out.println("Error: missing job queue in Kraken2 process config.");
                System.exit(1);
            }
        }

        return line;
    }
    
    public String getName() {
        return kraken2Name;
    }
    
    public String getDatabase() {
        return kraken2Database;
    }
      
    public String getJobQueue() {
        return jobQueue;
    }
    
    public String getMemory() {
        return kraken2Memory;
    }
    
    public boolean useForClassifying() {
        return classifyThis;
    }
    
    public String getProcessDir() {
        return options.getSampleDirectory() + File.separator + "kraken2_" + kraken2Name + File.separator;
    }
    
    public int getMinHitGroups() {
        return minHitGroups;
    }
    
    public int getNumThreads() {
        return numThreads;
    }
    
    public int getNumPrimaryAssignments() {
        return primaryAssignments;
    }
   
}
