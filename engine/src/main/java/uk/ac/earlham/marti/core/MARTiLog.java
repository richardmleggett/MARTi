/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.Serializable;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.regex.Pattern;

/**
 * Log class
 * 
 * @author Richard M. Leggett
 */
public class MARTiLog implements Serializable {
    public final static int LOGLEVEL_PROGRESSREPORT = 2;
    public final static int LOGLEVEL_JOBSSTILLRUNNING = 2;
    public final static int LOGLEVEL_NOTCOMPLETED = 2;
    public final static int LOGLEVEL_FILEWATCHERTIMEOUT = 3;
    public final static int LOGLEVEL_CHECKFORENDTIMEOUT = 3;
    public final static int LOGLEVEL_CHECKFORFILESTOCLASSIFY = 3;
    public final static int LOGLEVEL_NOTSEENFILEFOR = 3;
    public final static int LOGLEVEL_STOREACCUMULATION = 4;
    public final static int LOGLEVEL_MAX = 5;
    public final static int LOGLEVEL_DEFAULT = 1;
    private static final long serialVersionUID = MARTiEngine.SERIAL_VERSION;
    private transient PrintWriter pw = null;
    private int logLevel = LOGLEVEL_DEFAULT;
    
    public MARTiLog() {
    }

    public void setLogLevel(int l) {
        logLevel = l;
    }
    
    public synchronized void open(String filename) {
        try {
            pw = new PrintWriter(new FileWriter(filename, false));
        } catch (IOException e) {
            System.out.println("NanoOKLog exception");
            e.printStackTrace();
        }        
    }
    
    public synchronized void close() {
        if (pw != null) {
            pw.close();
        }
    }
    
    public GregorianCalendar stringToCalendar(String s) {
        Pattern p = Pattern.compile("^[0-9]{1,2}\\/[0-9]{1,2}\\/[0-9]{4} [0-9]{1,2}:[0-9]{1,2}:[0-9]{1,2}$");
        System.out.println("Parsed "+s+" to ");
        return new GregorianCalendar();
    }
    
    public String calendarToString(GregorianCalendar gc) {
        String s = String.format("%d/%d/%d %02d:%02d:%02d",
                                 gc.get(Calendar.DAY_OF_MONTH),
                                 gc.get(Calendar.MONTH)+1,
                                 gc.get(Calendar.YEAR),
                                 gc.get(Calendar.HOUR_OF_DAY),
                                 gc.get(Calendar.MINUTE),
                                 gc.get(Calendar.SECOND));
        return s;
    }
    
    public String getTime() {
        GregorianCalendar timeNow = new GregorianCalendar();
        return calendarToString(timeNow);
    }

    public synchronized void writeTimeStamp() {
        if (pw != null) {
        }
    }    
    
    public synchronized void print(int level, String s) {
        if (level <= logLevel) {
            if (pw != null) {
                pw.print(getTime() + " " + s);
            } 
        }
    }

    public synchronized void print(String s) {
        this.print(1, s);
    }
    
    public synchronized void println(int level, String s) {
        if (level <= logLevel) {
            if (pw != null) {
                pw.println(getTime() + " " + s);
                pw.flush();
            } else {
                System.out.println("LOG: " + getTime() + " " + s);
            }
        }
    }

    public synchronized void println(String s) {
        this.println(1, s);
    }    
    
    public synchronized void printlnLogAndScreen(int level, String s) {
        this.println(level, s);
        System.out.println(s);
    }

    public synchronized void printlnLogAndScreen(String s) {
        this.printlnLogAndScreen(1, s);
    }
    
    public synchronized PrintWriter getPrintWriter() {
        return pw;
    }    
}
