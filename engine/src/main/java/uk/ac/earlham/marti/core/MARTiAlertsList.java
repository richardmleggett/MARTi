/*
 * Author: Richard M. Leggett
 * © Copyright 2021-25 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.io.Writer;
import java.math.BigDecimal;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;
import java.util.Set;
import javax.json.Json;
import javax.json.JsonArrayBuilder;
import javax.json.JsonObject;
import javax.json.JsonObjectBuilder;
import javax.json.JsonWriterFactory;
import javax.json.stream.JsonGenerator;

/**
 *
 * @author leggettr
 */
public class MARTiAlertsList {
    private MARTiEngineOptions options = null;
    private Hashtable<Integer, MARTiAlert> alertsByOrder = new Hashtable<Integer, MARTiAlert>(); 
    private Hashtable<String, MARTiAlert> alertsByMessage = new Hashtable<String, MARTiAlert>(); 
    int count = 0;
    private long lastWriteTime = 0;
    
    public MARTiAlertsList(MARTiEngineOptions o) {
        options = o;
    }
    
    public synchronized void writeAlertsFile(String alertsFilename) {
        if (alertsFilename != null) {            
            // Build top-level object
            JsonObjectBuilder objectBuilder = Json.createObjectBuilder();
            
            JsonArrayBuilder alertsBuilder = Json.createArrayBuilder();
            for (int i=1; i<=count; i++) {
                JsonObjectBuilder thisAlertBuilder = Json.createObjectBuilder();
                MARTiAlert a = alertsByOrder.get(i);
                thisAlertBuilder.add("time", a.getTimeString());
                thisAlertBuilder.add("type", a.getTypeString());
                thisAlertBuilder.add("content", a.getMessageTex());
                
                if (a.getSampleID() != null) {
                    thisAlertBuilder.add("id", a.getSampleID());
                }

                if (a.getRunID() != null) {
                    thisAlertBuilder.add("id", a.getRunID());
                }
                
                alertsBuilder.add(thisAlertBuilder.build());
            }

            objectBuilder.add("alerts", alertsBuilder);
            JsonObject jsonObject = objectBuilder.build();                   

            // Print it with pretty printing (pacing etc.)
            Map<String, Boolean> config = new HashMap<>();
            config.put(JsonGenerator.PRETTY_PRINTING, true);
            JsonWriterFactory writerFactory = Json.createWriterFactory(config);
        
            try {
                Writer writer = new StringWriter();
                writerFactory.createWriter(writer).write(jsonObject);
                String jsonString = writer.toString();

                PrintWriter pw = new PrintWriter(new FileWriter(alertsFilename));
                pw.write(jsonString);
                pw.close();  
            } catch (Exception e) {
                e.printStackTrace();
                System.exit(1);
            }        
        }
    }
    
    public synchronized void addAlert(MARTiAlert a) {
        count++;
        alertsByOrder.put(count, a);
        alertsByMessage.put(a.getMessageTex(), a);
    }    
    
    public synchronized boolean alertExistsAlready(MARTiAlert a) {
        return alertsByMessage.containsKey(a.getMessageTex());
    }
}