/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.File;
import java.util.ArrayList;
import uk.ac.earlham.marti.blast.BlastProcess;

/**
 *
 * @author leggettr
 */
public class FileCleaner {
    public MARTiEngineOptions options = null;
    
    public FileCleaner(MARTiEngineOptions o) {
        options = o;
    }
    
    private String makeBarcodeDirName(int b) {
        String bcString = "";
        
        if (b == 0) {
            bcString = "unclassified";
        } else if (b < 10) {
            bcString = "barcode0" + b;
        } else if (b < 100) {
            bcString = "barcode" + b;
        } else {
            System.out.println("Error: barcode too high "+b);
            System.exit(1);
        }
        
        return bcString;
    }

    private void checkAndRemove(String dir, String extension) {
        File fDir = new File(dir);

        options.getLog().println("Checking for files to remove in "+dir);
        
        if (fDir.exists()) {
            File[] files = fDir.listFiles();

            for (int i=0; i<files.length; i++) {
                String filename = files[i].getName().toLowerCase();
                if (extension.equals("") || filename.endsWith(extension)) {
                    options.getLog().println("Deleting "+files[i].getPath());
                    if (!files[i].delete()) {
                        options.getLog().println("ERROR: Couldn't delete "+files[i].getPath());
                    }
                }
            }
        } else {
            options.getLog().println("Directory doesn't exist: "+dir);
        }
    }
    
    private void checkAndRemoveWithBarcodes(String dir, String extension) {
        if (options.isBarcoded()) {
            for (int b=1; b<=MARTiEngineOptions.MAX_BARCODES; b++) {
                if (options.getBarcodesList().isBarcodeActive(b)) {
                    checkAndRemove(dir + File.separator + makeBarcodeDirName(b), extension);
                }
            }
        } else {
            checkAndRemove(dir, extension);
        }
    }
    
    public void removeIntermediateFiles() {
        options.getLog().printlnLogAndScreen("Removing intermediate files...");
        if (options.autodeleteFastaChunks()) {
            options.getLog().printlnLogAndScreen("Removing fasta_chunks files...");
            checkAndRemoveWithBarcodes(options.getFastaDir() + "_chunks", ".fasta");
        }

        if (options.autodeleteFastqChunks()) {
            options.getLog().printlnLogAndScreen("Removing fastq_chunks files...");
            checkAndRemoveWithBarcodes(options.getFastqDir() + "_chunks", ".fastq");
        }

        if (options.autodeleteBlastFiles()) {
            options.getLog().printlnLogAndScreen("Removing BLAST files...");
            ArrayList<BlastProcess> blastProcesses = options.getBlastProcesses();
            for (int i=0; i<blastProcesses.size(); i++) {
                BlastProcess bp = blastProcesses.get(i);
                String dirName = bp.getBlastTask() + "_" + bp.getBlastName();
                checkAndRemoveWithBarcodes(options.getSampleDirectory() + File.separator + dirName, ".txt");
            }
        }
        
        if (options.autodeleteMetaMapsFiles()) {
            options.getLog().printlnLogAndScreen("Removing MetaMaps files...");
            checkAndRemove(options.getSampleDirectory() + File.separator + "metamaps", "");
        }  
        options.getLog().printlnLogAndScreen("Intermediate files removed.");
    }
}
