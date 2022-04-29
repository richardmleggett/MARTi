/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.util.Calendar;
import java.util.GregorianCalendar;
import uk.ac.earlham.marti.core.MARTiEngine;

/**
 * Global options class for LCAParse.
 * 
 * @author Richard M. Leggett
 */
public class LCAParseOptions {
    public final static int FORMAT_UNKNOWN = 0;
    public final static int FORMAT_PAF = 1;
    public final static int FORMAT_NANOOK = 2;
    public final static int FORMAT_BLASTTAB = 3;
    public final static int FORMAT_BLASTTAXON = 4;
    public final static int FORMAT_SAM = 5;
    private String inputFilename = null;
    private String outputPrefix = null;
    private String taxonomyDirectory = null;
    private String mapFilename = null;
    private int fileFormat = 0;
    public final static String version = MARTiEngine.VERSION_STRING;
    private int maxHitsToConsider = 20;
    private double scorePercent = 90;
    private int minIdentity = 0;
    private int minLength = 0;
    private int minQueryCoverage = 0;
    private int minCombinedScore = 0;
    private boolean limitToSpecies = false;
    private long expectedTaxon = 0;
    private long relatedTaxon = 0;
    private boolean doingMakeMap = false;
    private boolean doingRanks = false;
    private boolean withWarnings = false;
    private boolean doingAnnotate = false;
    private boolean sortHitsByBitScore = false;
    
    public LCAParseOptions() {
    }
    
    public LCAParseOptions(String taxonomyDir, String mapFile, String format, boolean limitSpecies, int maxHits, double scorePc, int minId, int minCov, int minCom, int minLen) {
        taxonomyDirectory = taxonomyDir;
        mapFilename = mapFile;
        processFormat(format);
        limitToSpecies = limitSpecies;
        maxHitsToConsider = maxHits;
        scorePercent = scorePc;
        minIdentity = minId;
        minQueryCoverage = minCov;
        minCombinedScore = minCom;
        minLength = minLen;
    }
    
    public void displayHelp() {
        System.out.println("");
        System.out.println("LCAParse "+version);
        System.out.println("Comments/queries: richard.leggett@earlham.ac.uk");
        System.out.println("");
        System.out.println("To parse:");
        System.out.println("    lcaparse [-input <filename>|-inputlist <filename>] -output <prefix> -taxonomy <directory> -mapfile <filename> -format <string>");
        System.out.println("Where:");
        System.out.println("    -input specifies the name of an input file to parse");
        System.out.println("    -inputlist specifies a file of filenames of input files to parse");
        System.out.println("    -output specifies the output filename prefix");
        System.out.println("    -taxonomy specifies the directory containing NCBI taxonomy files");
        System.out.println("              (files needed are nodes.dmp and names.dmp)");
        System.out.println("    -mapfile specifies the location of an accession to taxon ID mapping file");
        System.out.println("    -format specifies input file format - either 'nanook', 'blasttab', 'blasttaxon' or 'PAF'");
        System.out.println("    -maxhits specifies maximum number of hits to consider for given read (default 20)");
        System.out.println("    -scorepercent specifies minimum score threshold as percentage of top score for given read (default 90)");
        System.out.println("LCA options:");
        System.out.println("    -minidentity specifies minimum identity % (default 0)");        
        System.out.println("    -mincoverage specifies minimum query coverage % (default 0)");
        System.out.println("    -mincombined specifies minimum combined identity and query coverage (default 0)");
        System.out.println("    -minlength specifies minimum length of hit (default 0)");
        System.out.println("    -limitspecies limits taxonomy to species level (default: off)");        
        System.out.println("Analysis options:");
        System.out.println("    -expected specifies the taxon ID of expected species");
        System.out.println("    -relative specifies the taxon ID of close relative species");
        System.out.println("    -warnings turns on warning messages");
        System.out.println("");
        System.out.println("To create mapping file:");
        System.out.println("    lcaparse -makemap -input <filename> -output <prefix> -taxonomy <directory>");
        System.out.println("Where:");
        System.out.println("    -input specifies the name of a nucl_gb.accession2taxid file");
        System.out.println("    -output specifes a prefix to use for output files");
        System.out.println("    -taxonomy specifies the directory containing NCBI taxonomy files");
        System.out.println("              (files needed are nodes.dmp and names.dmp)");
        System.out.println("");
        System.out.println("To view taxonomy ranks:");
        System.out.println("    lcaparse -ranks -taxonomy <directory>");
        System.out.println("");
    }
    
    public void processFormat(String format) {
        if (format.equalsIgnoreCase("nanook")) {
            fileFormat = FORMAT_NANOOK;
        } else if (format.equalsIgnoreCase("blasttab")) {
            fileFormat = FORMAT_BLASTTAB;
        } else if (format.equalsIgnoreCase("paf")) {
            fileFormat = FORMAT_PAF;
        } else if (format.equalsIgnoreCase("blasttaxon")) {
            fileFormat = FORMAT_BLASTTAXON;
        } else if (format.equalsIgnoreCase("sam")) {
            fileFormat = FORMAT_SAM;
        } else {
            System.out.println("Unknown file format: " + format);
            System.exit(1);
        }
    }
    
    public void processCommandLine(String[] args) {
        int i = 0;
        
        while (i < (args.length)) {
            if ((args[i].equalsIgnoreCase("-help")) || (args[i].equalsIgnoreCase("-h"))) {
                displayHelp();
                System.exit(0);
            } else if (args[i].equalsIgnoreCase("-input")) {
                inputFilename = args[i+1];
                i+=2;
            } else if (args[i].equalsIgnoreCase("-inputlist")) {
                System.out.println("Inputlist not yet implemented");
                System.exit(1);
            } else if (args[i].equalsIgnoreCase("-output")) {
                outputPrefix = args[i+1];
                i+=2;
            } else if (args[i].equalsIgnoreCase("-taxonomy")) {
                taxonomyDirectory = args[i+1];
                i+=2;
            } else if (args[i].equalsIgnoreCase("-mapfile")) {
                mapFilename = args[i+1];
                i+=2;
            } else if (args[i].equalsIgnoreCase("-expected")) {
                expectedTaxon = Long.parseLong(args[i+1]);
                i+=2;
            } else if (args[i].equalsIgnoreCase("-related")) {
                relatedTaxon = Long.parseLong(args[i+1]);
                i+=2;
            } else if (args[i].equalsIgnoreCase("-maxhits")) {
                maxHitsToConsider = Integer.parseInt(args[i+1]);
                i+=2;
            } else if (args[i].equalsIgnoreCase("-scorepercent")) {
                scorePercent = Double.parseDouble(args[i+1]);
                i+=2;
            } else if (args[i].equalsIgnoreCase("-minidentity")) {
                minIdentity = Integer.parseInt(args[i+1]);
                i+=2;
            } else if (args[i].equalsIgnoreCase("-mincoverage")) {
                minQueryCoverage = Integer.parseInt(args[i+1]);
                i+=2;
            } else if (args[i].equalsIgnoreCase("-mincombined")) {
                minCombinedScore = Integer.parseInt(args[i+1]);
                i+=2;
            } else if (args[i].equalsIgnoreCase("-minlength")) {
                minLength = Integer.parseInt(args[i+1]);
                i+=2;
            } else if (args[i].equalsIgnoreCase("-limitspecies")) {
                limitToSpecies = true;
                i++;
            } else if (args[i].equalsIgnoreCase("-warnings")) {
                withWarnings = true;
                i++;
            } else if (args[i].equalsIgnoreCase("-format")) {
                processFormat(args[i+1]);
                i+=2;
            } else if (args[i].equalsIgnoreCase("-makemap")) {
                doingMakeMap = true;
                i++;
            } else if (args[i].equalsIgnoreCase("-ranks")) {
                doingRanks = true;
                i++;
            } else if (args[i].equalsIgnoreCase("-annotate")) {
                doingAnnotate = true;
                i++;
            } else {                
                System.out.println("Unknown parameter: " + args[i]);
                System.exit(1);
            }           
        }
        
        if (args.length == 0) {
            displayHelp();
            System.exit(0);
        }
        
        if (doingRanks == false) {
            if (inputFilename == null) {
                System.out.println("Error: you must specify a -input parameter");
                System.exit(1);
            }
            if (outputPrefix == null) {
                System.out.println("Error: you must specify a -output parameter");
                System.exit(1);
            }

            if (taxonomyDirectory == null) {
                System.out.println("Error: you must specify a -taxonomy parameter");
                System.exit(1);
            }
        }
        
        if (doingMakeMap == false) {  
            if ((fileFormat == FORMAT_BLASTTAB) || (fileFormat == FORMAT_PAF) || (fileFormat == FORMAT_SAM)) {
                if (mapFilename == null) {
                    System.out.println("Error: you must specify a -mapfile parameter");
                    System.exit(1);
                }        
            }
        }
        
        if (fileFormat == FORMAT_UNKNOWN) {
            System.out.println("Error: you must specify the file format.");
            System.exit(1);
        }
     }
    
    public String getInputFilename() {
        return inputFilename;
    }
    
    public String getOutputPrefix() {
        return outputPrefix;
    }
    
    public String getTaxaSummaryOutputFilename() {
        return outputPrefix+"_summary.txt";
    }

    public String getPerReadOutputFilename() {
        return outputPrefix+"_perread.txt";
    }
    
    public String getTaxonomyDirectory() {
        return taxonomyDirectory;
    }
    
    public String getMapFilename() {
        return mapFilename;
    }
    
    public int getFileFormat() {
        return fileFormat;
    }
    
    public int getMaxHitsToConsider() {
        return maxHitsToConsider;
    }
    
    public double getScorePercent() {
        return scorePercent;
    }
    
    public int getMinIdentity() {
        return minIdentity;
    }

    public int getMinQueryCoverage() {
        return minQueryCoverage;
    }
    
    public int getMinCombinedScore() {
        return minCombinedScore;
    }
    
    public int getMinLength() {
        return minLength;
    }
        
    public boolean limitToSpecies() {
        return limitToSpecies;
    }
    
    public String getTimeString() {
        GregorianCalendar timeNow = new GregorianCalendar();
        String s = String.format("%d/%d/%d %02d:%02d:%02d",
                                 timeNow.get(Calendar.DAY_OF_MONTH),
                                 timeNow.get(Calendar.MONTH)+1,
                                 timeNow.get(Calendar.YEAR),
                                 timeNow.get(Calendar.HOUR_OF_DAY),
                                 timeNow.get(Calendar.MINUTE),
                                 timeNow.get(Calendar.SECOND));
        return s;
    }
    
    public long getExpectedTaxon() {
        return expectedTaxon;
    }
    
    public long getRelatedTaxon() {
        return relatedTaxon;
    }
    
    public void displayMemory() {
        System.out.println("Total memory: "+ (Runtime.getRuntime().totalMemory() / (1024*1024)) + " Mb");
        System.out.println(" Free memory: "+ (Runtime.getRuntime().freeMemory() / (1024*1024)) + " Mb");
        System.out.println(" Used memory: "+ ((Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / (1024*1024)) + " Mb");
    }    
    
    public boolean requiresAccessionMapping() {
        if ((fileFormat == FORMAT_PAF) ||
            (fileFormat == FORMAT_BLASTTAB) ||
            (fileFormat == FORMAT_SAM)) {
            return true;
        }
        
        return false;
    }
    
    public boolean doingMakeMap() {
        return doingMakeMap;
    }
    
    public boolean doingRanks() {
        return doingRanks;
    }
    
    public boolean doingAnnotate() {
        return doingAnnotate;
    }
    
    public boolean showWarnings() {
        return withWarnings;
    }

    
    private void setSortHitsByBitscore() {
        sortHitsByBitScore = true;
    }
    
    public boolean sortHitsbyBitscore() {
        return sortHitsByBitScore;
    }
}
