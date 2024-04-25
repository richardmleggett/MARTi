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
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.Hashtable;
import uk.ac.earlham.marti.blast.BlastProcess;
import uk.ac.earlham.marti.centrifuge.CentrifugeProcess;
import uk.ac.earlham.marti.kraken2.Kraken2Process;

/**
 *
 * @author leggettr
 */
public class MARTiEngineOptionsFile {
    private MARTiEngineOptions options;
    private Hashtable<String, BlastProcess> blastProcessesByName = new Hashtable<String, BlastProcess>();
    private Hashtable<String, CentrifugeProcess> centrifugeProcessesByName = new Hashtable<String, CentrifugeProcess>();
    private Hashtable<String, Kraken2Process> kraken2ProcessesByName = new Hashtable<String, Kraken2Process>();
    private String taxonomyDir = null;
    
    public MARTiEngineOptionsFile(MARTiEngineOptions o) {
        options = o;
    }
    
    private void readFile(String filename) {
        BufferedReader br;
        boolean readNextLine = true;

        System.out.println("Reading global options file "+filename);

        try {
            br = new BufferedReader(new FileReader(filename));        
            String line = null;

            do {
                if (readNextLine) {
                    line = br.readLine();
                } 
                
                readNextLine = true;
                
                if (line != null) {
                    if (line.length() > 1) {
                        if (!line.startsWith("#")) {
                            String[] tokens = line.split(":");
                            if (tokens[0].compareToIgnoreCase("BlastProcess") == 0) {
                                BlastProcess bp = new BlastProcess(options);
                                line = bp.readConfigFile(br);
                                blastProcessesByName.put(bp.getBlastName(), bp);
                                System.out.println("Added process " + bp.getBlastName());
                                readNextLine = false;                                
                            } else if (tokens[0].compareToIgnoreCase("CentrifugeProcess") == 0) {
                                System.out.println("Adding centrifuge process... ");
                                CentrifugeProcess cp = new CentrifugeProcess(options);
                                line = cp.readConfigFile(br);
                                // This needs refactoring so that blast processes, centrifuge processes,
                                // and kraken2 processes all inherit from process.
                                centrifugeProcessesByName.put(cp.getName(), cp);
                                System.out.println("Added process " + cp.getName());
                                readNextLine = false;          
                            } else if (tokens[0].compareToIgnoreCase("Kraken2Process") == 0) {
                                Kraken2Process k2p = new Kraken2Process(options);
                                line = k2p.readConfigFile(br);
                                kraken2ProcessesByName.put(k2p.getName(), k2p);
                                readNextLine = false;
                            } else if (tokens[0].compareToIgnoreCase("TaxonomyDir")==0) { 
                                taxonomyDir = tokens[1];
                                if (options.getTaxonomyDirectory() == null) {
                                    options.setTaxonomyDir(taxonomyDir);
                                }
                            } else if ((tokens[0].compareToIgnoreCase("MinKNOWRunDirectory")==0) ||
                                       (tokens[0].compareToIgnoreCase("MARTiSampleDirectory")==0) ||
                                       (tokens[0].compareToIgnoreCase("Port")==0) ||
                                       (tokens[0].compareToIgnoreCase("https")==0) ||
                                       (tokens[0].compareToIgnoreCase("Key")==0) ||
                                       (tokens[0].compareToIgnoreCase("Certificate")==0))
                            {
                                //System.out.println("Ignoring GUI option "+tokens[0]);
                            } else if (!tokens[0].startsWith("#")) {                                
                                System.out.println("WARNING: Unknown token in marti_engine_options "+tokens[0]);
                                System.out.println("       Token is being ignored");
                            }                                                     
                        }
                    }
                }
            } while (line != null);
            br.close();
        } catch (Exception e) {
            System.out.println("readProcessFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    public BlastProcess getBlastProcess(String name) {
        BlastProcess bp = null;
        
        if (blastProcessesByName.containsKey(name)) {
            bp = blastProcessesByName.get(name);
        }
        
        return bp;
    }
    
    public CentrifugeProcess getCentrifugeProcess(String name) {
        CentrifugeProcess cp = null;
        if(centrifugeProcessesByName.containsKey(name)) {
            cp = centrifugeProcessesByName.get(name);
        }
        return cp;
    }
    
    public Kraken2Process getKraken2Process(String name) {
        Kraken2Process k2p = null;
        if(kraken2ProcessesByName.containsKey(name)) {
            k2p = kraken2ProcessesByName.get(name);
        }
        return k2p;
    }
    
    public String getTaxonomyDir() {
        return taxonomyDir;
    }
     
    public void readOptionsFile() {
        File f;
        
        if (options.getOptionsFilename() != null) {
            f = new File(options.getOptionsFilename());
        } else {        
            f = new File("marti_engine_options.txt");
            if (!f.exists()) {
                f = new File("~/marti_engine_options.txt");
            }
        
            if (!f.exists()) {
                try {
                    String jarFilePath = MARTiEngineOptionsFile.class.getProtectionDomain().getCodeSource().getLocation().getPath();
                    String decodedPath = URLDecoder.decode(jarFilePath, "UTF-8");
                    File jarFile = new File(decodedPath);
                    f = new File(jarFile.getParent() + "/marti_engine_options.txt");
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }            
        }
        
        if (f.exists()) {
            readFile(f.getAbsolutePath());
        }
    }
    
    public void writeOptionsFile(String filename) {
        if (filename == null) {
            filename = new String("marti_engine_options.txt");           
        }
        
        System.out.println("Writing "+filename);
        
        try {
            PrintWriter pw = new PrintWriter(new FileWriter(filename));            

            pw.println("# Default taxonomy directory can be defined here");
            pw.println("TaxonomyDir:/path/to/ncbi/taxdmp");
            pw.println("");
            pw.println("# Specify path to directory containing MinKNOW run directories. Multiple paths can be specified delimited by a semicolon \"/path/to/minknow/data;/path/to/minknow/data2\"");
            pw.println("MinKNOWRunDirectory:/path/to/minknow/data");
            pw.println("");
            pw.println("# Directory containing MARTi output directories. Multiple paths can be specified delimited by a semicolon");
            pw.println("MARTiSampleDirectory:/path/to/marti/output");
            pw.println("");
            pw.println("Port:3000");
            pw.println("https:false");
            pw.println("");
            pw.println("# Analysis processes defined here will appear as options in MARTi GUI and can be included in config files generated with the marti -writeconfig command");
            pw.println("BlastProcess");
            pw.println("    Name:blast_example");
            pw.println("    Program:megablast");
            pw.println("    Database:/path/to/blast_database/prefix");
            pw.println("    MaxE:0.001");
            pw.println("    MaxTargetSeqs:25");
            pw.println("    BlastThreads:1");
            pw.println("    UseToClassify");
            pw.println("");
            pw.println("CentrifugeProcess");
            pw.println("    Name:centrifuge_example");
            pw.println("    Database:/path/to/centrifuge_database/prefix");
            pw.println("    CentrifugeThreads:1");
            pw.println("    UseToClassify");
            pw.println("");
            pw.println("Kraken2Process");
            pw.println("    Name:kraken2_example");
            pw.println("    Database:/path/to/kraken2_database/prefix");
            pw.println("    Kraken2Threads:1");
            pw.println("    UseToClassify");
            
            pw.close();
        } catch (Exception e) {
            System.out.println("writeOptionsFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }   
    }
}
