/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */

package uk.ac.earlham.lcaparse;

import java.io.BufferedReader;
import java.io.FileReader;
import java.util.Hashtable;

/**
 * Convert accessions to taxa IDs.
 * 
 * @author Richard M. Leggett
 */
public class AccessionTaxonConvertor {
    private Hashtable<String, Long> accessionToTaxon = new Hashtable<String, Long>();
    private Hashtable<String, Integer> warningAccession = new Hashtable<String, Integer>();
    int count = 0;
    
    public AccessionTaxonConvertor() {  
    }
    
    public void readMapFile(String mapFilename, boolean twoColumn) {
        BufferedReader br;
        String line;
        try {
            System.out.println("Reading "+mapFilename);
            br = new BufferedReader(new FileReader(mapFilename));
            br.readLine();
            while ((line = br.readLine()) != null) {
                String[] fields = line.split("\t");
                String accession;
                long taxonId;
                if (twoColumn) {
                    accession = fields[0];
                    taxonId = Long.parseLong(fields[1]);                
                } else {
                    accession = fields[0];
                    taxonId = Long.parseLong(fields[2]);
                }
                                
                //long gi = Long.parseLong(fields[3]);
                accessionToTaxon.put(accession, taxonId);
                count++;
                //if (count % 1000000 == 0) {
                //    System.out.println("    Read "+count+" entries");
                //}
            }
            //System.out.println("Finished");
            br.close();            
        } catch (Exception e) {
            System.out.println("AccessionTaxonConvertor exception");
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    public long getTaxonFromAccession(String accession) {
        long r = -1;
        
        if (accession.contains(".")) {
            accession = accession.substring(0, accession.indexOf('.'));
        }
        
        if (accessionToTaxon.containsKey(accession)) {
            r = accessionToTaxon.get(accession);
        } else {
            warnAccession(accession);
        }
        
        return r;
    }
    
    public void warnAccession(String accession) {
        //if (options.showWarnings()) {
            if (!warningAccession.containsKey(accession)) {
                warningAccession.put(accession, 1);
                System.out.println("Warning: unknown accession "+accession);
            }
        //}
    }    
}
