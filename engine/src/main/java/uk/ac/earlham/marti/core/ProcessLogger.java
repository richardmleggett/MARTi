/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.core;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileWriter;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.lang.ProcessBuilder.Redirect;
import java.util.ArrayList;

/**
 * Execute a system process and log result to a file
 * 
 * @author Richard M. Leggett
 */
public class ProcessLogger {
    private boolean writeStdio = true;
    private boolean writeStderr = true;
    private boolean writeHeadings = true;

    public ArrayList getCommandOutput(String[] command, boolean stdin, boolean stderr) {
        ArrayList<String> outputLines = new ArrayList<String>();
        
        try {
            Process p = Runtime.getRuntime().exec(command);
            // ?? p.waitFor();
            
            if (stdin) {
                BufferedReader stdInput = new BufferedReader(new InputStreamReader(p.getInputStream()));
                String s = null;
                while ((s = stdInput.readLine()) != null) {            
                    outputLines.add(s);
                }
            }
            
            if (stderr) {
                BufferedReader stdError = new BufferedReader(new InputStreamReader(p.getErrorStream()));
                String s = null;
                while ((s = stdError.readLine()) != null) {            
                    outputLines.add(s);
                }
            }            
        } catch (Exception e) {
            System.out.println("\nProcessLogger exception:");
            e.printStackTrace();
            System.exit(1);
        } 
            
        return outputLines;
    }    

    public void runCommandToLog(String[] command, MARTiLog log) {
        ArrayList<String> response = getCommandOutput(command, true, true);
        for (int i=0; i<response.size(); i++) {
            log.println(response.get(i));
        }        
    }    
    
    public void runCommand(String[] command) {
        ArrayList<String> response = getCommandOutput(command, true, true);
        for (int i=0; i<response.size(); i++) {
            System.out.println(response.get(i));
        }        
    }
    
    public ArrayList<String> getCommandOutput(String command, boolean stdin, boolean stderr) {
        ArrayList<String> outputLines = new ArrayList<String>();
        
        try {
            Process p = Runtime.getRuntime().exec(command);
            // ?? p.waitFor();
            
            if (stdin) {
                BufferedReader stdInput = new BufferedReader(new InputStreamReader(p.getInputStream()));
                String s = null;
                while ((s = stdInput.readLine()) != null) {            
                    outputLines.add(s);
                }
            }
            
            if (stderr) {
                BufferedReader stdError = new BufferedReader(new InputStreamReader(p.getErrorStream()));
                String s = null;
                while ((s = stdError.readLine()) != null) {            
                    outputLines.add(s);
                }
            }            
        } catch (Exception e) {
            System.out.println("ProcessLogger exception:");
            e.printStackTrace();
            System.exit(1);
        } 
            
        return outputLines;
    }
    
    public void runCommand(String command) {
        ArrayList<String> response = getCommandOutput(command, true, true);
        for (int i=0; i<response.size(); i++) {
            System.out.println(response.get(i));
        }        
    }
    
    public ArrayList checkCommand(String command) {
        ArrayList<String> outputLines;
        boolean isOk = true;
        
        try {
            Process p = Runtime.getRuntime().exec(command);
            BufferedReader stdInput = new BufferedReader(new InputStreamReader(p.getInputStream()));
            BufferedReader stdError = new BufferedReader(new InputStreamReader(p.getErrorStream()));
            String s = null;

            outputLines = new ArrayList<String>();
            while ((s = stdInput.readLine()) != null) {            
                outputLines.add(s);
            }
            while ((s = stdError.readLine()) != null) {            
                outputLines.add(s);
            }
        } catch (Exception e) {
            outputLines = null;
        }
        
        return outputLines;
    }
    
    private synchronized void writeLog(Process p, String command, String logFilename, boolean fAppend) {
        try {         
            PrintWriter pw = new PrintWriter(new FileWriter(logFilename, fAppend)); 
            BufferedReader stdInput = new BufferedReader(new InputStreamReader(p.getInputStream()));
            BufferedReader stdError = new BufferedReader(new InputStreamReader(p.getErrorStream()));

            if (fAppend && writeHeadings) {
                pw.println("");
                pw.println("---");
                pw.println("");
            }

            if (writeHeadings) {
                pw.println("Running "+command);
            }

            // read the output from the command
            if (writeHeadings) {
                pw.println("");
                pw.println("Stdout:");
            }
            
            if (writeStdio) {
                String s = null;
                while ((s = stdInput.readLine()) != null) {
                    pw.println(s);
                }
            }

            // read any errors from the attempted command
            if (writeHeadings) {
                pw.println("");
                pw.println("Stderr:");
            }
            
            if (writeStderr) {
                String s = null;
                while ((s = stdError.readLine()) != null) {
                    pw.println(s);
                }       
            }
            
            pw.close();
        } catch (Exception e) {
            System.out.println("ProcessLogger exception:");
            e.printStackTrace();
            System.exit(1);
        }  
    }
    
    public void runAndLogCommand(String command, String logFilename, boolean fAppend) {
        try {         
            Process p = Runtime.getRuntime().exec(command); 
            writeLog(p, command, logFilename, fAppend);
            p.waitFor();
        } catch (Exception e) {
            System.out.println("ProcessLogger exception:");
            e.printStackTrace();
            System.exit(1);
        }        
    }   
    
    public void setWriteFormat(boolean headings, boolean io, boolean err) {
        writeHeadings = headings;
        writeStdio = io;
        writeStderr = err;
    }    
}
