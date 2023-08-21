/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.watcher;

import java.io.File;
import java.util.*;
import java.util.Hashtable;
import java.util.LinkedList;
import java.util.concurrent.ThreadPoolExecutor;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.MARTiProgress;
import uk.ac.earlham.marti.core.MARTiLog;

/**
 * Watch directories for new files.
 * 
 * @author Richard M. Leggett
 */
public class FileWatcher {
    private MARTiEngineOptions options;
    private int filesToProcess = 0;
    private int filesProcessed = 0;
    private int lastCompleted = -1;
    private long lastFileTime = System.nanoTime();
    private long secsSinceLast = 0;
    private boolean useProgressBar = false;
    private ArrayList<FileWatcherItem> batchContainersToWatch = new ArrayList<FileWatcherItem>();
    private ArrayList<FileWatcherItem> fileDirsToWatch = new ArrayList<FileWatcherItem>();
    private Hashtable<String, Integer> batchDirs = new Hashtable<String, Integer>();
    private Hashtable<String, Integer> allFiles = new Hashtable<String, Integer>();
    private LinkedList<FileWatcherItem> pendingFiles = new LinkedList<FileWatcherItem>();
    private MARTiProgress progressReport = null;
    
    public FileWatcher(MARTiEngineOptions o, MARTiProgress pr) {
        options = o;
        progressReport = pr;
    }
    
    //public FileWatcher(NanoOKOptions o, String d) {
    //    options = o;
    //    fileDirsToWatch.add(new FileWatcherDir(d, pf));
    //}
    
    public void addBatchContainer(String d, int pf) {
        options.getLog().println("Added batch dir: "+d);
        batchContainersToWatch.add(new FileWatcherItem(d, pf));
    }
    
    public void addWatchDir(String d) {
        options.getLog().println("Added watch dir: "+d);
        fileDirsToWatch.add(new FileWatcherItem(d, MARTiEngineOptions.READTYPE_PASS));
    }
    
    public synchronized void addPendingFile(String s, int pf) {
        pendingFiles.add(new FileWatcherItem(s, pf));
        progressReport.incrementRawFileCount(s);
        filesToProcess++;
    }
    
    public synchronized FileWatcherItem getPendingFile() {
        if (pendingFiles.size() > 0) {
            filesProcessed++;
            return pendingFiles.removeFirst();
        } else {
            return null;
        }
    }

    public void writeProgress() {
        long e = 0;
        long s = MARTiEngineOptions.PROGRESS_WIDTH;
        
        if (useProgressBar) {        
            if (filesToProcess > 0) {
                e = MARTiEngineOptions.PROGRESS_WIDTH * filesProcessed / filesToProcess;
                s = MARTiEngineOptions.PROGRESS_WIDTH - e;
            }

            System.out.print("\rProcessing [");
            for (int i=0; i<e; i++) {
                System.out.print("=");
            }
            for (int i=0; i<s; i++) {
                System.out.print(" ");
            }
            System.out.print("] " + filesProcessed +"/" +  filesToProcess);
            lastCompleted = filesProcessed;
        } else {
            //if ((filesProcessed % 100) == 0) {
                System.out.println("Processed " + filesProcessed +"/" +  filesToProcess);
            //}
        }
    }
    
    private File[] getTimeSortedFileList(File d) {
        File[] files = d.listFiles();
        
        if (files == null) {
            options.getLog().println("Directory "+d.getPath()+" doesn't exist");
            System.out.println("Directory "+d.getPath()+" doesn't exist");
        } else if (files.length <= 0) {
            options.getLog().println("Directory "+d.getPath()+" empty");
        } else {        
            // Obtain the array of (file, timestamp) pairs.
            FilePair[] pairs = new FilePair[files.length];
            for (int i=0; i<files.length; i++) {
                pairs[i] = new FilePair(files[i]);
            }

            // Sort them by timestamp.
            Arrays.sort(pairs);

            // Take the sorted pairs and extract only the file part, discarding the timestamp.
            for (int i = 0; i < files.length; i++) {
                files[i] = pairs[i].f;
            }
        }
        
        return files;
    }
    
    public void scan() {
        int count = 0;          
        for (int i=0; i<fileDirsToWatch.size(); i++) {
            FileWatcherItem dir = fileDirsToWatch.get(i);
            String dirName = dir.getPathname();
            options.getLog().println("Scanning "+dirName);
            File d = new File(dirName);
            
            if (d.exists()) {
                File[] listOfFiles = getTimeSortedFileList(d);

                if (listOfFiles == null) {
                    options.getLog().println("Directory "+dirName+" doesn't exist");
                    System.out.println("Directory "+dirName+" doesn't exist");
                } else if (listOfFiles.length <= 0) {
                    options.getLog().println("Directory "+dirName+" empty");
                } else {
                    for (File file : listOfFiles) {
                        if (file.isFile()) {
                            if (!file.getName().startsWith(("."))) {
                                if (!allFiles.containsKey(file.getPath())) {
                                    count++;
                                    options.getLog().println("Got file "+file.getPath());
                                    allFiles.put(file.getPath(), 1);
                                    this.addPendingFile(file.getPath(), dir.getPassOrFail());
                                    if (count == 1) {
                                        options.writeStartedFlag();
                                    }
                                }
                            }
                        }
                    }            
                }    
            } else {
                options.getLog().println("Directory "+dirName+" doesn't exist");
            }
        }
        
        options.getLog().println(MARTiLog.LOGLEVEL_FILEWATCHERTIMEOUT, "Found "+count + " new files.");

        if (count == 0) {
            long timeSince = System.nanoTime() - lastFileTime;
            secsSinceLast = timeSince / 1000000000;
            options.getLog().println(MARTiLog.LOGLEVEL_NOTSEENFILEFOR, "Not seen file for " + (secsSinceLast) + "s");
        } else {
            lastFileTime = System.nanoTime();
        }
    }
    
    public long getSecsSinceLastFile() {
        return secsSinceLast;
    }
    
    public int getPendingFiles() {
        return pendingFiles.size();
    }
    
    public boolean timedOut() {
        options.getLog().println(MARTiLog.LOGLEVEL_FILEWATCHERTIMEOUT, "In FileWatcher timedOut: size = " + pendingFiles.size() + " time = " + secsSinceLast + " timeout = "+options.getFileWatcherTimeout());
        
        if (pendingFiles.size() == 0) {        
            if (secsSinceLast >= options.getFileWatcherTimeout()) {
                return true;
            }
        }
        
        return false;               
    }
}
