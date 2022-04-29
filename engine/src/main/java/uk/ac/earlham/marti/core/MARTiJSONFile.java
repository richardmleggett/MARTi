/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.FileWriter;
import java.io.PrintWriter;

/**
 * Class for writing JSON files.
 * 
 * @author Richard M. Leggett
 */
public class MARTiJSONFile {
    private int jsonIndent = 0;
    private PrintWriter pw = null;

    public MARTiJSONFile() {
    }    
    
    public void openFile(String filename) {
        try {
            pw = new PrintWriter(new FileWriter(filename));
        } catch (Exception e) {
            System.out.println("Exception:");
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    public void closeFile() {
        pw.close();
    }
    
    public void indentJSON() {
        for (int i=0; i<jsonIndent; i++) {
            pw.write("\t");
        }
    }
    
    public void beginJSONSection() {
        indentJSON();
        pw.println("{");
        jsonIndent++;
    }

    public void endJSONSection(boolean comma) {
        jsonIndent--;
        indentJSON();
        if (comma) {
            pw.println("},");
        } else {
            pw.println("}");
        }
    }
    
    public void beginJSONArray() {
        indentJSON();
        pw.println("[");
        jsonIndent++;
    }
    
    public void endJSONArray(boolean comma) {
        jsonIndent--;
        indentJSON();
        if (comma) {
            pw.println("],");
        } else {
            pw.println("]");
        }
    }
    
    public void writeJSONTag(String tag) {
        indentJSON();
        pw.println("\"" + tag + "\":");
    }

    public void writeJSONTagString(String tag, String value, boolean comma) {
        indentJSON();
        pw.print("\"" + tag + "\" : " + "\"" + value + "\"");
        if (comma) {
            pw.println(",");
        } else {
            pw.println("");
        }
    }

    public void writeJSONTagLong(String tag, long value, boolean comma) {
        indentJSON();
        pw.print("\"" + tag + "\" : " + value);
        if (comma) {
            pw.println(",");
        } else {
            pw.println("");
        }
    }   

    public void writeJSONTagBoolean(String tag, boolean value, boolean comma) {
        indentJSON();
        pw.print("\"" + tag + "\" : " + (value==true?"true":"false"));
        
        if (comma) {
            pw.println(",");
        } else {
            pw.println("");
        }
    }   
    
    public PrintWriter getHandle() {
        return pw;
    }
    
    public void outputVersions(boolean initMode) {        
        if (initMode) {
            beginJSONSection();
            writeJSONTag("metadata");
            beginJSONSection();            
        }
        
        writeJSONTagString("minknow_version", "19.12.6", true);
        writeJSONTagString("guppy_version", "2.2.3", true);
        writeJSONTagString("centrifuge_version", "1.0.3-beta", true);
        writeJSONTagString("blast_version", "2.10", true);
        writeJSONTagString("metamaps_version", "485907a", true);
        writeJSONTagString("pipeline_version", "0.76.1", true);
        writeJSONTagString("vfdb_version", "1.10", true);
        writeJSONTagLong("nt_database_version", 20200202, true);
        writeJSONTagLong("metamaps_db_version", 20200205, initMode ? false:true);    
        
        if (initMode) {
            endJSONSection(false);
            endJSONSection(false);            
        }
    }    
}
