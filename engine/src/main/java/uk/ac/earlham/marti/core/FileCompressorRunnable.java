/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.GZIPOutputStream;

/**
 * Thread for compressing files
 * @author martins
 */
public class FileCompressorRunnable implements Runnable {
    
    private ConcurrentLinkedQueue<String> m_queue;
    private boolean keepRunning = true;
    
    private boolean compressFile(String filename) {
        //System.out.println("Compressing file " + filename);
        byte[] buffer = new byte[1024];
        try {            
            FileInputStream fis = new FileInputStream(filename);
            FileOutputStream fos = new FileOutputStream(filename + ".gz");
            GZIPOutputStream gzos = new GZIPOutputStream(fos);
 
            int bytes_read;
             
            while ((bytes_read = fis.read(buffer)) > 0) {
                gzos.write(buffer, 0, bytes_read);
            } 
            fis.close();
            gzos.finish();
            gzos.close();
 
        } catch (IOException ex) {
            ex.printStackTrace();
            return false;
        }
        return true;
    }
    
    private void removeFile(String filename) {
        try {
            File f = new File(filename);
            f.delete();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    public FileCompressorRunnable(ConcurrentLinkedQueue<String> queue) {
        m_queue = queue;
    }
    
    public void run() {
        while(keepRunning) {
            String filename = m_queue.poll();
            if(filename != null) {
                if(!compressFile(filename)) {
                    System.out.println("[FileCompressorRunnable] Could not compress file " + filename);
                } else {
                    removeFile(filename);
                }          
            } else{
                try {
                    Thread.sleep(5);
                } catch (InterruptedException ex) {
                    Logger.getLogger(FileCompressorRunnable.class.getName()).log(Level.SEVERE, null, ex);
                }
            }
        }            
    }
    
    public void exitThread() {
        keepRunning = false;
        if(m_queue.size() > 0) {
            System.out.println("Compressing " + m_queue.size() + " remaining files...");
        }
        while(m_queue.size() > 0) {
            String filename = m_queue.poll();
            if(!compressFile(filename)) {
                    System.out.println("[FileCompressorRunnable] Could not compress file " + filename);
                } else {
                    removeFile(filename);
            }    
        }
    }
}
