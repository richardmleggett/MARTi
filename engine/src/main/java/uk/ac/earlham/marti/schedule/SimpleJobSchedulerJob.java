/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.schedule;

import java.io.File;
import java.lang.ProcessBuilder.Redirect;
import java.util.ArrayList;

/**
 * Job scheduler job.
 * 
 * @author Richard M. Leggett
 */
public class SimpleJobSchedulerJob {
    private String[] commands;
    private Process process = null;
    private String logFilename;
    private String errorFilename = null;
    private int jobId;
    private ArrayList<Integer> dependencies = new ArrayList<Integer>();
    private boolean dontRunCommand = false;

    public SimpleJobSchedulerJob(String[] c, String l, boolean d) {
        jobId = -1;
        commands = c;
        logFilename = l;
        dontRunCommand = d;
    }

    
    public SimpleJobSchedulerJob(int i, String[] c, String l, boolean d) {
        jobId = i;
        commands = c;
        logFilename = l;
        dontRunCommand = d;
    }
    
    public SimpleJobSchedulerJob(int i, String[] c, String l, String e, boolean d) {
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
            System.out.print("[ Running ");
            for (int i=0; i<commands.length; i++) {
                System.out.print(commands[i] + " ");
            }
            System.out.println("]");
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
        if (dontRunCommand) {
            return true;
        } else {
            return process.isAlive() ? false:true;   
        }
    }
    
    public int getExitValue() {
        if (process != null) {
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
