import java.io.*; import java.util.*;
import uk.ac.earlham.lcaparse.*; import uk.ac.earlham.marti.core.DiversityStats;
/** Reads "id parent srank summed summedYield" lines; prints engine diversity for ranks 1-10, reads & bases. */
public class Harness {
    public static void main(String[] a) throws Exception {
        boolean chao1Valid = Boolean.parseBoolean(a[1]);
        Map<Long,TaxonomyNode> nodes = new LinkedHashMap<>(); Map<Long,Long> parent = new LinkedHashMap<>();
        Taxonomy tax = new Taxonomy();
        for (String line : new BufferedReader(new FileReader(a[0])).lines().toList()) {
            String[] f = line.split("\t");
            long id = Long.parseLong(f[0]);
            nodes.put(id, new TaxonomyNode(id, Integer.parseInt(f[2]), Long.parseLong(f[3]), Long.parseLong(f[4])));
            parent.put(id, Long.parseLong(f[1]));
            if (Long.parseLong(f[1]) < 0) tax.root = nodes.get(id);
        }
        for (var e : parent.entrySet()) if (e.getValue() >= 0) nodes.get(e.getValue()).getChildren().add(nodes.get(e.getKey()));
        for (String unit : new String[]{"reads","bases"}) for (int r=1; r<=10; r++) {
            boolean y = unit.equals("bases");
            DiversityStats d = new DiversityStats(DiversityStats.leafAbundances(tax, 0, r, y), !y && chao1Valid);
            System.out.println(unit+"\t"+r+"\t"+d.getTotal()+"\t"+d.getRichness()+"\t"+d.getChao1()+"\t"+d.getShannon()+"\t"+d.getPielou()+"\t"+d.getSimpson()+"\t"+d.getInvSimpson()+"\t"+d.getSimpsonEvenness());
        }
    }
}
