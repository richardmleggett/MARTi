/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.Hashtable;
import uk.ac.earlham.marti.blast.BlastProcess;
import uk.ac.earlham.marti.centrifuge.CentrifugeProcess;

/**
 *
 * @author leggettr
 */
public class MARTiEngineOptionsFile {
    private MARTiEngineOptions options;
    private Hashtable<String, BlastProcess> blastProcessesByName = new Hashtable<String, BlastProcess>();
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
                                readNextLine = false;                                
                            } else if (tokens[0].compareToIgnoreCase("CentrifugeProcess") == 0) {
                                CentrifugeProcess cp = new CentrifugeProcess(options);
                                line = cp.readConfigFile(br);
                                //blastProcessesByName.put(bp.getBlastName(), bp);
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
                                System.out.println("ERROR: Unknown token in marti_engine_options "+tokens[0]);
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
}
