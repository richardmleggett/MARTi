/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

/**
 * Maintain list of active barcodes
 * 
 * @author Richard M. Leggett
 */
public class BarcodesList {
    public final static int MAX_BARCODES = MARTiEngineOptions.MAX_BARCODES;
    private boolean barcodeActive[] = new boolean[MAX_BARCODES + 1];
    private boolean acceptAnyBarcode = true;
    
    public BarcodesList() {
        for (int i=0; i<=MAX_BARCODES; i++) {
            barcodeActive[i] = true;
        }
    }
    
    public BarcodesList(String list) {
        System.out.println("Got list "+list);
        for (int i=0; i<=MAX_BARCODES; i++) {
            barcodeActive[i] = false;
        }
        String[] tokens = list.split(",");
        for (int i=0; i<tokens.length; i++) {
            int b = Integer.parseInt(tokens[i]);
            barcodeActive[b] = true;
        }        
        acceptAnyBarcode = false;
    }
    
    public boolean isBarcodeActive(int b) {
        boolean isActive = false;
        if (b <= MAX_BARCODES) {
            isActive = barcodeActive[b];
        }
        return isActive;
    }
    
    public void listActiveBarcodes() {
        System.out.print("Barcodes:");
        if (acceptAnyBarcode) {
            System.out.print(" any");
        } else {
            for (int i=0; i<=MAX_BARCODES; i++) {
                if (isBarcodeActive(i)) {
                    System.out.print(" " + i);
                }
            }
        }
        System.out.println("");
    }
    
    public String getCommaSeparatedList() {
        String s = "";
        
        for (int i=0; i<=MAX_BARCODES; i++) {
            if (isBarcodeActive(i)) {
                if (s.length() > 0) {
                    s += ",";
                }
                
                if (i < 10) {
                    s = s + "0" + i;
                } else {
                    s = s + i;
                }                
            }
        }
        
        return s;
    }
}
