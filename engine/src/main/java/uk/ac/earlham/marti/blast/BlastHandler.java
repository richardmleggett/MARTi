/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.blast;

import uk.ac.earlham.marti.schedule.*;
import uk.ac.earlham.marti.core.*;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Arrays;
/**
 * Handle creation of BLAST commands, processing filenames etc.
 * 
 * @author Richard M. Leggett
 */

public class BlastHandler {
    private MARTiEngineOptions options = null;
    private int nSeqs = 0;
    private ArrayList<String> mergeList = new ArrayList<String>();
    //private String defaultFormatString = "6 qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore stitle staxids";
    private String defaultFormatString = "6 qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore qcovs staxids";
    private ArrayList<String> inputFilenames = new ArrayList<String>();
    private ArrayList<String> blastFilenames = new ArrayList<String>();
    private ArrayList<Integer> blastJobsPending = new ArrayList<Integer>();
    private ArrayList<Integer> blastJobsCompleted = new ArrayList<Integer>();
    private int blastJobCount = 0;
    
    public BlastHandler(MARTiEngineOptions o) {
        options = o;
    }
    
    private synchronized boolean checkBlastFilesExist(String inputPathname) {
        boolean gotAll = true;
        ArrayList<BlastProcess> blastProcesses = options.getBlastProcesses();
        for (int i=0; i<blastProcesses.size(); i++) {
            BlastProcess bp = blastProcesses.get(i);
            String outputBlast = this.getBlastFilePathFromFastaFilePath(inputPathname, bp);
            File f = new File(outputBlast);
            if (!f.exists()) {
                File fgz = new File(outputBlast + ".gz");
                if(!fgz.exists()) {
                    options.getLog().println("dontrunblast - can't find BLAST files "+outputBlast + " or " + outputBlast + ".gz");
                    gotAll = false;
                }
            }
        }
                
        return gotAll;
    }
    
    private synchronized void runBlasts(String inputPathname) {
        int barcode = options.getBarcodeFromPath(inputPathname);
        if(options.runningCARD()) {
            defaultFormatString = "6 qseqid sseqid pident length mismatch gapopen qstart qend sstart send evalue bitscore stitle qcovs staxids";
        }           
        String formatString;
        ArrayList<BlastProcess> blastProcesses = options.getBlastProcesses();
        File iff = new File(inputPathname);
        String fileName = iff.getName();
        String filePrefix = fileName;
        int classifyId = 0;
        int vfdbId = 0;
        int cardId = 0;
        String classifyFilename = null;
        String vfdbFilename = null;
        String cardFilename = null;

        // If not running blast command, check blast files exist, else ignore
        if (options.runBlastCommand() == false) {
            if (checkBlastFilesExist(inputPathname) == false) {
                options.getLog().println("dontrunblast - ignoring "+inputPathname+" due to missing BLAST files");
                options.getProgressReport().decrementChunkCount();
                return;
            }
        }
        
        if (filePrefix.contains(".")) {
            filePrefix = fileName.substring(0, fileName.lastIndexOf('.'));
        }
                
        for (int i=0; i<blastProcesses.size(); i++) {
            BlastProcess bp = blastProcesses.get(i);
            String blastName = bp.getBlastName();
            String blastDb = bp.getBlastDatabase();
            String memory = bp.getBlastMemory();
            String queue = bp.getJobQueue();
            String taxfilter = bp.getTaxaFilter();
            String negativeTaxaFilter = bp.getNegativeTaxaFilter();
            String dustString = bp.getDustString();
                 
            String outputBlast = this.getBlastFilePathFromFastaFilePath(inputPathname, bp);
            String commandFile = this.getCommandFilePathFromFastaFilePath(inputPathname, bp);
            String classifierFile = this.getClassifierFilePathFromFastaFilePath(inputPathname, bp);
            String logFile = this.getBlastLogFilePathFromFastaFilePath(inputPathname, bp);

            options.getLog().println("  BLAST input: " + inputPathname);
            options.getLog().println(" BLAST output: " + outputBlast);
            options.getLog().println("BLAST command: " + commandFile);
            options.getLog().println("    BLAST log: " + logFile);
            
            inputFilenames.add(inputPathname);
            blastFilenames.add(outputBlast);

            if (options.getSchedulerName().equals("local")) {
                formatString = defaultFormatString;
            } else {
                formatString = "'" + defaultFormatString + "'";
                if(dustString.length() > 0) {
                    dustString = "'" + dustString + "'";
                }
            }
            
            try {
                options.getLog().println("Writing blast command file "+commandFile);
                PrintWriter pw = new PrintWriter(new FileWriter(commandFile));
                // TODO: -task option shouldn't be hardcoded
                String command = "";
                JobScheduler jobScheduler = options.getJobScheduler();
                String identifier = bp.getBlastName()+"_"+bp.getBlastTask()+"_"+outputBlast;

                command = "blastn" + 
                          " -db " + blastDb +
                          " -query " + inputPathname +
                          " -evalue " + bp.getMaxE() +
                          " -max_target_seqs " + bp.getMaxTargetSeqs() +
                          " -show_gis" +
                          " -num_threads " + Integer.toString(bp.getNumThreads()) + 
                          " -task "+bp.getBlastTask() +
                          " -out " + outputBlast + 
                          " -outfmt "+formatString;

                if (taxfilter.length() > 1) {
                    command = command + " -taxidlist " + taxfilter;
                }
                if (negativeTaxaFilter.length() > 1) {
                    command = command + " -negative_taxidlist " + negativeTaxaFilter;
                }
                if(dustString.length() > 0) {
                     command = command + " -dust " + dustString; 
                }
                
                pw.write(command);
                pw.close();
                
                int jobid = 0;
                if (jobScheduler == null) {
                    System.out.println("Shouldn't get to a null job scheduler!");
                    //options.getLog().println("Submitting blast command file to SLURM "+commandFile);
                    //ProcessLogger pl = new ProcessLogger();
                    //String[] commands = {"slurmit",
                    //                     "-o", logFile,
                    //                     "-p", queue,
                    //                     "-m", memory,
                    //                     "-c", Integer.toString(bp.getNumThreads()),
                    //                     "sh "+commandFile};
                    //pl.runCommandToLog(commands, options.getLog());            
                                        
                    // Need to get the correct LSF ID
                    //blastJobsPending.add(blastJobCount);                    
                } else {
                    ArrayList<String> commands = new ArrayList<String>( Arrays.asList("blastn",
                                             "-db", blastDb,
                                             "-query", inputPathname,
                                             "-evalue", bp.getMaxE(),
                                             "-max_target_seqs", bp.getMaxTargetSeqs(),
                                             "-show_gis",
                                             "-num_threads", Integer.toString(bp.getNumThreads()),
                                             "-task", bp.getBlastTask(),
                                             "-out", outputBlast,
                                             "-outfmt", formatString)); //defaultFormatString));

                    if (taxfilter.length() > 1) {
                        commands.add("-taxidlist");
                        commands.add(taxfilter);                                    
                    }
                    if (negativeTaxaFilter.length() > 1) {
                        commands.add("-negative_taxidlist");
                        commands.add(negativeTaxaFilter);
                    }
                    if(dustString.length() > 0) {
                        commands.add("-dust");
                        commands.add(dustString);
                    }
                    

                    //System.out.println("Submitting with "+bp.getNumThreads() + " threads");
                    boolean runIt = options.runBlastCommand();
                    
                    if (bp.getBlastName().equals("nt")) {
                        if (options.dontRunNt()) {
                            runIt=false;
                            System.out.println("Debug: Not running nt BLAST");
                        }
                    }
                    //jobid = jobScheduler.submitJob(commands, logFile, options.runBlastCommand());
                    String[] commandString = commands.toArray(new String[commands.size()]);
                    jobid = jobScheduler.submitJob(identifier, commandString, logFile, runIt);
                    if (jobScheduler instanceof SlurmScheduler) {
                        ((SlurmScheduler) jobScheduler).setCPUs(jobid, bp.getNumThreads());
                        if (options.rmlDebug()) {
                            if (jobid == 4) {
                                options.getLog().printlnLogAndScreen("RML DEBUG: If you see this and you're not Richard Leggett, something went wrong");
                                ((SlurmScheduler) jobScheduler).setJobMemory(jobid, "2G");                            
                            } else {
                                ((SlurmScheduler) jobScheduler).setJobMemory(jobid, bp.getBlastMemory());
                            }
                        } else {
                            ((SlurmScheduler) jobScheduler).setJobMemory(jobid, bp.getBlastMemory());
                        }
                        ((SlurmScheduler) jobScheduler).setQueue(jobid, bp.getJobQueue());
                        ((SlurmScheduler) jobScheduler).setDependentFilename(jobid, outputBlast);
                    }

                    if (bp.useForClassifying()) {
                        classifyFilename = outputBlast;
                        classifyId = jobid;
                    } else if (bp.getBlastName().equalsIgnoreCase("vfdb")) {
                        vfdbFilename = outputBlast;
                        vfdbId = jobid;
                    } else if (bp.getBlastName().equalsIgnoreCase("card")) {
                        cardFilename = outputBlast;
                        cardId = jobid;
                    }
                    //else if (bp.needsClassifying()) {
                    //    ntFilename = outputBlast;
                    //    ntId = jobid;
                    //}
                                                            
                    blastJobsPending.add(jobid);

                    if (options.isClassifyingReads()) {
                        options.getReadClassifier().addFile(bp.getBlastName(), jobid, inputPathname, outputBlast, logFile, classifierFile);
                    }

                    bp.getMeganFileSet().addBlastResult(inputPathname, outputBlast, jobid);            
                }  
                options.getProgressReport().incrementChunksBlastedCount();                                    
                blastJobCount++;
            } catch (IOException e) {
                System.out.println("runBlast exception");
                e.printStackTrace();
            }
        }
        
        if (classifyId != 0) {          
            options.getReadClassifier().createBlastDependency("nt", classifyFilename, classifyId);
        
            if (vfdbId > 0) {
                options.getReadClassifier().addBlastDependency(classifyId, "VFDB", vfdbFilename, vfdbId);
            }
            if (cardId > 0) {
                options.getReadClassifier().addBlastDependency(classifyId, "card", cardFilename, cardId);
            }
        
        }
        
        //options.getReadClassifier().linkNTToVFDBResults(ntId, vfdbId);
    }    
    
//    private String mergeInputFiles() {
//        String mergedPathname = options.getReadDir() + 
//                                "_chunks" + File.separator + 
//                                "all_" + Integer.toString(fileCounter) + 
//                                (options.getReadFormat() == MARTiEngineOptions.FASTA ? ".fasta":".fastq");
//
//        options.getLog().println("Writing merged file "+mergedPathname);
//               
//        try {
//            PrintWriter pw = new PrintWriter(new FileWriter(mergedPathname));
//            PrintWriter pwSizes = null;
//
//            
//            for (int i=0; i<mergeList.size(); i++) {                
//                BufferedReader br = new BufferedReader(new FileReader(mergeList.get(i)));
//                String line;
//                String id = "Unknown";
//                int lineCount = 0;
//                int readSize = 0;
//
//                while ((line = br.readLine()) != null) {
//                    pw.println(line);
//                }
//                br.close();
//
//            }
//            pw.close();
//        } catch (IOException e) {
//            System.out.println("mergeFiles exception");
//            e.printStackTrace();
//        }
//        return mergedPathname;
//    }     
    
    public synchronized void addReadChunk(String readFilename) {
        runBlasts(readFilename);
    }
    
    private String getBarcodeSubdirFromPath(String pathname, String parent) {
        String subDir="";
        String fullDir="";

        if (pathname.contains("barcode")) {
            String bcString = pathname.substring(pathname.indexOf("barcode"), pathname.indexOf("barcode")+9);
            //String bcString = pathname.substring(pathname.indexOf("barcode")+7, pathname.indexOf("barcode")+9);
            //int barcode = Integer.parseInt(bcString);
            subDir = bcString + File.separator;
        }
        
        fullDir = parent + subDir;
        File fullDirFile = new File(fullDir);
        if (!fullDirFile.exists()) {
            options.getLog().println("Creating dir "+fullDir);
            fullDirFile.mkdir();
        }
        
        return subDir;
    }
    
    public String getBlastFilePathFromFastaFilePath(String fastaPath, BlastProcess bp) {
        File fastaFile = new File(fastaPath);
        String leafName = fastaFile.getName();
        String filePrefix = leafName.substring(0, leafName.lastIndexOf('.'));
        String blastDir = options.getSampleDirectory() + File.separator +
                          bp.getBlastTask() + "_" + bp.getBlastName() + File.separator;
        String blastPath = blastDir +
                           getBarcodeSubdirFromPath(fastaPath, blastDir) + 
                           filePrefix + ".txt";
                
        return blastPath;
    }

    public String getClassifierFilePathFromFastaFilePath(String fastaPath, BlastProcess bp) {
        File fastaFile = new File(fastaPath);
        String leafName = fastaFile.getName();
        String filePrefix = leafName.substring(0, leafName.lastIndexOf('.'));
        String lcaParseDir = options.getSampleDirectory() + File.separator + "lcaparse" + File.separator;
        String classifierPath = lcaParseDir +
                           getBarcodeSubdirFromPath(fastaPath, lcaParseDir) + 
                           filePrefix + "_" + bp.getBlastTask() + "_" + bp.getBlastName() + "_lcaparse";
                
        return classifierPath;
    }
    
    
    public String getCommandFilePathFromFastaFilePath(String fastaPath, BlastProcess bp) {
        File fastaFile = new File(fastaPath);
        String leafName = fastaFile.getName();
        String filePrefix = leafName.substring(0, leafName.lastIndexOf('.'));
        String blastDir = options.getSampleDirectory() + File.separator +
                          bp.getBlastTask() + "_" + bp.getBlastName() + File.separator;
        String blastPath = blastDir +
                           getBarcodeSubdirFromPath(fastaPath, blastDir) + 
                           filePrefix + ".sh";
                
        return blastPath;
    }

    public String getBlastLogFilePathFromFastaFilePath(String fastaPath, BlastProcess bp) {
        File fastaFile = new File(fastaPath);
        String leafName = fastaFile.getName();
        String filePrefix = leafName.substring(0, leafName.lastIndexOf('.'));
        String logsDir = options.getLogsDir() + File.separator +
                         bp.getBlastTask() + "_" + bp.getBlastName() + File.separator;
        String logPath = logsDir + 
                         getBarcodeSubdirFromPath(fastaPath, logsDir) + 
                         filePrefix + ".log";
                
        return logPath;
    } 
    
    public synchronized void updateCompletedBlastJobList() {
        for (int i=blastJobsPending.size()-1; i>=0; i--) {
            int jobId = blastJobsPending.get(i);
            if ((options.runBlastCommand() == false) || 
                (options.getJobScheduler().checkJobCompleted(jobId) == true)) {
                blastJobsPending.remove(i);
                blastJobsCompleted.add(jobId);
                options.getLog().println("BLAST job "+jobId+" noted as complete and removed from pending job list.");
            }
        }
    }
    
    public synchronized int getBlastPendingCount() {
        return blastJobsPending.size();
    }

    public synchronized int getBlastCompletedCount() {
        return blastJobsCompleted.size();
    }    
}
