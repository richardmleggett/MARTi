/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.watcher;

import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * Separate log for the watcher, used for debugging.
 * 
 * @author Richard M. Leggett
 */
public class WatcherLog {
    private transient PrintWriter pw = null;
    private String filename = null;

    public WatcherLog(MARTiEngineOptions options) {
    }
    
    public synchronized void open(String f, boolean clearLogs) {
        if (clearLogs) {
            filename = f + ".log";
        } else {
            DateFormat df = new SimpleDateFormat("ddMMyy_HHmmss");
            Date dateobj = new Date();
            filename = f + "_" + df.format(dateobj).toString()+".log";
        }
        
        System.out.println("Opening "+filename);
        
        try {
            pw = new PrintWriter(new FileWriter(filename, true));
        } catch (IOException e) {
            System.out.println("WatcherLog exception");
            e.printStackTrace();
        }        
    }
    
    public synchronized void close() {
        if (pw != null) {
            pw.close();
        }
    }

    public synchronized void print(String s) {
        if (pw != null) {
            pw.print(s);
            pw.flush();
        }
    }
        
    public synchronized void println(String s) {
        if (pw != null) {
            pw.println(s);
            pw.flush();
        }
    }
    
    public synchronized PrintWriter getPrintWriter() {
        return pw;
    }    
}
