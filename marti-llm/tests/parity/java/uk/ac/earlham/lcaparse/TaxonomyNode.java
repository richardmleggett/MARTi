package uk.ac.earlham.lcaparse;
import java.util.ArrayList;
/** Test stand-in exposing only what DiversityStats uses. */
public class TaxonomyNode {
    long id; int srank; long summed, summedYield;
    ArrayList<TaxonomyNode> children = new ArrayList<>();
    public TaxonomyNode(long id, int srank, long summed, long summedYield) { this.id=id; this.srank=srank; this.summed=summed; this.summedYield=summedYield; }
    public ArrayList<TaxonomyNode> getChildren() { return children; }
    public long getLCASummed(int bc) { return summed; }
    public long getLCASummedYield(int bc) { return summedYield; }
    public int getSimplifiedRank() { return srank; }
    public long getId() { return id; }
}
