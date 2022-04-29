/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.util.Hashtable;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * Process CARD descriptions
 * 
 * @author Richard M. Leggett
 */
public class CARDOntology {
    private MARTiEngineOptions options = null;
    private Hashtable<String, String> aroNames = new Hashtable<String, String>();
    private Hashtable<String, String> aroDescriptions = new Hashtable<String, String>();
    
    public CARDOntology(MARTiEngineOptions o, String dbPath) {
        options = o;
        readDescriptions(dbPath);
    }
    
    private void parseTabSeparatedAROFile(String pathname) {
        try {
            BufferedReader br = new BufferedReader(new FileReader(pathname));
            String line = br.readLine();
            String[] fields = line.split("\t");

            options.getLog().println("Parsing TSV file");

            if (fields[0].equals("Accession")) {
                while ((line = br.readLine()) != null) {
                    fields = line.split(",|\t");

                    if (fields.length >= 3) {
                        String accession = fields[0];
                        String name = fields[1];
                        String description = fields[2].replaceAll("^\"|\"$", "");
                        
                        if (aroDescriptions.containsKey(accession)) {
                            options.getLog().println("Warning: already seen CARD accession "+accession);
                        } else {
                            aroDescriptions.put(accession, description);
                        }

                        if (aroNames.containsKey(accession)) {
                            options.getLog().println("Warning: already seen CARD accession "+accession);
                        } else {
                            aroNames.put(accession, name);
                        }
                    }
                }
            } else {
                options.getLog().println("Error: badly formatted ARO file - don't understand header line");
            }

            br.close();

        } catch (Exception e) {
            e.printStackTrace();                
        }        
    }
    
    private void parseCommaSeparatedAROFile(String pathname) {
        // Some early CARD CSV files are acatually TSV.
        try {
            BufferedReader br = new BufferedReader(new FileReader(pathname));
            String line = br.readLine();
            String[] fields = line.split("\t");
            
            options.getLog().println("Parsing CSV file");
            
            if (fields.length == 3) {
                options.getLog().println("CSV file "+pathname+" seems to have tab separators!");
                br.close();
                parseTabSeparatedAROFile(pathname);
            }
            
            fields = line.split(",");

            if (fields[0].equals("Accession")) {
                while ((line = br.readLine()) != null) {
                    // Regex from https://stackoverflow.com/questions/1757065/java-splitting-a-comma-separated-string-but-ignoring-commas-in-quotes
                    fields = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                    if (fields.length >= 3) {
                        String accession = fields[0];
                        String name = fields[1];
                        String description = fields[2].replaceAll("^\"|\"$", "");
                        
                        if (name.startsWith("\"")) {
                            name = name.substring(1);
                        }
                        
                        if (name.endsWith("\"")) {
                            name = name.substring(0, name.length()-1);
                        }
                        
                        if (aroDescriptions.containsKey(accession)) {
                            options.getLog().println("Warning: already seen CARD accession "+accession);
                        } else {
                            aroDescriptions.put(accession, description);
                        }

                        if (aroNames.containsKey(accession)) {
                            options.getLog().println("Warning: already seen CARD accession "+accession);
                        } else {
                            aroNames.put(accession, name);
                        }
                    }
                }
            } else {
                options.getLog().println("Error: badly formatted ARO file - don't understand header line");
            }

            br.close();

        } catch (Exception e) {
            e.printStackTrace();                
        }        
    }
    
    private void readDescriptions(String dbPath) {
        System.out.println("Reading descriptions...");
        // Current ontology has aro.tsv
        // Earlier versions had aro.csv and this sometimes used commas to separate, sometimes tabs.
        String tsvPathname = dbPath + File.separator + "aro.tsv";
        File aroFile = new File(tsvPathname);
        boolean gotFile = false;

        if (aroFile.exists()) {
            parseTabSeparatedAROFile(tsvPathname);
        } else {
            options.getLog().printlnLogAndScreen("Can't find "+tsvPathname);
            String csvPathname = dbPath + File.separator + "aro.csv";
            aroFile = new File(csvPathname);
            if (aroFile.exists()) {
                parseCommaSeparatedAROFile(csvPathname);
            } else {
                options.getLog().printlnLogAndScreen("Can't find "+csvPathname);
                options.getLog().printlnLogAndScreen("Warning: There will not be CARD descriptions");
            }
        }        
    }
    
    public String getDescription(String aro) {
        String description = "";
        
        if (aroDescriptions.containsKey(aro)) {
            description = aroDescriptions.get(aro);
        } else {
            description = "No description for "+aro;
        }
        
        return description;
    }
    
    public String getCardName(String aro) {
        String name = "";
        
        if (aroNames.containsKey(aro)) {
            name = aroNames.get(aro);
        } else {
            name = aro;
            System.out.println("Warning: can't find name for "+aro);
        }
        
        return name;
    }
    
}
