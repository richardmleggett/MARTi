/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.megan;

import java.io.File;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.Set;
import uk.ac.earlham.marti.blast.BlastProcess;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * The set of files associated with a MEGAN file.
 * 
 * @author Richard M. Leggett
 */
public class MeganFileSet {
    MARTiEngineOptions options;
    private Hashtable<Integer, MeganFile> meganFiles = new Hashtable<Integer, MeganFile>();
    
    public MeganFileSet(MARTiEngineOptions o) {
        options = o;
    } 
    
    public void addBlastResult(String fastaPath, String blastPath, int jobid) {
        int bc = options.getBarcodeFromPath(fastaPath);
        
        if (!meganFiles.containsKey(bc)) {
            meganFiles.put(bc, new MeganFile(options));
        } 
        meganFiles.get(bc).addBlastResult(fastaPath, blastPath, jobid);
    }
    
     public void checkForMeganInitiation(BlastProcess blastProcess) {
         Set<Integer> barcodesUsed = meganFiles.keySet();
         for (int bc : barcodesUsed) {
             MeganFile mf = meganFiles.get(bc);
             mf.checkForMeganJobInitiation(blastProcess);
         }
     }
}
