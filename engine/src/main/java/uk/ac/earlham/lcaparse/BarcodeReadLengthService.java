/*
 * Author: Richard M. Leggett
 * © Copyright 2021-24 Earlham Institute
 */
package uk.ac.earlham.lcaparse;

import uk.ac.earlham.marti.core.ReadStatistics;

/**
 *
 * @author leggettr
 */
public class BarcodeReadLengthService implements ReadLengthService {
    private ReadStatistics readStats;
    private int barcode;
    private boolean isPassRead = true;
    
    public BarcodeReadLengthService(ReadStatistics s, int bc) {
        readStats = s;
        barcode = bc;
    }
    
    public int getReadLength(String id) {
        return readStats.getReadLength(barcode, id, isPassRead);
    }
}
