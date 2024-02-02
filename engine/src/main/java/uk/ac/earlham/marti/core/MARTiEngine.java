/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.*;
import java.util.*;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.zip.*;
import uk.ac.earlham.marti.amr.WalkOutRead;
import uk.ac.earlham.marti.schedule.*;

/**
 * Entry class for tool.
 * 
 * @author Richard M. Leggett
 */
public class MARTiEngine {
    public final static String VERSION_STRING = "v0.9.16";
    public final static long SERIAL_VERSION = 3L;
    public final static boolean SHOW_NOTES = false;
        
    private static void process(MARTiEngineOptions options) throws InterruptedException {
        ReadProcessor rp = new ReadProcessor(options, options.getProgressReport());
        options.makeDirectories();
        options.writeMetadataJSONs();
        rp.process();
    }    
    
    private static void memoryReport() {
        Runtime runtime = Runtime.getRuntime();
        long mb = 1024 * 1024;
        long totalMem = runtime.totalMemory() / mb;
        long maxMem = runtime.maxMemory() / mb;
        long freeMem = runtime.freeMemory() / mb;
        System.out.println("totalMem: " + totalMem + "Mb");
        System.out.println("  maxMem: " + maxMem + "Mb");
        System.out.println(" freeMem: " + freeMem + "Mb");
    }
    
    private static void testUnzip() {
        System.out.println("Testing unzip...");
        String filename="/Users/leggettr/Desktop/testdata/RL_KewAirCollections_25082022/20220825_1141_X2_FAT13928_6d06bfee/fastq_pass/barcode32/FAT13928_pass_barcode32_cae06ba5_0.fastq.gz";
        
        try {
            InputStream fileStream = new FileInputStream(filename);
            InputStream gzipStream = new GZIPInputStream(fileStream);
            Reader decoder = new InputStreamReader(gzipStream, "US-ASCII");
            BufferedReader br = new BufferedReader(decoder);  
            String line = null;
            int linesRead = 0;
            do {
                line = br.readLine();
                if (line != null) {
                    System.out.println("Line: "+line);
                    linesRead++;                    
                }
            } while ((line != null) && (linesRead < 8));            
            br.close();
        } catch (Exception e) {
            System.out.println("Exception:");
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    /**
     * Entry to tool.
     * @param args command line arguments
     * @throws InterruptedException if thread is interrupted
     */
    public static void main(String[] args) throws InterruptedException {
        System.out.println("");
        System.out.println("Metagenomic Analysis in Real TIme (MARTi) Engine " + VERSION_STRING);
        System.out.println("Comments/bugs to: richard.leggett@earlham.ac.uk");
        System.out.println("");
        
        if (SHOW_NOTES) {
            System.out.println("To do:");
            System.out.println("- LSF: actually run MEGAN, but check if BLASTs have completed first");
            System.out.println("- LSF: check jobs (e.g. BLAST) completes ok");            
            System.out.println("- Check that it works with barcode directory appearing after initial scan.");
            System.out.println("- Let chunks be any size - smaller or larger than the reads per FASTQ output by MinKNOW.");
            System.out.println("- Separate converting FASTQ from BLASTing. Rename file extension to FASTA only on completion of file, so not accessed early.");
            System.out.println("- Option to start analysis from a given file offset");
            System.out.println("- SimpleJobScheduler needs making more robust - MAX_QUICK_JOB_ID.");
            System.out.println("- SimpleJobScheduler needs to check return code of processes.");
            System.out.println("- Is everything thread safe?");
            System.out.println("- Allow to restart without regenerating all files - pick up where left off");
            System.out.println("- JSON version metadata is hardcoded");
            System.out.println("- Method of getting pathogen sequence and hits potentially slow for lots of hits");
            System.out.println("");        
        }

        MARTiEngineOptions options = new MARTiEngineOptions();
               
        Locale.setDefault(new Locale("en", "US"));
        
        // Parse command line
        options.parseArgs(args);
        
        if (options.inTestMode()) {
            //testUnzip();
            // SLURM development
            SlurmScheduler ss = new SlurmScheduler(options);
            System.out.println("Test mode");
            String commands[] = {"sleep", "10"};
            int jobid = ss.submitJob("test", commands, "testlog.txt", true);
            //ssj.run();
            while(true) {
                ss.manageQueue();
                if (ss.checkJobCompleted(jobid)) {
                    System.out.println("Job "+jobid+" COMPLETED");
                    break;
                } else {
                    System.out.println("Job "+jobid+" not complete");
                }
                Thread.sleep(1000);
            };
                    
            System.out.println("Done");
        } else if (options.isInitMode()) {
            System.out.println("Init mode");
            MARTiJSONFile jf = new MARTiJSONFile();
            String initFilename = options.getInitDir() + File.separator + "init.json";
            jf.openFile(initFilename);
            jf.outputVersions(true);
            jf.closeFile();
            System.out.println("Written " + initFilename);
        } else if (!options.isWriteConfigMode()) {        
            File logsDir = new File(options.getLogsDir());
            if (!logsDir.exists()) {
                logsDir.mkdir();
            }

            options.getReadClassifier().initialise();

            // DEBUG - Test WalkoutRead
            WalkOutRead wor = new WalkOutRead("test", options, options.getReadClassifier().getTaxonomy());
            
            process(options);

            //memoryReport();

            options.getLog().close();

            options.getThreadExecutor().shutdown();

            if (options.getReturnValue() != 0) {
                System.out.println("Exiting with error code");
                System.exit(options.getReturnValue());
            }
        }
    }
}
