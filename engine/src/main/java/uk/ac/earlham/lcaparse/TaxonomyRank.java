/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.lcaparse;

import java.util.ArrayList;
import java.util.Hashtable;

/**
 * Representation of a taxonomy rank.
 * 
 * @author Richard M. Leggett
 */
public class TaxonomyRank {
    private String name;
    private ArrayList<TaxonomyRank> parents = new ArrayList<TaxonomyRank>();
    private ArrayList<TaxonomyRank> children = new ArrayList<TaxonomyRank>();
    private boolean visited = false;
     
    public TaxonomyRank(String s) {
        name = s;
    }
    
    public String getName() {
        return name;
    }
    
    public void addParent(TaxonomyRank r) {
        boolean got = false;
                
        for (int i=0; i<parents.size(); i++) {
            TaxonomyRank tr = parents.get(i);
            if (tr.equals(r)) {
                got = true;
                break;
            }
        }
        
        if (got == false) {
            parents.add(r);
        }
    }
    
    public void addChild(TaxonomyRank r) {
        boolean got = false;
        for (int i=0; i<children.size(); i++) {
            TaxonomyRank tr = children.get(i);
            if (tr.equals(r)) {
                got = true;
                break;
            }
        }

        if (got == false) {
            children.add(r);
        }
    }
    
    public int getNumnberOfParents() {
        return parents.size();
    }
    
    public int getNumberOfChildren() {
        return children.size();
    }
    
    public TaxonomyRank getParent(int n) {
        return parents.get(n);
    }

    public TaxonomyRank getChild(int n) {
        return children.get(n);
    }
    
    public void markVisited() {
        visited = true;
    }
    
    public boolean isVisited() {
        return visited;
    }

}
