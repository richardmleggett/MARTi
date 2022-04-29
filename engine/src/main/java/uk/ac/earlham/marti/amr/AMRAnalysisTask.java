/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

import uk.ac.earlham.marti.core.MARTiAnalysisTask;

/**
 * Details of AMR analysis task
 * 
 * @author Richard M. Leggett
 */
public class AMRAnalysisTask implements MARTiAnalysisTask {
    private int barcode = 0;
    private int originalChunkNumber = 0;
    private int processedChunkNumber = 0;
    private String queryFilename = null;
    private String cardFilename = null;
    private String ntFilename = null;
    
    public AMRAnalysisTask(int bc, int originalChunk, int parsedChunk, String card, String nt, String query) {
        barcode = bc;
        originalChunkNumber = originalChunk;
        processedChunkNumber = parsedChunk;
        cardFilename = card;
        ntFilename = nt;
        queryFilename = query;
    }
    
    public String getTaskDescriptor() {
        return "AMRAnalysis";
    }
    
    public String getCARDBlastFilename() {
        return cardFilename;
    }

    public String getNtBlastFilename() {
        return ntFilename;
    }
    
    public String getQueryFilename() {
        return queryFilename;
    }
    
    public int getBarcode() {
        return barcode;
    }    

    public int getOriginalChunkNumber() {
        return originalChunkNumber;
    }
    
    public int getProcessedChunkNumber() {
        return processedChunkNumber;
    }
}
