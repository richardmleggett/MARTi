/*
 * Author: Richard M. Leggett
 * © Copyright 2021-25 Earlham Institute
 */
package uk.ac.earlham.lcaparse;

import java.util.Hashtable;

/**
 *
 * @author leggettr
 */
public class TaxonomyTable {
    private Hashtable<Long, Long> taxa = new Hashtable<Long, Long>();

    public void addTaxon(long id, long count) {
        taxa.put(id, count);
    }
}
