/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.centrifuge;

import java.io.BufferedReader;
import java.io.File;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.schedule.SlurmScheduler;

/**
 *
 * @author martins
 */
public class CentrifugeProcess {
    
    private MARTiEngineOptions options;
    private String centrifugeName = null;
    private String centrifugeDatabase = null;
    private int numThreads = 1;
    private boolean classifyThis = false;
    private String centrifugeMemory = null;
    private String jobQueue = null;
    private int minHitLen = 100;
    private int primaryAssignments = 1;

    
    public CentrifugeProcess(MARTiEngineOptions o) {
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
                                centrifugeName = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Database") == 0) {
                                centrifugeDatabase = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Memory") == 0) {
                                centrifugeMemory = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Queue") == 0) {
                                jobQueue = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("CentrifugeThreads") == 0) {
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
        
        if (centrifugeName == null) {
            System.out.println("Error: missing Centrifuge name.");
            System.exit(1);
        }

        if (centrifugeDatabase == null) {
            System.out.println("Error: missing Centrifuge database.");
            System.exit(1);
        }

        if (options.getJobScheduler() instanceof SlurmScheduler) {    
            if (centrifugeMemory == null) {
                System.out.println("Error: missing memory in Centrifuge process config.");
                System.exit(1);
            }
            
            if (jobQueue == null) {
                System.out.println("Error: missing job queue in Centrifuge process config.");
                System.exit(1);
            }
        }

        return line;
    }
    
    public String getName() {
        return centrifugeName;
    }
    
    public String getDatabase() {
        return centrifugeDatabase;
    }
      
    public String getJobQueue() {
        return jobQueue;
    }
    
    public String getMemory() {
        return centrifugeMemory;
    }
    
    public boolean useForClassifying() {
        return classifyThis;
    }
    
    public String getProcessDir() {
        return options.getSampleDirectory() + File.separator + "centrifuge_" + centrifugeName + File.separator;
    }
    
    public int getMinHitLen() {
        return minHitLen;
    }
    
    public int getNumThreads() {
        return numThreads;
    }
    
    public int getNumPrimaryAssignments() {
        return primaryAssignments;
    }
   
}
