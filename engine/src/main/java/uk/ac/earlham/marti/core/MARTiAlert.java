/*
 * Author: Richard M. Leggett
 * © Copyright 2021-25 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.util.Calendar;
import java.util.GregorianCalendar;

/**
 *
 * @author leggettr
 */
public class MARTiAlert {
    String timeString;
    int alertType;
    int count = 1;
    String messageText = null;
    String runID = null;
    String sampleID = null;
    public final static int TYPE_SUCCESS = 1;
    public final static int TYPE_WARNING = 2;
    public final static int TYPE_ERROR = 3;
    public final static int TYPE_NEUTRAL = 4;
            
    public MARTiAlert(int type, String message) {
        timeString = this.getTime();
        alertType = type;
        messageText = message;
    }

    public MARTiAlert(int type, String message, String run, String sample) {
        timeString = this.getTime();
        alertType = type;
        messageText = message;
        runID = run;
        sampleID = sample;
    }
    
    public String calendarToString(GregorianCalendar gc) {
       String s = String.format("%d-%02d-%02dT%02d:%02d:%02d",
                                 gc.get(Calendar.YEAR),
                                 gc.get(Calendar.MONTH)+1,
                                 gc.get(Calendar.DAY_OF_MONTH),
                                 gc.get(Calendar.HOUR_OF_DAY),
                                 gc.get(Calendar.MINUTE),
                                 gc.get(Calendar.SECOND));

        return s;
    }
    
    public String getTime() {
        GregorianCalendar timeNow = new GregorianCalendar();
        return calendarToString(timeNow);
    }
        
    public void incrementCount() {
        count++;
    }

    public String getTimeString() {
        return timeString;
    }
    
    public String getMessageTex() {
        return messageText;
    }
    
    public String getRunID() {
        return runID;
    }
    
    public String getSampleID() {
        return sampleID;
    }    
    
    public String getTypeString() {
        String typeString = "unknown";
        
        switch(alertType) {
            case TYPE_SUCCESS: typeString = "success"; break;
            case TYPE_WARNING: typeString = "warning"; break;
            case TYPE_ERROR:   typeString = "error"; break;
            case TYPE_NEUTRAL: typeString = "neutral"; break;
        }
        
        return typeString;
    }
}
