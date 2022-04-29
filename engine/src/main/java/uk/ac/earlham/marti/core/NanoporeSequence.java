/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;

/**
 * Represent a nanopore sequence and parse IDs.
 * 
 * @author Richard M. Leggett
 */
public class NanoporeSequence {
    private String filename;
    private String seqId;
    private String seq = "";
    private String runId = "";
    private int read = -1;
    private int ch = -1;
    private String startTime = "";
    private String flowCellID = "";
    private String protocolGroupID = "";
    private String sampleID = "";
    
    public NanoporeSequence(String fastaFilename, String id) {
        filename = fastaFilename;
        seqId = id;
    }

    public void cacheSequence() {
        try {
            File f = new File(filename);
            if (f.exists()) {            
                BufferedReader br = new BufferedReader(new FileReader(filename));
                String line;
                boolean gotSequence = false;
                while ((line = br.readLine()) != null) {
                    if (line.startsWith(">")) {
                        if (gotSequence) {
                            break;
                        } else {
                            String[] tokens = line.split("\\s+");
                            if (tokens[0].equals(">"+seqId)) {
                                gotSequence = true;
                                
                                for (int i=0; i<tokens.length; i++) {
                                    if (tokens[i].startsWith("runid=")) {
                                        runId = tokens[i].substring(6);
                                    } else if (tokens[i].startsWith("read=")) {
                                        read = Integer.parseInt(tokens[i].substring(5));
                                    } else if (tokens[i].startsWith("ch=")) {
                                        ch = Integer.parseInt(tokens[i].substring(3));                                    
                                    } else if (tokens[i].startsWith("start_time=")) {
                                        startTime = tokens[i].substring(11);
                                    } else if (tokens[i].startsWith("flow_cell_id=")) {
                                        flowCellID = tokens[i].substring(13);
                                    } else if (tokens[i].startsWith("protocol_group_id=")) {
                                        protocolGroupID = tokens[i].substring(18);
                                    } else if (tokens[i].startsWith("sample_id=")) {
                                        sampleID = tokens[i].substring(10);
                                    }                                   
                                }
                            }
                        }
                    } else {
                        if (gotSequence) {
                            seq = seq + line.trim();
                        }
                    }
                }
                br.close();    
            }
         } catch (Exception e) {
            System.out.println("Exception:");
            e.printStackTrace();
            System.exit(1);
        }
    }

    public String getSequence() {
        return seq;
    }
    
    public String getRunID() {
        return runId;
    }
    
    public int getRead() {
        return read;
    }
    
    public int getCh() {
        return ch;
    }
    
    public String getStartTime() {
        return startTime;        
    }
    
    public String getFlowCellId() {
        return flowCellID;
    }
    
    public String getProtocolGroupID() {
        return protocolGroupID;
    }
    
    public String getSampleID() {
        return sampleID;
    }
       
}