/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.lcaparse;

import java.util.ArrayList;

/**
 *
 * @author leggettr
 */
public class TaxonomyNodeData {
    private ArrayList<Double> meanIds = new ArrayList<Double>();
    private ArrayList<Double> maxIds = new ArrayList<Double>();
    private double meanMean = 0.0;
    private double meanMax = 0.0;
    
    public void registerHit(double mean, double max) {
        meanIds.add(mean);
        maxIds.add(max);
    }
    
    public void calculateMeans() {
        double meanTotal = 0.0;
        double maxTotal = 0.;
        for (int i=0; i<meanIds.size(); i++) {
            meanTotal += meanIds.get(i);
            maxTotal += maxIds.get(i);            
        }
        
        meanMean = meanTotal / meanIds.size();
        meanMax = maxTotal / maxIds.size();
    }
    
    public double getMeanMean() {
        return meanMean;
    }
    
    public double getMeanMax() {
        return meanMax;
    }
}
