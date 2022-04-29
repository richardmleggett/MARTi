/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.PrintWriter;

/**
 * Filter a taxonomy accession map file by family etc.
 * 
 * @author Richard M. Leggett
 */
public class AccessionMapFilter {
    private Taxonomy taxonomy;
    
    public AccessionMapFilter(Taxonomy t) {
        taxonomy = t;
    }
    
    public void filterMapFile(String mapFilename, String prefix) {
        String bacteriaOut = prefix + "_bacteria.txt";
        String virusesOut = prefix  +"_viruses.txt";
        String archeaOut = prefix  +"_archea.txt";
        String eukaryotaOut = prefix + "_eukaryota.txt";
        String otherOut = prefix + "_other.txt";
        String unclassifiedOut = prefix + "_unclassified.txt";
        BufferedReader br;
        String line;
        int count = 0;
        try {
            System.out.println("Reading "+mapFilename);
            System.out.println("Writing "+bacteriaOut);
            System.out.println("Writing "+virusesOut);
            System.out.println("Writing "+archeaOut);
            System.out.println("Writing "+eukaryotaOut);
            System.out.println("Writing "+otherOut);
            System.out.println("Writing "+unclassifiedOut);
            br = new BufferedReader(new FileReader(mapFilename));
            PrintWriter pwBacteria = new PrintWriter(new FileWriter(bacteriaOut)); 
            PrintWriter pwViruses = new PrintWriter(new FileWriter(virusesOut)); 
            PrintWriter pwArchea = new PrintWriter(new FileWriter(archeaOut)); 
            PrintWriter pwEukaryota = new PrintWriter(new FileWriter(eukaryotaOut)); 
            PrintWriter pwOther = new PrintWriter(new FileWriter(otherOut));
            PrintWriter pwUnclassified = new PrintWriter(new FileWriter(unclassifiedOut));

            br.readLine();
            while ((line = br.readLine()) != null) {
                String[] fields = line.split("\t");
                String accession = fields[0];
                long taxonId = Long.parseLong(fields[2]);
                //long gi = Long.parseLong(fields[3]);
                //System.out.print(accession);
                
                if (taxonId == 0) {
                    //System.out.println("WARNING: Taxon 0 specified ("+line+")");
                } else {
                    if (taxonomy.isSecondAnAncestorOfFirst(taxonId, 2)) {
                        pwBacteria.println(accession + "\t" + taxonId);
                    } else if (taxonomy.isSecondAnAncestorOfFirst(taxonId, 10239)) {
                        pwViruses.println(accession + "\t" + taxonId);
                    } else if (taxonomy.isSecondAnAncestorOfFirst(taxonId, 2157)) {
                        pwArchea.println(accession + "\t" + taxonId);
                    } else if (taxonomy.isSecondAnAncestorOfFirst(taxonId, 2759)) {
                        pwEukaryota.println(accession + "\t" + taxonId);
                    } else if (taxonomy.isSecondAnAncestorOfFirst(taxonId, 28384)) {
                        pwOther.println(accession + "\t" + taxonId);
                    } else {
                        pwUnclassified.println(accession + "\t" + taxonId);
                    }
                }
                
                count++;
                if (count % 1000000 == 0) {
                    System.out.println("    Read "+count+" entries");
                }                
            }
            System.out.println("Finished");
            pwBacteria.close();
            pwViruses.close();
            pwArchea.close();
            pwEukaryota.close();
            pwOther.close();    
            pwUnclassified.close();
            br.close();            
        } catch (Exception e) {
            System.out.println("AccessionTaxonConvertor exception");
            e.printStackTrace();
            System.exit(1);
        }            

    }
}
