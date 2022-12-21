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
    private Hashtable<String, CARDAccession> cardAccessions = new Hashtable<String, CARDAccession>();
    private boolean noEntryWarningFlag = false;
    
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
                        CARDAccession cardARO = null;
                        
                        if (cardAccessions.containsKey(accession)) {
                            options.getLog().println("Warning: already seen CARD accession "+accession);
                            cardARO = cardAccessions.get(accession);
                        } else {
                            cardARO = new CARDAccession();
                            cardAccessions.put(accession, cardARO);
                        }
                        cardARO.setDescription(description);
                        cardARO.setName(name);
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
                        
                        CARDAccession cardARO = null;
                        
                        if (cardAccessions.containsKey(accession)) {
                            options.getLog().println("Warning: already seen CARD accession "+accession);
                            cardARO = cardAccessions.get(accession);
                        } else {
                            cardARO = new CARDAccession();
                            cardAccessions.put(accession, cardARO);
                        }
                        cardARO.setDescription(description);
                        cardARO.setName(name);                        
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
    
    private void readAROIndex(String dbPath) {
        String pathname = dbPath + File.separator + "aro_index.tsv";
        File f = new File (pathname);
        
        if (f.exists()) {        
            System.out.println("Reading aro_index.tsv...");
            try {
                BufferedReader br = new BufferedReader(new FileReader(pathname));
                String line = br.readLine();
                String[] fields = line.split("\t");

                if (fields[0].equals("ARO Accession")) {
                    while ((line = br.readLine()) != null) {
                        fields = line.split(",|\t");
                        
                        if (fields.length >= 11) {                            
                            String accession = fields[0];
                            String aroName = fields[5];
                            String proteinAccession = fields[6];
                            String dnaAccession = fields[7];
                            String geneFamily = fields[8];
                            String drugClass = fields[9];
                            String resistanceMechanism = fields[10];
                            String shortName = aroName; 
                            CARDAccession cardARO = null;

                            if (fields.length >= 12) {
                                shortName = fields[11];
                                
                                if (fields.length > 12) {
                                   System.out.println("Warning: More than 11 fields in aro_index.tsv. Will try to continue anyway...");
                                }
                            }
                            
                            if (cardAccessions.containsKey(accession)) {
                                cardARO = cardAccessions.get(accession);
                            } else {
                                options.getLog().println("Warning: Not seen CARD accession previously "+accession);
                                cardARO = new CARDAccession();
                                cardAccessions.put(accession, cardARO);
                            }
                            
                            cardARO.setGeneFamily(geneFamily);
                            cardARO.setDrugClass(drugClass);
                            cardARO.setResistanceMechanism(resistanceMechanism);                            
                            cardARO.setShortName(shortName);
                        } else {
                            System.out.println("Number of fields "+ fields.length);
                        }
                    }
                } else {
                    System.out.println("Error: Unexpected file format in "+pathname);
                    System.out.println("CARD details will be missing from output.");
                }

                br.close();
            } catch (Exception e) {
                e.printStackTrace();                
            }        
        } else {
            System.out.println("Error: can't find file "+pathname);
            System.out.println("CARD details will be missing from output.");
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
            readAROIndex(dbPath);
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

        if (cardAccessions.containsKey(aro)) {
            description = cardAccessions.get(aro).getDescription();
        } else {
            if (noEntryWarningFlag == false) {
                System.out.println("Warning: No entry for "+aro + " and possibly others");
                noEntryWarningFlag = true;
            }
            description = "No entry for "+aro;
        }
        
        return description;
    }
    
    public String getCardName(String aro) {
        String name = "";
        
        if (cardAccessions.containsKey(aro)) {
            name = cardAccessions.get(aro).getName();
        } else {
            name = aro;
            if (noEntryWarningFlag == false) {
                System.out.println("Warning: No entry for "+aro+ " and possibly others");
                noEntryWarningFlag = true;
            }
        }
        
        return name;
    }
    
    public String getGeneFamily(String aro) {
        String geneFamily = "Unknown";
        
        if (cardAccessions.containsKey(aro)) {
            geneFamily = cardAccessions.get(aro).getGeneFamily();
        } else {
            if (noEntryWarningFlag == false) {
                System.out.println("Warning: No entry for "+aro+" and possibly others");
                noEntryWarningFlag = true;
            }               
        }
        
        return geneFamily;
    }

    public String getDrugClass(String aro) {
        String drugClass = "Unknown";
        
        if (cardAccessions.containsKey(aro)) {
            drugClass = cardAccessions.get(aro).getDrugClass();
        } else {
            if (noEntryWarningFlag == false) {
                System.out.println("Warning: No entry for "+aro+ "and possibly others");
                noEntryWarningFlag = true;
            }                               
        }
        
        return drugClass;
    }

    public String getResistanceMechanism(String aro) {
        String mechanism = "Unknown";
        
        if (cardAccessions.containsKey(aro)) {
            mechanism = cardAccessions.get(aro).getResistanceMechanism();
        } else {
            if (noEntryWarningFlag == false) {
                System.out.println("Warning: No entry for "+aro+ " and possibly others");
                noEntryWarningFlag = true;
            }                               
        }
        
        return mechanism;
    }

    public String getShortName(String aro) {
        String shortName = "Unknown";
        
        if (cardAccessions.containsKey(aro)) {
            shortName = cardAccessions.get(aro).getShortName();
        } else {
            shortName = aro;
            if (noEntryWarningFlag == false) {
                System.out.println("Warning: No entry for "+aro+ " and possibly others");
                noEntryWarningFlag = true;
            }   
        }
        
        return shortName;
    }
}
