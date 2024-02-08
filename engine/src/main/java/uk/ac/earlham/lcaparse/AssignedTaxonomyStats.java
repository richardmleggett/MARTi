/*
 * Author: Richard M. Leggett
 * © Copyright 2021-24 Earlham Institute
 */
package uk.ac.earlham.lcaparse;

import java.util.Hashtable;

/**
 *
 * @author leggettr
 */
public class AssignedTaxonomyStats {
    private Hashtable<Long, TaxonomyNodeData> nodeData = new Hashtable<Long, TaxonomyNodeData>();    
    
    public synchronized void registerNodeData(long taxon, double meanId, double maxId) {
        TaxonomyNodeData nd;
        if (nodeData.containsKey(taxon)) {
            nd = nodeData.get(taxon);
        } else {
            nd = new TaxonomyNodeData();
            nodeData.put(taxon, nd);
        }
        
        nd.registerHit(meanId, maxId);
    }
    
    public TaxonomyNodeData getNodeData(long taxon) {
        TaxonomyNodeData tnd = null;
                
        if (nodeData.containsKey(taxon)) {
            tnd = nodeData.get(taxon);
        }
        
        return tnd;
    }    
}
