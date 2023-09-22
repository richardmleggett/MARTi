/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.centrifuge;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Arrays;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.schedule.JobScheduler;
import uk.ac.earlham.marti.schedule.SlurmScheduler;

/**
 *
 * @author martins
 */
public class CentrifugeHandler {
    
    private MARTiEngineOptions options = null;
    private int centrifugeJobCount = 0;  
    
    public CentrifugeHandler(MARTiEngineOptions o) {
        options = o;
    }
    
    private synchronized boolean checkCentrifugeFilesExist(String inputPathname) {
        boolean gotAll = true;
        ArrayList<CentrifugeProcess> centrifugeProcesses = options.getCentrifugeProcesses();
        for (int i=0; i<centrifugeProcesses.size(); i++) {
            CentrifugeProcess cp = centrifugeProcesses.get(i);
            String centrifugeFile = this.getCentrifugeFilePathPrefixFromFastqFilePath(inputPathname, cp) + "_classification.txt";
            File f = new File(centrifugeFile);
            if (!f.exists()) {
                File fgz = new File(centrifugeFile + ".gz");
                if(!fgz.exists()) {
                    options.getLog().println("dontrunblast - can't find centrifuge files "+centrifugeFile + " or " + centrifugeFile + ".gz");
                    gotAll = false;
                }
            }
        }          
        return gotAll;
    }
    
    private synchronized void runCentrifuge(String inputPathname) {
        int barcode = options.getBarcodeFromPath(inputPathname);
        ArrayList<CentrifugeProcess> centrifugeProcesses = options.getCentrifugeProcesses();
        String classifyFilename = null;
        int classifyId = 0;
        
        if (options.runBlastCommand() == false) {
            if (checkCentrifugeFilesExist(inputPathname) == false) {
                options.getLog().println("dontrunblast - ignoring "+inputPathname+" due to missing Centrifuge files");
                options.getProgressReport().decrementChunkCount();
                return;
            }
        }
        
        for(int i = 0; i < centrifugeProcesses.size(); i++) {
            CentrifugeProcess cp = centrifugeProcesses.get(i);
            String database = cp.getDatabase();
            String minHitLen = Integer.toString(cp.getMinHitLen());
            String numThreads = Integer.toString(cp.getNumThreads());
            String primaryAssignments = Integer.toString(cp.getNumPrimaryAssignments());
            
            String classificationFilePath = getCentrifugeFilePathPrefixFromFastqFilePath(inputPathname, cp) + "_classification.txt";
            String reportFilePath = getCentrifugeFilePathPrefixFromFastqFilePath(inputPathname, cp) + "_report.txt";
            String commandFilePath = getCentrifugeFilePathPrefixFromFastqFilePath(inputPathname, cp) + ".sh";
            String logFilePath = getCentrifugeLogFilePathFromFastqFilePath(inputPathname, cp);
            
            options.getLog().println(" Centrifuge input: " + inputPathname);
            options.getLog().println(" Centrifuge classification output: " + classificationFilePath);
            options.getLog().println(" Centrifuge report output: " + reportFilePath);
            options.getLog().println(" Centrifuge command: " + commandFilePath);
            options.getLog().println(" Centrifuge log: " + logFilePath);
            
            try {
                options.getLog().println("Writing centrifuge command file "+ commandFilePath);
                PrintWriter pw = new PrintWriter(new FileWriter(commandFilePath));
                String command = "";
                JobScheduler jobScheduler = options.getJobScheduler();
                
                command =   "centrifuge" + 
                            " -x " + database + 
                            " -U " + inputPathname + 
                            " -S " + classificationFilePath + 
                            " --report-file " + reportFilePath + 
                            " --min-hitlen " + minHitLen +
                            " -p " + numThreads + 
                            " -k " + primaryAssignments;
                
                pw.write(command);
                pw.close();
                
                int jobid = 0;
                if (jobScheduler == null) {
                    System.out.println("Shouldn't get to a null job scheduler!");                  
                } else {
                    ArrayList<String> commands = new ArrayList<String>( 
                            Arrays.asList( "centrifuge", 
                            " -x ", database,
                            " -U ", inputPathname,
                            " -S ", classificationFilePath, 
                            " --report-file ", reportFilePath, 
                            " --min-hitlen ", minHitLen,
                            " -p ", numThreads,
                            " -k ", primaryAssignments));
                    
                    boolean runIt = options.runBlastCommand();
                    
                    String[] commandString = commands.toArray(new String[commands.size()]);
                    jobid = jobScheduler.submitJob(commandString, logFilePath, runIt);
                    if (jobScheduler instanceof SlurmScheduler) {
                        ((SlurmScheduler) jobScheduler).setCPUs(jobid, cp.getNumThreads());
                        ((SlurmScheduler) jobScheduler).setJobMemory(jobid, cp.getMemory());
                        ((SlurmScheduler) jobScheduler).setQueue(jobid, cp.getJobQueue());
                    }
                    
                    if (cp.useForClassifying()) {
                        classifyFilename = classificationFilePath;
                        classifyId = jobid;
                    }
                }
                
                if (options.isClassifyingReads()) {
                    options.getCentrifugeClassifier().addFile(cp.getName(), jobid, inputPathname, classificationFilePath);
                }
    
                options.getProgressReport().incrementChunksCentrifugedCount();
                centrifugeJobCount++;
                
                
            } catch (IOException e) {
                System.out.println("runCentrifuge exception");
                e.printStackTrace();
            }           
        }
    }
    
   public synchronized void addReadChunk(String readFilename) {
        runCentrifuge(readFilename);
    }
   
   // TODO: probably this can be generalised into EngineOptions or something to be used
   // by all processes.
   private String getBarcodeSubdirFromPath(String pathname, String parent) {
        String subDir="";
        String fullDir="";

        if (pathname.contains("barcode")) {
            String bcString = pathname.substring(pathname.indexOf("barcode"), pathname.indexOf("barcode")+9);
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
    
    private String getCentrifugeFilePathPrefixFromFastqFilePath(String fastqPath, CentrifugeProcess cp) {
        File fastqFile = new File(fastqPath);
        String leafName = fastqFile.getName();
        String filePrefix = leafName.substring(0, leafName.lastIndexOf('.'));
        String processDir = cp.getProcessDir();
        String path = processDir + getBarcodeSubdirFromPath(fastqPath, processDir) + filePrefix;
        return path;
    }

    private String getCentrifugeLogFilePathFromFastqFilePath(String fastqPath, CentrifugeProcess cp) {
        File fastqFile = new File(fastqPath);
        String leafName = fastqFile.getName();
        String filePrefix = leafName.substring(0, leafName.lastIndexOf('.'));
        String logsDir = options.getLogsDir() + File.separator + "centrifuge_" + cp.getName() + File.separator;
        String logPath = logsDir + getBarcodeSubdirFromPath(fastqPath, logsDir) + filePrefix + ".log";             
        return logPath;
    } 
    
}