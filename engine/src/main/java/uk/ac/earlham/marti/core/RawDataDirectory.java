/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.File;

/**
 * Representation of a raw data directory and parsing of barcode structure.
 * 
 * @author Richard M. Leggett
 */
public class RawDataDirectory {
    private String pathname = null;    
    private MARTiEngineOptions options = null;
    
    public RawDataDirectory(MARTiEngineOptions o, String p) {
        pathname = p;
        options = o;
    }
    
    public String getPathname() {
        return pathname;
    }
    
    public String getFastqPassPath() {
        String fastqPassDir = pathname + File.separator + "fastq_pass";        
        File dir = new File (fastqPassDir);
        
        if (dir.exists()) {
            System.out.println("Got fastq_pass directory: " + fastqPassDir);
        } else {
            fastqPassDir = pathname + File.separator + "pass";
            dir = new File (fastqPassDir);
            if(dir.exists()) {
                System.out.println("Got fastq_pass directory: " + fastqPassDir);
            } else {
                fastqPassDir = pathname + File.separator + "fastq";
                dir = new File (fastqPassDir);
                if (dir.exists()) {
                    System.out.println("Not got fastq_pass, but found fastq directory: " + fastqPassDir);
                } else {
                    System.out.println("ERROR: Can't find 'fastq_pass', 'pass', or 'fastq' directory in " + pathname);
                    System.exit(1);
                }
            }
        }
        
        return fastqPassDir;
    }
    
    public String getFastaPassPath() {
        return pathname + File.separator + "fasta_pass";
    }
        
    public String getFastqPassBarcodePath(int b) {
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
        
        return this.getFastqPassPath() + "/" + bcString;
    }

    public String getFastaPassBarcodePath(int b) {
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
        
        return this.getFastaPassPath() + "/" + bcString;
    }
    
    public boolean checkForFastqPass() {
        boolean found = false;
        
        File path = new File(this.getFastqPassPath());
        if (path.exists()) {
            found = true;
        }
        
        return found;
    }
    
    public boolean checkForFastqPassBarcode(int b) {
        boolean found = false;
        
        File path = new File(this.getFastqPassBarcodePath(b));
        if (path.exists()) {
            found = true;
        }
        
        return found;
    }
    
    public boolean checkDirExists() {
        boolean exists = true;
        File f = new File(pathname);
        if (!f.exists()) {
            System.out.println("Error: Raw data directory doesn't exist - "+pathname);
            exists = false;
        }
        return exists;        
    }
}
