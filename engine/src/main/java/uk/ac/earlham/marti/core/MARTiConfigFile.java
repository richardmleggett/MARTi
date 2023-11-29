/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.PrintWriter;
import uk.ac.earlham.marti.blast.BlastProcess;

/**
 *
 * @author leggettr
 */
public class MARTiConfigFile {
    public MARTiEngineOptions options;
    
    public MARTiConfigFile(MARTiEngineOptions o) {
        options = o;
    }   
    
    public void writeConfigFile(String filename) {
        MARTiEngineOptionsFile optionsFile = options.getOptionsFile();
        try {
            PrintWriter pw = new PrintWriter(new FileWriter(filename));            
            pw.println("# MARTi config file");
            pw.println("");
            pw.println("# Lines beginning with # are comment lines.");
            pw.println("");
            pw.println("# The RunName specifies the run name");
            pw.println("# The RawDataDir points to the directory containing the fastq_pass directory created by MinKNOW.");
            pw.println("# The SampleDir points to the directory where MARTi will write intermediate and final results.");
            pw.println("");
            pw.print("RunName:");
            if (options.getSampleName() == null) {
                pw.println("RunNameHere");
            } else {
                pw.println(options.getSampleName());
            }
            pw.print("RawDataDir:");
            if (options.getRawDataDir() == null) {
                pw.println("/path/to/dir/containing/fastq_pass/dir");
            } else {
                pw.println(options.getRawDataDir().getPathname());
            }
            pw.print("SampleDir:");
            if (options.getSampleDirectory() == null) {
                pw.println("/path/to/sample/dir");
            } else {
                pw.println(options.getSampleDirectory());
            }

            if (options.isBarcoded()) {
                pw.println("");
                pw.println("# ProcessBarcodes tells MARTi which barcodes to process. Can be left out for non-barcode runs.");
                pw.println("# BarcodeIdX specifies the sample name of barcode X.");
                BarcodesList bl = options.getBarcodesList();                               
               pw.println("");
                pw.println("ProcessBarcodes:" + bl.getCommaSeparatedList());
                
                for (int i=0; i<=BarcodesList.MAX_BARCODES; i++) {
                    if (bl.isBarcodeActive(i)) {
                        pw.println("BarcodeId"+i+":"+options.getSampleIdByBarcode(i));
                    }
                }                
            }
            
            pw.println("");
            pw.println("# Scheduler tells MARTi how to schedule parallel jobs. Options:");
            pw.println("#     - local - MARTi will handle running jobs.");
            pw.println("#     - slurm - jobs are submitted via SLURM (in development).");
            pw.println("# MaxJobs specifies the maximum number of parallel jobs (e.g. BLAST) the software will initiate.");
            pw.println("");
            pw.println("Scheduler:local");
            pw.println("MaxJobs:" + options.getMaxJobs());

            pw.println("");
            pw.println("# InactivityTimeout gives provides a time (in seconds) after which MARTi will stop waiting for new reads.");
            pw.println("#     It will continue processing all existing reads and exit upon completion.");        
            pw.println("# StopProcessingAfter tells MARTi to stop processing after X reads have been processed. For indefinite, use 0.");
            pw.println("");
            pw.println("InactivityTimeout:" + options.getFileWatcherTimeout());
            pw.println("StopProcessingAfter:" + options.getStopProcessingAfter());

            pw.println("");
            pw.println("# TaxonomyDir specifies the location of the NCBI taxonomy directory. This is a directory containing nodes.dmp and names.dmp files.");
            pw.println("");
            pw.print("TaxonomyDir:");
            
            if (options.getTaxonomyDirectory() == null) {
                pw.println("/path/to/taxonomy/dir");
            } else {
                pw.println(options.getTaxonomyDirectory());
            }

            pw.println("");
            pw.println("# A pre filter ignores reads below quality and length thresholds.");
            pw.println("# ReadFilterMinQ specifies the minimum mean read quality to accept a read for analysis.");
            pw.println("# ReadFilterMinLength specifies the minimum read length to accept a read for analysis.");
            pw.println("");
            pw.println("ReadFilterMinQ:" + options.getReadFilterMinQ());
            pw.println("ReadFilterMinLength:" + options.getReadFilterMinLength());

            pw.println("");
            pw.println("# ConvertFastQ is needed if using a tool that requires FASTA files (e.g. BLAST).");
            pw.println("# ReadsPerBlast sets how many reads are contained within each BLAST chunk. ");            
            pw.println("");
            pw.println("ConvertFastQ");
            pw.println("ReadsPerBlast:" + options.getReadsPerBlast());
                        
            pw.println("");
            pw.println("# A config file can contain a number of BLAST processes.");
            pw.println("# Each BLAST process begins with the BlastProcess keywod.");
            pw.println("# Name specifies a name for this process.");
            pw.println("# Program specifies the BLAST program to use (e.g. megablast).");
            pw.println("# Database specifies the path to the BLAST database, as would be passed to the BLAST program.");
            pw.println("# MaxE specifies a maximum E value for hits.");
            pw.println("# MaxTargetSeqs specifies a value for BLAST's -max_target_seqs option.");
            pw.println("# BlastThreads specifies how many threads to use for each Blast process.");
            pw.println("# UseToClassify marks this BLAST process as the process to use for taxonomy assignment (e.g. nt)");
            
            String blastProcessList = options.getBlastProcessNames();
            
            if (blastProcessList == null) {
                blastProcessList = "nt";
            }
            
            String[] processes = blastProcessList.split(",");
            for (int i=0; i<processes.length; i++) {
                pw.println("");
                BlastProcess bp = optionsFile.getBlastProcess(processes[i]);
                if (bp == null) {
                    pw.println("BlastProcess");
                    pw.println("    Name:" + processes[i]);

                    if (processes[i].equalsIgnoreCase("card")) {
                        pw.println("    Program:blastn");
                        pw.println("    Database:/path/to/card");
                        pw.println("    MaxE:0.001");
                        pw.println("    MaxTargetSeqs:100");
                        pw.println("    BlastThreads:2");                            
                    } else {
                        pw.println("    Program:megablast");
                        pw.println("    Database:/path/to/nt");
                        pw.println("    MaxE:0.001");
                        pw.println("    MaxTargetSeqs:25");
                        pw.println("    BlastThreads:2");
                        if (processes[i].equalsIgnoreCase("nt")) {
                            pw.println("    UseToClassify");
                        }
                    }                        
                } else {
                    pw.println("BlastProcess");
                    pw.println("    Name:" + bp.getBlastName());
                    pw.println("    Program:" + bp.getBlastTask());
                    pw.println("    Database:" + bp.getBlastDatabase());
                    pw.println("    MaxE:" + bp.getMaxE());
                    pw.println("    MaxTargetSeqs:" + bp.getMaxTargetSeqs());
                    pw.println("    BlastThreads:" + bp.getNumThreads());
                    if (bp.useForClassifying()) {
                        pw.println("    UseToClassify");
                    }
                }
            }
                        
            pw.println("");
            pw.println("# A Lowest Common Ancestor algorithm is used to assign BLAST hits to taxa. Default parameters are:");
            pw.println("# LCAMaxHits specifies the maximum number of BLAST hits to inspect in (100).");
            pw.println("# LCAScorePercent specifies the percentage of maximum bit score that a hit must achieve to be considered (90).");
            pw.println("# LCAMinIdentity specifies the minimum % identity of a hit to be considered for LCA (60)");
            pw.println("# LCAMinQueryCoverage specifies the minium % query coverage for a hit to be considered (0)");
            pw.println("# LCAMinCombinedScore specifies the minimum combined identity + query coverage for a hit to be considered (0)");
            pw.println("# LCAMinLength specifies the minimum length of hit to consider");
            pw.println("");
            pw.println("LCAMaxHits:" + options.getLCAMaxHits());
            pw.println("LCAScorePercent:" + options.getLCAScorePercent());
            pw.println("LCAMinIdentity:" + options.getLCAMinIdentity());
            pw.println("LCAMinQueryCoverage:" + options.getLCAMinQueryCoverage());
            pw.println("LCAMinCombinedScore:" + options.getLCAMinCombinedScore());
            pw.println("LCAMinLength:" + options.getLCAMinLength());
            
            pw.println("");
            pw.println("# Metadata blocks can be used to describe the sample being analysed.");
            pw.println("# Each field is optional and can be removed if not required.");
            pw.println("# The 'keywords' field is used for searching in the GUI.");
            if (options.isBarcoded()) {
                BarcodesList bl = options.getBarcodesList();
                String barcodes[] = bl.getCommaSeparatedList().split(",");
                String barcodeString2 = "";
                for(int i = 1; i < barcodes.length; i ++) {
                    barcodeString2 += barcodes[i] + ",";
                }
                pw.println("# Each block can be assigned to one or more barcodes.");
                pw.println("# If no barcode is specified the block is assumed to describe all barcodes.");
                pw.println("");
                pw.println("Metadata");
                pw.println("    Location:");
                pw.println("    Date:");
                pw.println("    Time:");
                pw.println("    Temperature:");
                pw.println("    Humidity:");
                pw.println("    Keywords:");
                pw.println("    Barcodes:" + barcodes[0]);
                pw.println("");
                pw.println("Metadata");
                pw.println("    Location:");
                pw.println("    Date:");
                pw.println("    Time:");
                pw.println("    Temperature:");
                pw.println("    Humidity:");
                pw.println("    Keywords:");
                pw.println("    Barcodes:" + barcodeString2.substring(0, barcodeString2.length() - 1));
            } else {
                pw.println("");
                pw.println("Metadata");
                pw.println("    Location:");
                pw.println("    Date:");
                pw.println("    Time:");
                pw.println("    Temperature:");
                pw.println("    Humidity:");
                pw.println("    Keywords:");
            }
            
            pw.close();
            
            System.out.println("Config file writen to "+filename);
        } catch (Exception e) {
            System.out.println("writeSimulationResults Exception:");
            e.printStackTrace();
            System.exit(1);
        }        
    } 
}
