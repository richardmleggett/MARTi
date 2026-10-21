/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.util.ArrayList;
import javax.json.JsonObjectBuilder;
import uk.ac.earlham.lcaparse.Taxonomy;
import uk.ac.earlham.lcaparse.TaxonomyNode;

/**
 * Alpha-diversity statistics for one sample at one rank, calculated from the
 * LCA-adjusted taxonomy. Taxa are chosen exactly as TaxaAccumulation does, so
 * richness (S) here matches the taxa accumulation count for the same state.
 * The same calculation is mirrored in the GUI by gui/UI/public/js/diversity.js.
 */
public class DiversityStats {
    private long total = 0;           // N: reads (or bases) assigned to the taxa counted
    private int richness = 0;         // S
    private Double chao1 = null;
    private Double shannon = null;
    private Double pielou = null;
    private Double simpson = null;
    private Double invSimpson = null;
    private Double simpsonEvenness = null;

    /**
     * Calculate statistics from an abundance vector.
     *
     * @param counts      abundance of each taxon (all > 0)
     * @param chao1Valid  false when singletons/doubletons are not genuine read counts
     *                    (min support > 0, or base yields), in which case Chao1 is left null
     */
    public DiversityStats(ArrayList<Long> counts, boolean chao1Valid) {
        richness = counts.size();
        for (long c : counts) {
            total += c;
        }

        if (total == 0) {
            return;
        }

        double h = 0;
        double sumP2 = 0;
        long f1 = 0;
        long f2 = 0;
        for (long c : counts) {
            double p = (double) c / (double) total;
            h -= p * Math.log(p);
            sumP2 += p * p;
            if (c == 1) {
                f1++;
            } else if (c == 2) {
                f2++;
            }
        }

        shannon = h;
        simpson = 1.0 - sumP2;
        invSimpson = 1.0 / sumP2;
        simpsonEvenness = invSimpson / richness;
        if (richness > 1) {
            pielou = h / Math.log(richness);
        }
        if (chao1Valid) {
            if (f2 > 0) {
                chao1 = richness + ((double) f1 * f1) / (2.0 * f2);
            } else {
                chao1 = richness + ((double) f1 * (f1 - 1)) / 2.0; // bias-corrected form when f2 = 0
            }
        }
    }

    /**
     * Collect the abundance of each taxon counted at a rank, using the same rules as
     * TaxaAccumulation.exploreNode: a taxon is a node at or above the target rank with
     * no counted descendants at or above that rank. Lineages that stop above the rank
     * therefore count as one taxon, and rank-0 ("no rank"/clade) nodes are never counted.
     *
     * @param taxonomy  taxonomy holding the current LCA-adjusted assignments
     * @param bc        barcode
     * @param rank      simplified rank (1 = domain ... 9 = subspecies, 10 = all levels)
     * @param useYield  true for base yields, false for read counts
     * @return abundance of each counted taxon
     */
    public static ArrayList<Long> leafAbundances(Taxonomy taxonomy, int bc, int rank, boolean useYield) {
        return leafAbundances(taxonomy.getNodeFromTaxonId(1L), bc, rank, useYield);
    }

    /**
     * As above, starting from a given root node.
     */
    public static ArrayList<Long> leafAbundances(TaxonomyNode root, int bc, int rank, boolean useYield) {
        ArrayList<Long> counts = new ArrayList<Long>();
        if (root != null) {
            exploreNode(root, bc, rank, useYield, counts);
        }
        return counts;
    }

    private static int exploreNode(TaxonomyNode n, int bc, int rank, boolean useYield, ArrayList<Long> counts) {
        int markedChildren = 0;

        ArrayList<TaxonomyNode> children = n.getChildren();
        for (int i=0; i<children.size(); i++) {
            TaxonomyNode c = children.get(i);
            if ((c.getLCASummed(bc) > 0) && (c.getSimplifiedRank() <= rank)) {
                markedChildren += exploreNode(c, bc, rank, useYield, counts);
            }
        }

        if (markedChildren == 0) {
            if ((n.getSimplifiedRank() != 0) && (n.getSimplifiedRank() <= rank) && (n.getLCASummed(bc) > 0)) {
                long abundance = useYield ? n.getLCASummedYield(bc) : n.getLCASummed(bc);
                if (abundance > 0) {
                    counts.add(abundance);
                }
                markedChildren++;
            }
        }

        return markedChildren;
    }

    private static void addNullable(JsonObjectBuilder b, String key, Double v) {
        if ((v == null) || v.isNaN() || v.isInfinite()) {
            b.addNull(key);
        } else {
            b.add(key, v);
        }
    }

    /**
     * Add these statistics to a JSON object.
     */
    public void addToJson(JsonObjectBuilder b) {
        b.add("N", total);
        b.add("S", richness);
        addNullable(b, "chao1", chao1);
        addNullable(b, "shannon", shannon);
        addNullable(b, "pielou", pielou);
        addNullable(b, "simpson", simpson);
        addNullable(b, "invSimpson", invSimpson);
        addNullable(b, "simpsonEvenness", simpsonEvenness);
    }

    public long getTotal() { return total; }
    public int getRichness() { return richness; }
    public Double getChao1() { return chao1; }
    public Double getShannon() { return shannon; }
    public Double getPielou() { return pielou; }
    public Double getSimpson() { return simpson; }
    public Double getInvSimpson() { return invSimpson; }
    public Double getSimpsonEvenness() { return simpsonEvenness; }
}
