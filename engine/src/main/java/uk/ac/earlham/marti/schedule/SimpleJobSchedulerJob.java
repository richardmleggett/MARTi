/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.schedule;

import java.io.File;
import java.lang.ProcessBuilder.Redirect;
import java.util.ArrayList;
import uk.ac.earlham.marti.core.MARTiEngineOptions;

/**
 * Job scheduler job.
 * 
 * @author Richard M. Leggett
 */
public class SimpleJobSchedulerJob {
    private MARTiEngineOptions options;
    private String[] commands;
    private Process process = null;
    private String logFilename;
    private String errorFilename = null;
    private int jobId;
    private ArrayList<Integer> dependencies = new ArrayList<Integer>();
    private boolean dontRunCommand = false;
    private boolean completed = false;
    private String identifier = "UNKNOWN";

    public SimpleJobSchedulerJob(MARTiEngineOptions o, String id, String[] c, String l, boolean d) {
        options = o;
        identifier = id;
        jobId = -1;
        commands = c;
        logFilename = l;
        dontRunCommand = d;
    }

    
    public SimpleJobSchedulerJob(MARTiEngineOptions o, String id, int i, String[] c, String l, boolean d) {
        options = o;
        identifier = id;
        jobId = i;
        commands = c;
        logFilename = l;
        dontRunCommand = d;
    }
    
    public SimpleJobSchedulerJob(MARTiEngineOptions o, String id, int i, String[] c, String l, String e, boolean d) {
        options = o;
        identifier = id;
        jobId = i;
        commands = c;
        logFilename = l;
        errorFilename = e;
        dontRunCommand = d;
    }
    
    public void setJobId(int i) {
        jobId = i;
    }

    public void run() {
        if (dontRunCommand) {
            String newCommands[] = {"sleep", "2"};
            String logText = "[ Running ";
            for (int i=0; i<commands.length; i++) {
                logText += commands[i] + " ";
            }
            options.getLog().println(logText);
            commands = newCommands;
            return;
        }         

        try {
            ProcessBuilder pb = new ProcessBuilder(commands);

            if (errorFilename == null) {
                pb.redirectErrorStream(true);
            } else {
                pb.redirectErrorStream(false);
                pb.redirectError(new File(errorFilename));
            }
            pb.redirectOutput(Redirect.appendTo(new File(logFilename)));
            process = pb.start();
            //process = Runtime.getRuntime().exec(this.getCommand());
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
        
    }
    
    public boolean hasFinished() {
        boolean rc = false;
        
        if (dontRunCommand) {
            rc = true;
        } else {
            rc = process.isAlive() ? false:true;   
        }

        // Only first time we notice this has finished do we record the completion.
        if ((rc == true) && (completed == false)) {
            if (getExitValue() == 0) {
                completed = true;
                options.getProgressReport().recordCompleted(identifier);
            } else {
                System.out.println("ERROR: getExitValue for job "+jobId+" ("+identifier+") is "+getExitValue());
                System.out.println("Results are unpredictable...");
            }
            
            // TODO:
            // What do we do if getExitValue doesn't return 0?
        }
        
        return rc;
    }
    
    public int getExitValue() {
        if (process != null) {
            //System.out.println("EXIT VALUE was "+process.exitValue());
            //System.out.println("LOG WAS "+logFilename);
            return process.exitValue();
        } else {
            return 0;
        }
    }
    
    public String getCommand() {
        String command = "";
        
        for (int i=0; i<commands.length; i++) {
            if (i > 0) {
                command = command + " ";
            }
            
            command = command + commands[i];
        }
        return command;
    }
    
    public int getId() {
        return jobId;
    }
    
    public String getLog() {
        return logFilename;
    }

    public void addDependency(int jobid) {
        dependencies.add(jobid);
    }
    
    public int getNumberOfDependencies() {
        return dependencies.size();
    }
    
    public int getDependency(int n) {
        if (n < dependencies.size()) {
            return dependencies.get(n);
        }
        
        return 0;
    }
}
