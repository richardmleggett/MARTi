 /*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.blast;

import uk.ac.earlham.marti.megan.MeganFileSet;
import java.io.BufferedReader;
import java.io.File;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.schedule.SlurmScheduler;

/**
 * Represents a BLAST process in the config file - parses and stores options.
 * 
 * @author Richard M. Leggett
 */

public class BlastProcess {
    private MARTiEngineOptions options;
    private String blastName = null;
    private String blastTask = null;
    private String blastDatabase = null;
    private String blastMemory = null;
    private String jobQueue = null;
    private String taxaFilter = "";
    private String negativeTaxaFilter = "";
    private String maxE = "0.001";
    private String maxTargetSeqs = "25";
    private String dustString = "";
    private int runMeganEvery = 0;
    private int numThreads = 1;
    private boolean classifyThis = false;
    private MeganFileSet meganFileSet = null;
    
    public BlastProcess(MARTiEngineOptions meo) {
        options = meo;
        meganFileSet = new MeganFileSet(options);
    }
    
    public MeganFileSet getMeganFileSet() {
        return meganFileSet;
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
                                blastName = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Program") == 0) {
                                blastTask = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Database") == 0) {
                                blastDatabase = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Memory") == 0) {
                                blastMemory = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Queue") == 0) {
                                jobQueue = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("TaxaFilter") == 0) {
                                taxaFilter = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("NegativeTaxaFilter") == 0) {
                                negativeTaxaFilter = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("MaxE") == 0) {
                                maxE = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("MaxTargetSeqs") == 0) {
                                maxTargetSeqs = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("RunMeganEvery") == 0) {
                                runMeganEvery = Integer.parseInt(tokens[1]);
                            } else if (tokens[0].compareToIgnoreCase("BlastThreads") == 0) {
                                numThreads = Integer.parseInt(tokens[1]);
                            } else if (tokens[0].compareTo("UseToClassify") == 0) {
                                classifyThis = true;
                            } else if (tokens[0].compareTo("Dust") == 0) {
                                //dustString = "'" + tokens[1].replaceAll("^'+", "").replaceAll("'+$", "") + "'";
                                dustString = tokens[1].replaceAll("^'+", "").replaceAll("'+$", "");
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
        
        if (blastName == null) {
            System.out.println("Error: missing BLAST name.");
            System.exit(1);
        }

        if (blastTask == null) {
            System.out.println("Error: missing BLAST program.");
            System.exit(1);
        }

        if (blastDatabase == null) {
            System.out.println("Error: missing BLAST database.");
            System.exit(1);
        }

        if (options.getJobScheduler() instanceof SlurmScheduler) {    
            if (blastMemory == null) {
                System.out.println("Error: missing memory in BLAST process config.");
                System.exit(1);
            }
            
            if (jobQueue == null) {
                System.out.println("Error: missing job queue in BLAST process config.");
                System.exit(1);
            }
        }
        
        //if (blastName.equalsIgnoreCase("nt")) {
        //    classifyThis = true;
        //    System.out.println("Blast process "+blastName+" will provide classifications");
        //} else {
        //    System.out.println("Blast process "+blastName);
        //}
        
        if (blastName.equalsIgnoreCase("card")) {
            File dbFile = new File(blastDatabase);
            String dbDir = dbFile.getParent();
            options.registerCARDDatabase(dbDir);
        }

        return line;
    }
    
    public boolean useForClassifying() {
        return classifyThis;
    }
    
    public String getBlastName() {
        return blastName;
    }
    
    public int getNumThreads() {
        return numThreads;
    }
    
    public String getBlastTask() {
        return blastTask;
    }
    
    public String getBlastDatabase() {
        return blastDatabase;
    }
    
    public String getBlastMemory() {
        return blastMemory;
    }
    
    public String getJobQueue() {
        return jobQueue;
    }
    
    public String getTaxaFilter() {
        return taxaFilter;
    }
    
    public String getNegativeTaxaFilter(){
        return negativeTaxaFilter;
    }
    
    public String getMaxE() {
        return maxE;
    }
    
    public String getMaxTargetSeqs() {
        return maxTargetSeqs;
    }
       
    public int getRunMeganEvery() {
        return runMeganEvery;
    }    
    
    public void checkForMeganInitiation() {
        meganFileSet.checkForMeganInitiation(this);
    }
    
    public void setClassifyThis() {
        classifyThis = true;
    }
    
    public String getDustString() {
        return dustString;
    }
}
