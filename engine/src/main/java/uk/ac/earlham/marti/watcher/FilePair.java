/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.watcher;

import java.io.File;

/**
 * Store file and last modified time
 * 
 * @author Richard M. Leggett
 */
class FilePair implements Comparable {
    public long t;
    public File f;

    public FilePair(File file) {
        f = file;
        t = file.lastModified();
    }

    public int compareTo(Object o) {
        long u = ((FilePair) o).t;
        return t < u ? -1 : t == u ? 0 : 1;
    }
};
