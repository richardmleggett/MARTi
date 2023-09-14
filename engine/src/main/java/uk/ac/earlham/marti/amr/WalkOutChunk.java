/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.Reader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.zip.GZIPInputStream;
import uk.ac.earlham.lcaparse.AccessionTaxonConvertor;
import uk.ac.earlham.lcaparse.BlastHit;
import uk.ac.earlham.lcaparse.LCAParseOptions;
import uk.ac.earlham.lcaparse.Taxonomy;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * Represent a (file) chunk of the AMR walkout.
 * 
 * @author Richard M. Leggett
 */
public class WalkOutChunk {
    private Hashtable<String, WalkOutRead> reads = new Hashtable<String, WalkOutRead>();
    private Taxonomy taxonomy;
    private MARTiEngineOptions options;
    private String cardFilename = null;
    private String bacteriaFilename = null;
    int originalChunkNumber = 0;
    int processedChunkNumber = 0;
    int readsWithAMRHits = 0;

    public WalkOutChunk(MARTiEngineOptions o, Taxonomy t, int c, int p) {
        options = o;
        taxonomy = t;
        originalChunkNumber = c;
        processedChunkNumber = p;
    }
    
    public void load(String cardPath, String bacteriaPath) {
        cardFilename = cardPath;
        bacteriaFilename = bacteriaPath;
        LCAParseOptions lcaOptions = options.getReadClassifier().getLCAParseOptions();
        int plasmidCount = 0;
        int chromosomeCount = 0;
        int otherCount = 0;
        
        try {
            InputStream cardFileStream = null;
            InputStream cardGzipStream = null;
            Reader cardDecoder = null;
            BufferedReader cardReader = null;
            File cardFile = new File(cardFilename);
            if(cardFile.exists())
            {
                cardReader = new BufferedReader(new FileReader(cardFilename));  
            } else {           
                cardFilename = cardFilename + ".gz";
                cardFileStream = new FileInputStream(cardFilename);
                cardGzipStream = new GZIPInputStream(cardFileStream);
                cardDecoder = new InputStreamReader(cardGzipStream, "US-ASCII");
                cardReader = new BufferedReader(cardDecoder);  
            }
            String line;
            
            // Go through CARD file, storing reads with hits
            while ((line = cardReader.readLine()) != null) {
                if (line.length() > 1) {
                    BlastHit bh = new BlastHit(taxonomy, null, line, LCAParseOptions.FORMAT_NANOOK, false, true);
                    if (bh.isValidAlignment()) {
                        WalkOutRead wor = reads.get(bh.getQueryId());
                        if (wor == null) {
                            wor = new WalkOutRead(bh.getQueryId(), options, taxonomy);
                            reads.put(bh.getQueryId(), wor);
                        }
                        wor.addCardHit(bh);
                    }
                }
            }            
            cardReader.close();
            if(cardFileStream != null) {
                cardDecoder.close();
                cardGzipStream.close();
                cardFileStream.close();
            }

            // Now go through bacteria file
            if(bacteriaFilename.length() > 0) {
                InputStream bacteriaFileStream = null;
                InputStream bacteriaGzipStream = null;
                Reader bacteriaDecoder = null;
                BufferedReader bacteriaReader = null;
                File bacteriaFile = new File(bacteriaFilename);
                if(bacteriaFile.exists())
                {
                    bacteriaReader = new BufferedReader(new FileReader(bacteriaFilename));
                } else {           
                    bacteriaFilename = bacteriaFilename + ".gz";
                    bacteriaFileStream = new FileInputStream(bacteriaFilename);
                    bacteriaGzipStream = new GZIPInputStream(bacteriaFileStream);
                    bacteriaDecoder = new InputStreamReader(bacteriaGzipStream, "US-ASCII");
                    bacteriaReader = new BufferedReader(bacteriaDecoder); 
                }

                while ((line = bacteriaReader.readLine()) != null) {
                    if (line.length() > 1) {
                        BlastHit bh = new BlastHit(taxonomy, null, line, LCAParseOptions.FORMAT_NANOOK, false, true);
                        if (bh.isValidAlignment()) {
                            WalkOutRead wor = reads.get(bh.getQueryId());
                            if (wor != null) {
                                if (bh.getSubjectTitle().contains("plasmid")) {
                                    plasmidCount++;
                                } else if (bh.getSubjectTitle().contains("chromosome")) {
                                    chromosomeCount++;
                                } else {
                                    otherCount++;
                                }
                                wor.addBacteriaHit(bh);
                            }
                        }
                    }
                }
                bacteriaReader.close();
                if(bacteriaFileStream != null) {
                    bacteriaDecoder.close();
                    bacteriaGzipStream.close();
                    bacteriaFileStream.close();
                }
            }

            options.getLog().println("Debug: Plasmid count "+plasmidCount + " chromosome count " + chromosomeCount + " other count "+otherCount);
            
        } catch (Exception e) {
            System.out.println("Exception in analyseFiles:");
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    private void writeWalkoutHeader(PrintWriter pw) {
        pw.println("ReadId\tReadChunk\tProcChunk\tCARDHit\tIndy\tPercentID\tLength\tQueryStart\tQueryEnd\tHitStart\tHitEnd\tOverlap\tHost");
    }
    
    private void writeWalkoutFileHit(PrintWriter pw, WalkOutRead wor, String queryId, String lcaShort, int n, int overlap, boolean isIndependent) {
        String cardHit = wor.getCardHit(n).getTargetName();

        if (cardHit.contains("ARO")) {
            cardHit = wor.getCardHit(n).getTargetName().substring(cardHit.lastIndexOf("ARO"));
        } else {
            options.getLog().println("Warning: couldn't get ARO from "+cardHit);
        }

        pw.print(queryId);
        pw.print("\t" + originalChunkNumber);
        pw.print("\t" + processedChunkNumber);
        pw.print("\t" + cardHit);
        pw.print("\t" + (isIndependent?"Y":"N"));
        pw.print("\t" + wor.getCardHit(n).getPercentIdentity());
        pw.print("\t" + wor.getCardHit(n).getLength());
        pw.print("\t" + wor.getCardHit(n).getQueryStart());
        pw.print("\t" + wor.getCardHit(n).getQueryEnd());
        pw.print("\t" + wor.getCardHit(n).getHitStart());
        pw.print("\t" + wor.getCardHit(n).getHitEnd());
        pw.print("\t" + overlap);
        pw.print("\t" + lcaShort);
        pw.println("");
    }

    private void writeAMRHeader(PrintWriter pw) {
        pw.println("ReadId\tReadChunk\tProcChunk\tCARDHit\tPercentID\tLength\tQueryStart\tQueryEnd\tHitStart\tHitEnd\tEValue\tBitScore\tMismatch\tQueryCover");
    }
    
    private void writeAMRFileHit(PrintWriter pw, WalkOutRead wor, int n) {
        pw.print(wor.getCardHit(n).getQueryName());
        pw.print("\t" + originalChunkNumber);
        pw.print("\t" + processedChunkNumber);
        pw.print("\t" + wor.getCardHit(n).getTargetName());
        pw.print("\t" + wor.getCardHit(n).getPercentIdentity());
        pw.print("\t" + wor.getCardHit(n).getLength());
        pw.print("\t" + wor.getCardHit(n).getQueryStart());
        pw.print("\t" + wor.getCardHit(n).getQueryEnd());
        pw.print("\t" + wor.getCardHit(n).getHitStart());
        pw.print("\t" + wor.getCardHit(n).getHitEnd());
        pw.print("\t" + wor.getCardHit(n).getEValueString());
        pw.print("\t" + wor.getCardHit(n).getBitScore());
        pw.print("\t" + wor.getCardHit(n).getMismatches());
        pw.print("\t" + wor.getCardHit(n).getQueryCover());
        pw.println("");
    }
    
    public void processHits(WalkOutResults results) {
        File cardFile = new File(cardFilename);
        String filePrefix = cardFile.getName().substring(0, cardFile.getName().lastIndexOf('.'));
        String walkoutFilename = options.getAMRDirectory() + File.separator + filePrefix + "_walkout.txt";
        String amrFilename = options.getAMRDirectory() + File.separator + filePrefix + "_amr.txt";
        Hashtable<String, Integer> readsWithAMR = new Hashtable<String, Integer>();

        try {
            PrintWriter pwWalkout = new PrintWriter(new FileWriter(walkoutFilename));
            PrintWriter pwAmr = new PrintWriter(new FileWriter(amrFilename));
            writeWalkoutHeader(pwWalkout);
            writeAMRHeader(pwAmr);

            options.getLog().println("Walkout processing chunk "+originalChunkNumber);
            for (HashMap.Entry<String, WalkOutRead> entry : reads.entrySet())
            {
                String queryId = entry.getKey();
                WalkOutRead walkoutRead = entry.getValue();

                if (walkoutRead == null) {
                    System.out.println("Error: wor is null");
                    System.exit(1);
                }

                if (walkoutRead.getBacterialHitSetSize() > 0) {            
                    String hostHit = walkoutRead.getBacterialHit();
                    String lcaHit = walkoutRead.getLCAHit();
                    String lcaShort = lcaHit.substring(lcaHit.lastIndexOf(',')+1);
                    long lcaTaxonID = walkoutRead.getLCAHitTaxonID();
                    boolean isPlasmid = walkoutRead.getIsPlasmid();

                    for (int i=0; i<walkoutRead.getNumberOfGenes(); i++) {
                        int overlap = walkoutRead.getCardHit(i).getDistance();
                        boolean isIndependent = overlap >= walkoutRead.getMinOverlap() ? true:false;
                        String cardHit = walkoutRead.getCardHit(i).getTargetName();
                        double identity = walkoutRead.getCardHit(i).getIdentity();

                        if (cardHit.contains("ARO")) {
                            cardHit = walkoutRead.getCardHit(i).getTargetName().substring(cardHit.lastIndexOf("ARO"));
                        } else {
                            options.getLog().println("Warning: couldn't get ARO from "+cardHit);
                        }
                        
                        results.addWalkoutHit(cardHit, lcaShort, lcaTaxonID, originalChunkNumber, processedChunkNumber, isIndependent, overlap, identity, isPlasmid);
                        writeAMRFileHit(pwAmr, walkoutRead, i);
                        writeWalkoutFileHit(pwWalkout, walkoutRead, queryId, lcaShort, i, overlap, isIndependent);
                        
                        int count = 0;
                        if (readsWithAMR.containsKey(queryId)) {
                            count = readsWithAMR.get(queryId);
                        } else {
                            readsWithAMRHits++;
                        }
                        count++;
                        readsWithAMR.put(queryId, count);                        
                    }
                } else {
                    options.getLog().println("Warning: Got CARD hits, but not bacterial hits for "+queryId + " ("+walkoutRead.getNumberOfGenes()+")");
                    for (int i=0; i<walkoutRead.getNumberOfGenes(); i++) {
                        String cardHit = walkoutRead.getCardHit(i).getTargetName();

                        if (cardHit.contains("ARO")) {
                            cardHit = walkoutRead.getCardHit(i).getTargetName().substring(cardHit.lastIndexOf("ARO"));
                        } else {
                            options.getLog().println("Warning: couldn't get ARO from "+cardHit);
                        }

                        double identity = walkoutRead.getCardHit(i).getIdentity();
                        results.addWalkoutHit(cardHit, "no_hit", -2l, originalChunkNumber, processedChunkNumber, false, 0, identity, false);
                    }
                }
            }
            pwWalkout.close();
            pwAmr.close();
            
            //Date format required: 12 Nov 2020 10:53:32
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("d LLL u HH:mm:ss");  
            LocalDateTime now = LocalDateTime.now();
            String timeString = dtf.format(now);
            results.setChunkTime(processedChunkNumber, timeString);   
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    public int getReadCountWithAMRHits() {
        return readsWithAMRHits;
    }
}
