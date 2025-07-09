/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.schedule;

import java.io.File;
import java.lang.ProcessBuilder.Redirect;
import java.util.ArrayList;
import uk.ac.earlham.marti.core.MARTiAlert;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.MARTiLog;

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
    private MARTiLog schedulerLog;
    private long lastStatusReport = System.nanoTime();
    private long processStartTime = System.nanoTime();
    
    public SimpleJobSchedulerJob(MARTiEngineOptions o, MARTiLog log, String id, String[] c, String l, boolean d) {
        options = o;
        schedulerLog = log;
        identifier = id;
        jobId = -1;
        commands = c;
        logFilename = l;
        dontRunCommand = d;
    }

    
    public SimpleJobSchedulerJob(MARTiEngineOptions o, MARTiLog log, String id, int i, String[] c, String l, boolean d) {
        options = o;
        schedulerLog = log;
        identifier = id;
        jobId = i;
        commands = c;
        logFilename = l;
        dontRunCommand = d;
    }
    
    public SimpleJobSchedulerJob(MARTiEngineOptions o, MARTiLog log, String id, int i, String[] c, String l, String e, boolean d) {
        options = o;
        schedulerLog = log;
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
        // Check completed already?
        // If not, check if we've got dontrunblast selected
        if (options.continueFromPrevious()) {
            if (options.getProgressReport().checkCompleted(identifier)) {
                options.getLog().printlnLogAndScreen("Job "+identifier+" already completed, so not rerunning.");
                dontRunCommand = true;
                return;
            } else {           
                options.getLog().println("Job "+identifier+" not completed, so will be submitting.");
            }
        }

        // Record start time
        processStartTime = System.nanoTime();
        
        if (dontRunCommand) {
            String newCommands[] = {"sleep", "10"};
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
        boolean processFinished = false;
                
        if (dontRunCommand) {
            processFinished = true;
        } else {
            processFinished = process.isAlive() ? false:true;   
        }

        if (!processFinished) {
            long timeNow = System.nanoTime();
            long timeSinceReport = (timeNow - lastStatusReport) / 1000000000; // convert to secs
            if (timeSinceReport >= 300) {
                long timeSinceStart = (timeNow - processStartTime) / 1000000000; // convert to secs
                long timeMins = timeSinceStart / 60;
                schedulerLog.println("Job "+jobId+" still running after "+timeSinceStart+"s ("+timeMins+"m)");
                lastStatusReport = timeNow;
            }
        }
        
        // Only first time we notice this has finished do we record the completion.
        if ((processFinished == true) && (completed == false)) {
            if (getExitValue() == 0) {
                completed = true;
                options.getProgressReport().recordCompleted(identifier);
                options.getLog().println("hasFinished "+identifier);
            } else {
                options.getLog().printlnLogAndScreen("ERROR: getExitValue for job "+jobId+" ("+identifier+") is "+getExitValue());
                options.getLog().printlnLogAndScreen("Results are unpredictable...");
                options.addAlertOnlyOnce(new MARTiAlert(MARTiAlert.TYPE_ERROR, "ERROR: getExitValue for job "+jobId+" ("+identifier+") is "+getExitValue() + " - results are unpredictable"));
            }
            
            // TODO:
            // What do we do if getExitValue doesn't return 0?
        }
        
        return processFinished;
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
