/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.util.Hashtable;
import java.util.Arrays;

/**
 *
 * @author martins
 */
public class ReadStatistics {
    
    private MARTiEngineOptions options;
    private Hashtable<Integer,Hashtable<String,Integer>> failLengthsByBarcode = new Hashtable<Integer, Hashtable<String,Integer>>();
    private Hashtable<Integer,Hashtable<String,Integer>> passLengthsByBarcode = new Hashtable<Integer, Hashtable<String,Integer>>();
    
    private Hashtable<Integer,Integer> maxPassLengthByBarcode = new Hashtable<Integer,Integer>();
    private Hashtable<Integer,Integer> maxFailLengthByBarcode = new Hashtable<Integer,Integer>();
    
    public ReadStatistics(MARTiEngineOptions o) {
        options = o;
    }
    
    public void addReadLength(int bc, String readId, int length, boolean pass) {
        if(pass) {
            if(!passLengthsByBarcode.containsKey(bc)) {
                passLengthsByBarcode.put(bc, new Hashtable<String,Integer>());
                maxPassLengthByBarcode.put(bc, 0);
            }
            Hashtable<String,Integer> hashtable = passLengthsByBarcode.get(bc);
            if(hashtable.containsKey(readId)) {
                options.getLog().printlnLogAndScreen("Warning: Duplicate pass read/sequence ID: " + readId);
                options.getLog().printlnLogAndScreen("Results based on read length may not be accurate.");
            }
            hashtable.put(readId, length);
            int max = maxPassLengthByBarcode.get(bc);
            if(length > max) {
                maxPassLengthByBarcode.put(bc, length);
            }
        } else {
            if(!failLengthsByBarcode.containsKey(bc)) {
                failLengthsByBarcode.put(bc, new Hashtable<String,Integer>());
                maxFailLengthByBarcode.put(bc, 0);
            }
            Hashtable<String,Integer> hashtable = failLengthsByBarcode.get(bc);
            if(hashtable.containsKey(readId)) {
                options.getLog().printlnLogAndScreen("Warning: Duplicate fail read/sequence ID: " + readId);
                options.getLog().printlnLogAndScreen("Results based on read length may not be accurate.");
            }
            hashtable.put(readId, length);
            int max = maxFailLengthByBarcode.get(bc);
            if(length > max) {
                maxFailLengthByBarcode.put(bc, length);
            }
        }
        
    }
       
    public int getReadLength(int bc, String queryid, boolean pass) {
        if(pass) {
            return passLengthsByBarcode.get(bc).get(queryid);
        } else {
            return failLengthsByBarcode.get(bc).get(queryid);
        }
    }
    
    public int getN50(int bc, boolean pass) {
        if(pass) {
            return getN50(passLengthsByBarcode.get(bc));
        } else {
            return getN50(failLengthsByBarcode.get(bc));
        }
    }
    
    public int getMaxLength(int bc, boolean pass) {
        if(pass) {
            return maxPassLengthByBarcode.get(bc);       
        } else {
            return maxFailLengthByBarcode.get(bc);
        }
       
    }
    
    private int getN50(Hashtable<String,Integer> lengthTable) {
        int[] lengths = new int[lengthTable.size()];
        int i = 0;
        int totalLength = 0;
        for(int length : lengthTable.values()) {
            lengths[i++] = length;
            totalLength += length;
        }     
        Arrays.sort(lengths);
        int count = 0;
        for(int j = lengths.length - 1; j >= 0; j--) {
            count += lengths[j];
            if(count >= totalLength/2) {
                return lengths[j];
            }
        }     
        return -1;
    }
}
