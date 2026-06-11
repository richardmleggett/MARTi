/*
 * Author: Richard M. Leggett
 * © Copyright 2021-25 Earlham Institute
 */
package uk.ac.earlham.ml;

import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 *
 * @author leggettr
 */
public class MARTiMLAnalysis {
    private MARTiEngineOptions options;
    
    public MARTiMLAnalysis(MARTiEngineOptions o) {
        options = o;
    }
    
    public void runMLAnalysis() {
        System.out.println("Running ML Analysis...");
        String[] barcodesString = {"0"}; 
        if (options.getBarcodesList() != null) {
            barcodesString = options.getBarcodesList().getCommaSeparatedList().split(",");
        }
        for (String bc : barcodesString) {
            int barcode = Integer.parseInt(bc);
            System.out.println("Processing barcode "+barcode);
        }
    }
}
