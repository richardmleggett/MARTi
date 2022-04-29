/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

/**
 * Store list of (alignment) co-ordinates
 * 
 * @author Richard M. Leggett
 */
public class CoordinateList {
    private int[] start = new int[1000];    
    private int[] end = new int[1000];    
    private int count = 0;
    
    public CoordinateList() {
    }
    
    public void add(int s, int e) {
        
        if (e > s) {
            start[count] = s;
            end[count] = e;
        } else {
            start[count] = e;
            end[count] = s;
        }
        
        count++;
    }
    
    public int getOverlap(int s, int e) {
        int overlap = 0;
        
        if (s > e) {
            int i = e;
            e = s;
            s = i;
        }
    
        for (int i=0; i<count; i++) {
            if ((s >= start[i]) && (s <= end[i])) {
                if ((e >= start[i]) && (e <= end[i])) {
                    overlap = e - s;
                } else {
                    overlap = end[i] - s;
                }
            } else if ((e >= start[i]) && (e <= end[i])) {
                overlap = e - start[i];                
            }
        }
        
        return overlap;
    }
    
    public int getCount() {
        return count;
    }
}
