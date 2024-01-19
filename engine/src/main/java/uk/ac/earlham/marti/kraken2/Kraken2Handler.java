/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.kraken2;

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
public class Kraken2Handler {
    
    private MARTiEngineOptions options = null;
    private int kraken2JobCount = 0;  
    
    public Kraken2Handler(MARTiEngineOptions o) {
        options = o;
    }
    
    private synchronized boolean checkKraken2FilesExist(String inputPathname) {
        boolean gotAll = true;
       ArrayList<Kraken2Process> kraken2Processes = options.getKraken2Processes();
        for (int i=0; i<kraken2Processes.size(); i++) {
            Kraken2Process k2p = kraken2Processes.get(i);
            String kraken2File = this.getKraken2FilePathPrefixFromFastqFilePath(inputPathname, k2p) + "_classification.txt";
            File f = new File(kraken2File);
            if (!f.exists()) {
                File fgz = new File(kraken2File + ".gz");
                if(!fgz.exists()) {
                    options.getLog().println("dontrunblast - can't find kraken2 files "+kraken2File + " or " + kraken2File + ".gz");
                    gotAll = false;
                }
            }
        }         
        return gotAll;
    }
    
    
    private synchronized void runKraken2(String inputPathname) {
        int barcode = options.getBarcodeFromPath(inputPathname);
        ArrayList<Kraken2Process> kraken2Processes = options.getKraken2Processes();
        String classifyFilename = null;
        int classifyId = 0;
        
        if (options.runBlastCommand() == false) {
            if (checkKraken2FilesExist(inputPathname) == false) {
                options.getLog().println("dontrunblast - ignoring "+inputPathname+" due to missing Kraken2 files");
                options.getProgressReport().decrementChunkCount();
                return;
            }
        }
        
        for(int i = 0; i < kraken2Processes.size(); i++) {
            Kraken2Process k2p = kraken2Processes.get(i);
            String database = k2p.getDatabase();
            String numThreads = Integer.toString(k2p.getNumThreads());
            
            String classificationFilePath = getKraken2FilePathPrefixFromFastqFilePath(inputPathname, k2p) + "_classification.txt";
            String commandFilePath = getKraken2FilePathPrefixFromFastqFilePath(inputPathname, k2p) + ".sh";
            String logFilePath = getKraken2LogFilePathFromFastqFilePath(inputPathname, k2p);
            
            options.getLog().println(" Kraken2 input: " + inputPathname);
            options.getLog().println(" Kraken2 classification output: " + classificationFilePath);
            options.getLog().println(" Kraken2 command: " + commandFilePath);
            options.getLog().println(" Kraken2 log: " + logFilePath);
            
            try {
                options.getLog().println("Writing Kraken2 command file "+ commandFilePath);
                PrintWriter pw = new PrintWriter(new FileWriter(commandFilePath));
                String command = "";
                JobScheduler jobScheduler = options.getJobScheduler();
                String identifier = "kraken2_"+inputPathname;
                
                command =   "kraken2" + 
                            " --db " + database +
                            " --output " + classificationFilePath +
                            " --threads " + numThreads + " " +
                            inputPathname;
                
                pw.write(command);
                pw.close();
                
                int jobid = 0;
                if (jobScheduler == null) {
                    System.out.println("Shouldn't get to a null job scheduler!");                  
                } else {
                    ArrayList<String> commands = new ArrayList<String>( 
                            Arrays.asList( "kraken2", 
                            "--db", database,
                            "--output", classificationFilePath,
                            "--threads", numThreads, " ",
                            inputPathname));
                    
                    boolean runIt = options.runBlastCommand();
                    
                    String[] commandString = commands.toArray(new String[commands.size()]);
                    jobid = jobScheduler.submitJob(identifier, commandString, logFilePath, runIt);
                    if (jobScheduler instanceof SlurmScheduler) {
                        ((SlurmScheduler) jobScheduler).setCPUs(jobid, k2p.getNumThreads());
                        ((SlurmScheduler) jobScheduler).setJobMemory(jobid, k2p.getMemory());
                        ((SlurmScheduler) jobScheduler).setQueue(jobid, k2p.getJobQueue());
                    }
                    
                    if (k2p.useForClassifying()) {
                        classifyFilename = classificationFilePath;
                        classifyId = jobid;
                    }
                }
                
                if (options.isClassifyingReads()) {
                    options.getKraken2Classifier().addFile(k2p.getName(), jobid, inputPathname, classificationFilePath);
                }
    
                options.getProgressReport().incrementChunksKraken2dCount();
                kraken2JobCount++;
                
                
            } catch (IOException e) {
                System.out.println("runKraken2 exception");
                e.printStackTrace();
            }           
        }
    }
    
   public synchronized void addReadChunk(String readFilename) {
        runKraken2(readFilename);
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
    
    private String getKraken2FilePathPrefixFromFastqFilePath(String fastqPath, Kraken2Process k2p) {
        File fastqFile = new File(fastqPath);
        String leafName = fastqFile.getName();
        String filePrefix = leafName.substring(0, leafName.lastIndexOf('.'));
        String processDir = k2p.getProcessDir();
        String path = processDir + getBarcodeSubdirFromPath(fastqPath, processDir) + filePrefix;
        return path;
    }

    private String getKraken2LogFilePathFromFastqFilePath(String fastqPath, Kraken2Process k2p) {
        File fastqFile = new File(fastqPath);
        String leafName = fastqFile.getName();
        String filePrefix = leafName.substring(0, leafName.lastIndexOf('.'));
        String logsDir = options.getLogsDir() + File.separator + "kraken2_" + k2p.getName() + File.separator;
        String logPath = logsDir + getBarcodeSubdirFromPath(fastqPath, logsDir) + filePrefix + ".log";             
        return logPath;
    } 
}
