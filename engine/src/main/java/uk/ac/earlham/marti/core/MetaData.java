/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.Writer;
import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import javax.json.Json;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.JsonWriterFactory;
import javax.json.stream.JsonGenerator;

/**
 *
 * @author martins
 */
public class MetaData {
    static private List<Integer> allBarcodes = new ArrayList<Integer>();
    private MARTiEngineOptions options;
    private List<Integer> barcodes = new ArrayList<Integer>();
    private String location = "";
    private float temperature = Float.NaN;
    private float humidity = Float.NaN;
    private String sampleDate = "";
    private String sampleTime = "";
    
    private List<String> keywords = new ArrayList<String>();
    
    public MetaData(MARTiEngineOptions o) {
        options = o;
    }
    
    public String readConfigFile(BufferedReader br) {
        String line = "";
        boolean keepReading = true;
        try {
            do {
                line = br.readLine();
                if (line != null) {
                    line = line.trim();
                    if (line.length() > 1) {
                        if (!line.startsWith("#")) {
                            String[] tokens = line.split(":");
                            if (tokens[0].compareToIgnoreCase("Location") == 0) {
                                location = tokens[1];
                            } else if (tokens[0].compareToIgnoreCase("Date") == 0) {
                                sampleDate = line.substring(line.indexOf(":") + 1);
                            } else if (tokens[0].compareToIgnoreCase("Time") == 0) {
                                sampleTime = line.substring(line.indexOf(":") + 1);
                            } else if (tokens[0].compareToIgnoreCase("Temperature") == 0) {
                                temperature = Float.parseFloat(tokens[1]);
                            } else if (tokens[0].compareToIgnoreCase("Humidity") == 0) {
                                humidity = Float.parseFloat(tokens[1]);
                            } else if (tokens[0].compareToIgnoreCase("Keywords") == 0) {
                                keywords = Arrays.asList(tokens[1].split(","));
                            } else if (tokens[0].compareToIgnoreCase("Barcodes") == 0) {
                                String[] barcodesString = tokens[1].split(",");
                                for(String bc : barcodesString) {
                                    int iBc = Integer.parseInt(bc);
                                    if(allBarcodes.contains(iBc)) {
                                        options.getLog().printlnLogAndScreen("WARNING: Barcode " + bc + " is specified in multiple Metadata blocks in config file.");
                                        options.getLog().printlnLogAndScreen("Metadata for this barcode may not be correct.");
                                    } else {
                                        allBarcodes.add(iBc);
                                        barcodes.add(iBc);
                                    }
                                    
                                }
                            } else {
                                keepReading = false;
                            }
                        }
                    }
                }              
            } while ((line != null) && (keepReading));
        } catch (Exception e) {
            System.out.println("readConfigFile Exception:");
            e.printStackTrace();
            System.exit(1);
        }
        
        if(barcodes.isEmpty() && options.isBarcoded()) {
            if(!allBarcodes.isEmpty()) {
                options.getLog().printlnLogAndScreen("WARNING: Multiple Metadata blocks in config file with duplicate barcodes.");
                options.getLog().printlnLogAndScreen("Metadata files may not be correct.");                
            } else {
                String[] barcodesString = options.getBarcodesList().getCommaSeparatedList().split(",");
                for(String bc : barcodesString) {
                    barcodes.add(Integer.parseInt(bc));
                    allBarcodes.add(Integer.parseInt(bc));
                }
            }
        } else if(barcodes.isEmpty()) {
            if(allBarcodes.contains(0)) {
                options.getLog().printlnLogAndScreen("WARNING: Multiple Metadata blocks in config file with no barcodes specified.");
                options.getLog().printlnLogAndScreen("Metadata file may not be correct.");
            } else {
                allBarcodes.add(0);
                barcodes.add(0);
            }

        }
        return line;
    }
    
    public List<Integer> getBarcodes() {
        return barcodes;
    }
    
    public void writeMetaDataFile() {
        try {
            for(int bc : barcodes) {
                
                // check file doesn't exist
                String jsonFilename = options.getMARTiJSONDirectory(bc) + File.separator + "metadata.json";
                //File f = new File(jsonFilename);
                //if(f.exists()) { 
                //    options.getLog().printlnLogAndScreen("WARNING: Metadata file " + jsonFilename + " already exists.");
                //    options.getLog().printlnLogAndScreen("A new file will not be written.");
                //    continue;
                //}
                
                // Build meta data
                JsonObjectBuilder metaBuilder = Json.createObjectBuilder();

                metaBuilder.add("barcode", Integer.toString(bc));          
                metaBuilder.add("id", options.getSampleIdByBarcode(bc));
                metaBuilder.add("uuid", options.getSampleUUIDByBarcode(bc));
                metaBuilder.add("runId", options.getSampleName());
                
                if(location.length() > 0) {
                    metaBuilder.add("sampleLocation", location);
                }
                if(sampleDate.length() > 0) {
                    metaBuilder.add("sampleDate", sampleDate);
                }
                if(sampleTime.length() > 0) {
                    metaBuilder.add("sampleTime", sampleTime);
                }
                if(!Float.isNaN(temperature)) {
                    metaBuilder.add("temperature", temperature);
                }
                if(!Float.isNaN(humidity)) {
                    metaBuilder.add("humidity", humidity);
                }

                String keywordsString = "";
                for(String keyword : keywords) {
                    keywordsString += keyword + ", ";
                }
                if(keywordsString.length() > 0) {
                    metaBuilder.add("keywords", keywordsString.substring(0, keywordsString.length() - 2));
                }

                // Print it with pretty printing (pacing etc.)
                Map<String, Boolean> config = new HashMap<>();
                config.put(JsonGenerator.PRETTY_PRINTING, true);
                JsonWriterFactory writerFactory = Json.createWriterFactory(config);     
                
                JsonObject jsonObject = metaBuilder.build(); 
                Writer writer = new StringWriter();  
                writerFactory.createWriter(writer).write(jsonObject);
                String jsonString = writer.toString();
                PrintWriter pw = new PrintWriter(new FileWriter(jsonFilename));
                pw.write(jsonString);
                pw.close();
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}
