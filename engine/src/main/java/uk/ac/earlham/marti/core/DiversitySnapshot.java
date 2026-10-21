/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

/**
 * Diversity statistics for every rank at one point in a run (one chunk, one min support),
 * for both read counts and base yields.
 */
public class DiversitySnapshot {
    public static final int MAX_RANK = 10;
    private DiversityStats[] readStats = new DiversityStats[MAX_RANK + 1];
    private DiversityStats[] yieldStats = new DiversityStats[MAX_RANK + 1];

    public void setReadStats(int rank, DiversityStats s) {
        readStats[rank] = s;
    }

    public void setYieldStats(int rank, DiversityStats s) {
        yieldStats[rank] = s;
    }

    public DiversityStats getReadStats(int rank) {
        return readStats[rank];
    }

    public DiversityStats getYieldStats(int rank) {
        return yieldStats[rank];
    }
}
