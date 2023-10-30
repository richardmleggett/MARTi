/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.megan;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import uk.ac.earlham.marti.blast.BlastProcess;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * Write MEGAN command files and launch MEGAN.
 * 
 * @author Richard M. Leggett
 */
public class MeganFile {
    private MARTiEngineOptions options;
    private ArrayList<MeganFilePair> files = new ArrayList<MeganFilePair>();
    private String barcodeDirectory=null;
    private int lastMeganSubmitted = -1;
    
    public MeganFile(MARTiEngineOptions o) {
        options = o;
    }
    
    private String getMeganDir() {
        String meganDir = options.getSampleDirectory() + File.separator + "megan";

        // BUG? barcodeDirectory can be ""
        if (barcodeDirectory != null) {
            meganDir = meganDir + File.separator + barcodeDirectory;
        }

        File f = new File(meganDir);
        
        if (!f.exists()) {
            f.mkdir();
        }
        
        return meganDir;
    }
    
    private String getMeganFilenamePrefix(int n) {
        String filenamePrefix = getMeganDir() + File.separator + options.getSampleName() + "_" + n;
        return filenamePrefix;
    }
    
    private void launchMeganJob(String cmdPathname, String logPathname) {
        String[] commands;
        
        
        
        if (options.useXvfb()) {
            if (options.getMeganPropertiesFile() != null) {
                commands = new String[]{"xvfb-run",
                                options.getMeganCmdLine(), "-g",
                                 "-c", cmdPathname,
                                 "-p", options.getMeganPropertiesFile(),
                                 "-L", options.getMeganLicense()};        
            } else {
                commands = new String[]{"xvfb-run",
                                options.getMeganCmdLine(), "-g",
                                 "-c", cmdPathname,
                                 "-L", options.getMeganLicense()};        
            }
        } else {
            if (options.getMeganPropertiesFile() != null) {
                commands = new String[]{options.getMeganCmdLine(), "-g",
                                 "-c", cmdPathname,
                                 "-p", options.getMeganPropertiesFile(),
                                 "-L", options.getMeganLicense()};
            } else {
                commands = new String[]{options.getMeganCmdLine(), "-g",
                                 "-c", cmdPathname,
                                 "-L", options.getMeganLicense()};
            }
        }
    
        String identifier = "megan_"+cmdPathname;
        int jobid = options.getJobScheduler().submitJob(identifier, commands, logPathname, false);
    }
    
    private void writeMeganLaunchFile(String launchPathname, String slurmLogPathname, String cmdPathname) {
        try {
            PrintWriter pw = new PrintWriter(new FileWriter(launchPathname));
             if (options.getSchedulerName().equals("slurm")) {
                 pw.print("slurmit -p ei-long -c 4 -o " + slurmLogPathname + " -m \"16G\" \"");
             }
             pw.print(options.getMeganCmdLine());
             pw.print(" -g -c " + cmdPathname);
             if (options.getMeganPropertiesFile() != null) {
                 pw.print(" -p "+options.getMeganPropertiesFile());
             }
             pw.println(" -L " + options.getMeganLicense());
             if (options.getSchedulerName().equals("slurm")) {
                 pw.print("\"");
             }                    
             pw.close();        
        } catch (Exception e) {
            System.out.println("writeMeganLaunchFile exception");
            e.printStackTrace();
        }
    }
    
    private void writeMeganCommandFile(String cmdPathname, String meganOutPathname, String minSupport, String blastFileString, String fastaFileString) {
        try {
            options.getLog().println("Writing MEGAN command file " + cmdPathname);
            PrintWriter pw = new PrintWriter(new FileWriter(cmdPathname));
            pw.println("setprop MaxNumberCores=4;");
            pw.print("import blastFile="+blastFileString+" fastaFile="+fastaFileString +" meganFile="+meganOutPathname);
            pw.println(" maxMatches=100 maxExpected=0.001 "+minSupport+" minComplexity=0 blastFormat=BlastTAB;");
            pw.println("quit;");
            pw.close();
        } catch (Exception e) {
            System.out.println("writeMeganCommandFile exception");
            e.printStackTrace();
        }
    }
    
    private void writeMeganFile(BlastProcess blastProcess) {             
        String filenamePrefix = getMeganFilenamePrefix(files.size()-1);
        String blastFileString="";
        String fastaFileString="";

        for (int fc=0; fc<files.size(); fc++) {
            String fileName = "all_" + Integer.toString(fc);
            MeganFilePair mfp = files.get(fc);
            String fastaPathname = mfp.getFastaFilename();
            String blastPathname = mfp.getBlastFilename();

            if (blastFileString != "") {
                blastFileString += ",";
                fastaFileString += ",";
            }
            fastaFileString = fastaFileString + "'" + fastaPathname + "'";
            blastFileString = blastFileString + "'" + blastPathname + "'";
        }

        if (options.isDoingMeganMinSupport()) {
            // A is min support 1
            String cmdPathname =  filenamePrefix + "_ms1.cmds";
            String meganPathname = filenamePrefix + "_ms1.rma";
            String slurmPathname = filenamePrefix + "_ms1.sh";
            String slurmLogname = filenamePrefix + "_ms1_slurm.log";
            writeMeganCommandFile(cmdPathname, meganPathname, "minSupport=1", blastFileString, fastaFileString);
            writeMeganLaunchFile(slurmPathname, slurmLogname, cmdPathname);            
        }
        
        if (options.isDoingMeganMinSupportPercent()) {
            // B is min support 0.1%
            String cmdPathname = filenamePrefix + "_ms0.1pc.cmds";
            String meganPathname = filenamePrefix + "_ms0.1pc.rma";
            String slurmPathname = filenamePrefix + "_ms0.1pc.sh";
            String slurmLogname = filenamePrefix + "_ms0.1pc_slurm.log";
            writeMeganLaunchFile(slurmPathname, slurmLogname, cmdPathname);
            writeMeganCommandFile(cmdPathname, meganPathname, "minSupportPercent=0.1", blastFileString, fastaFileString);
        }        
    }
    
    public void addBlastResult(String fastaPath, String blastPath, int jobid) {        
        files.add(new MeganFilePair(fastaPath, blastPath, jobid));
        
        if (barcodeDirectory == null) {            
            if (fastaPath.contains("barcode")) {
                String bcString = fastaPath.substring(fastaPath.indexOf("barcode"), fastaPath.indexOf("barcode")+9);
                barcodeDirectory = bcString;
            } else {
                barcodeDirectory = "";
            }
        }
        
        // Need to write a MEGAN file for each BLAST process
        ArrayList<BlastProcess> bp = options.getBlastProcesses();
        for (int i=0; i<bp.size(); i++) {
            BlastProcess blastProcess = bp.get(i);
            this.writeMeganFile(blastProcess);
        }        
    }
    
    private void runMegan(int f) {
        String filenamePrefix = getMeganFilenamePrefix(f);

        if (options.isDoingMeganMinSupport()) {
            String cmdPathname =  filenamePrefix + "_ms1.cmds";
            String logname = filenamePrefix + "_ms1.log";
            launchMeganJob(cmdPathname, logname);
        }
        
        if (options.isDoingMeganMinSupportPercent()) {
            String cmdPathname = filenamePrefix + "_ms0.1pc.cmds";
            String logname = filenamePrefix + "_ms0.1pc.log";        
            launchMeganJob(cmdPathname, logname);
        }
        
        lastMeganSubmitted = f;
    }
    
    public void checkForMeganJobInitiation(BlastProcess blastProcess) {
        for (int f=lastMeganSubmitted+1; f<files.size(); f++) {
            MeganFilePair mfp = files.get(f);
            if (options.getJobScheduler().checkJobCompleted(mfp.getJobId()) == false) {
                // no more BLAST jobs complete - break out
                //System.out.println("Not complete on "+f + " job id " + mfp.getJobId());
                break;
            }
                    
            options.getLog().println("BLAST job complete for file "+f+" "+barcodeDirectory);
                    
            boolean runMeganNow = false;
            if ((blastProcess.getRunMeganEvery()== 1) && (f == 0)) {
                runMeganNow = true;
            } else if (((f+1) % blastProcess.getRunMeganEvery()) == 0) {
                runMeganNow = true;
            }
            
            if (runMeganNow) {
                // All BLAST jobs complete, so can run MEGAN
                options.getLog().println("Running MEGAN job upto file "+f+ " "+barcodeDirectory);
                this.runMegan(f);
            }
        }
    }
    
    public int getNumberOfFiles() {
        return files.size();
    }
}
