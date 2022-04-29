/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.watcher;

import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * Representation of items in directory being watched by FileWatcher.
 * 
 * @author Richard M. Leggett
 */
public class FileWatcherItem {
    private String pathname;
    private int passOrFail;
    
    public FileWatcherItem(String p, int pf) {
        pathname = p;
        passOrFail = pf;
    }
    
    public String getPathname() {
        return pathname;
    }
    
    public int getPassOrFail() {
        return passOrFail;
    }
    
    public boolean isPass() {
        return passOrFail == MARTiEngineOptions.READTYPE_PASS ? true: false;
    }
    
    public boolean isFail() {
        return passOrFail == MARTiEngineOptions.READTYPE_FAIL ? true: false;
    }

    public boolean isCombined() {
        return passOrFail == MARTiEngineOptions.READTYPE_COMBINED ? true: false;
    }
}
