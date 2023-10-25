/*
 * Author: Richard M. Leggett
 * © Copyright 2021 Earlham Institute
 */
package uk.ac.earlham.marti.schedule;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.lang.ProcessBuilder.Redirect;
import java.util.ArrayList;
import uk.ac.earlham.marti.core.MARTiEngineOptions;
import uk.ac.earlham.marti.core.MARTiLog;

/**
 * Job scheduler job.
 * 
 * @author Richard M. Leggett
 */
public class SlurmSchedulerJob {
    public final static int STATE_UNKNOWN = 0;
    public final static int STATE_PENDING = 1;
    public final static int STATE_RUNNING = 2;
    public final static int STATE_COMPLETED = 3;
    public final static int STATE_BOOT_FAIL = 4;
    public final static int STATE_CANCELLED = 5;
    public final static int STATE_DEADLINE = 6;
    public final static int STATE_FAILED = 7;
    public final static int STATE_NODE_FAIL = 8;
    public final static int STATE_OOM = 9;
    public final static int STATE_PREEMPTED = 10;
    public final static int STATE_REQUEUED = 11;
    public final static int STATE_RESIZING = 12;
    public final static int STATE_REVOKED = 13;
    public final static int STATE_SUSPENDED = 14;
    public final static int STATE_TIMEOUT = 15;     
        
    private MARTiEngineOptions options;
    private MARTiLog schedulerLog;
    private MARTiLog slurmLog;
    private String[] commands;
    private Process process = null;
    private String logFilename;
    private String errorFilename = null;
    private int internalJobId;
    private ArrayList<Integer> dependencies = new ArrayList<Integer>();
    private boolean dontRunCommand = false;
    private int nCPUs=2;
    private int nTasks = 1;
    private int nNodes = 1;
    private String dependencyString = "";
    private String jobName="";
    private String maxTimeString="6-23:00";
    private String memory = "4G";
    private String partition = "ei-medium";
    private String dependentFilename = null;
    private String flagFilename = null;
    private boolean flagStatus = false;
    private long submittedJobId = 0;
    private int jobState = STATE_UNKNOWN;
    private long completedTime = 0;
    private long dependentTime = 0;
    private long schedulerFileWriteDelay = 30 * 1000; // Allow 30s for file writing to finish before marking job as complete
    private long schedulerFileTimeout = 10 * 60 * 1000; // 10 minutes as ms
    private int resubmissionAttempts = 0;
    private String identifier = "UNKNOWN";
    
    public SlurmSchedulerJob(MARTiEngineOptions o, String id, String name, int i, String[] c, String l, boolean d) {
        options = o;
        identifier = id;
        jobName = name;
        internalJobId = i;
        commands = c;
        logFilename = l;
        dontRunCommand = d;
        
        schedulerLog = options.getJobScheduler().getSchedulerLog();
        SlurmScheduler ss = (SlurmScheduler) options.getJobScheduler();
        slurmLog = ss.getSlurmLog();
    }
    
    // Might implement this version (with separate error log) later
    //public SlurmSchedulerJob(int i, String[] c, String l, String e, boolean d) {
    //    jobId = i;
    //    commands = c;
    //    logFilename = l;
    //    errorFilename = e;
    //    dontRunCommand = d;
    //}
    
    public void setSchedulerFileTimeout(int l) {
        schedulerFileTimeout = l;
    }

    public void setSchedulerFileWriteDelay(int d) {
        schedulerFileWriteDelay = d;
    }
    
    public void setResubmissionAttempts(int n) {
        resubmissionAttempts = n;
    }
        
    public void setDependentFilename(String f) {
        dependentFilename = f;
        flagFilename = f + ".completed";
    }
    
    public void setJobId(int i) {
        internalJobId = i;
    }

    public void run() {
        if (flagFilename != null) {
            File f = new File(flagFilename);
            if (f.exists()) {
                 schedulerLog.println("Removing flag file "+flagFilename);
                 f.delete();
            }
        }
        
        if (dontRunCommand) {
            System.out.println("Not running command for job "+internalJobId);            
            submittedJobId = internalJobId;
            return;
        }         
        
        String commandString = "";
        for (int i=0; i<commands.length; i++) {
            if (commands[i].length() > 0) {
                if (commandString.length() > 0) {
                    commandString += " ";
                }
                commandString+=commands[i];
            }
        }

        if (flagFilename != null) {
            commandString += " ; touch "+flagFilename;
        }
        
        String wrapString = "echo 'SLURM job output' ; ";
        wrapString += "echo '' ; ";
        wrapString += "echo 'Command: "+commandString+"' ; ";
        wrapString += "echo 'Job ID: ${SLURM_JOB_ID}' ; ";
        wrapString += "echo -n 'Start time: ' ; date ; " ;
        wrapString += "echo -n 'Machine: ' ; hostname ; " ;
        wrapString += "printf '%0.s-' {1..70} ; echo '' ; echo ''; ";
        wrapString += commandString;
        wrapString += " ; echo '' ; echo '' ; printf '%0.s-' {1..70} ; ";
        wrapString += "echo '' ; echo '' ; ";
        wrapString += "sstat -j ${SLURM_JOB_ID}.batch ; ";
        wrapString += "echo '' ; echo 'SLURM ended'; ";
        wrapString += "echo -n 'End time: ' ; date";
                
        ArrayList<String> pbCommands = new ArrayList<String>();

//        pbCommands.add("sbatch");
//        pbCommands.add("--job-name="+jobName);
//        pbCommands.add("--nodes="+nNodes);
//        if (dependencyString != "") {
//            pbCommands.add("--dependency=afterok:"+dependencyString); // Optional
//        }
//        pbCommands.add("--cpus-per-task="+nCPUs);
//        pbCommands.add("--ntasks="+nTasks);
//        if (maxTimeString != "") {
//            pbCommands.add("--time="+maxTimeString); // Optional
//        }
//        pbCommands.add("--mem="+memory);
//        pbCommands.add("--output="+logFilename);
//        pbCommands.add("--partition="+partition);
//        pbCommands.add("--constraint=intel"); // Optional
//        pbCommands.add("--wrap=\\\""+commandString+"\\\"");        
             
        pbCommands.add("slurmit");
        pbCommands.add("-J"); pbCommands.add(jobName);
        if (dependencyString != "") {
            pbCommands.add("-a"); pbCommands.add(dependencyString); // Optional
        }
        pbCommands.add("-c"); pbCommands.add(Integer.toString(nCPUs));
        pbCommands.add("-m"); pbCommands.add(memory);
        pbCommands.add("-o"); pbCommands.add(logFilename);
        pbCommands.add("-p"); pbCommands.add(partition);
        pbCommands.add(commandString);
        schedulerLog.println("Command being run... "+commandString);
        schedulerLog.println("CPUs: "+nCPUs+" Memory: "+memory+" Partition: "+partition);
        slurmLog.println("Job "+internalJobId+" command "+commandString);
        
        //System.out.println(pbCommands);
        
        String fullCommand="";
        for (int i=0; i<pbCommands.size(); i++) {
            if (i > 0) {
                fullCommand+=" ";
            }
            
            fullCommand+=pbCommands.get(i);
        }
        //System.out.println(fullCommand);
        //System.out.println("");
        //System.out.println("");
        //System.out.println("Trying..");

        if (nCPUs == 0) {
            schedulerLog.println("ERROR: nCPUs not defined for SLURM job!");
            System.out.println("Error: nCPUs not defined for SLURM job!");
            System.exit(1);
        }
        
        if (memory == null) {
            schedulerLog.println("ERROR: memory not defined for SLURM job!");
            System.out.println("Error: memory not defined for SLURM job!");
            System.exit(1);
        }
        
        if (partition == null) {
            schedulerLog.println("ERROR: partition not defined for SLURM job!");
            System.out.println("Error: partition not defined for SLURM job!");
            System.exit(1);
        }
        
        
        try {
            ProcessBuilder pb = new ProcessBuilder(pbCommands);
            process = pb.start();
            
            //process = Runtime.getRuntime().exec(fullCommand);
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));   
            String line;
            while ((line = reader.readLine()) != null) {
                //System.out.println("Line: "+line);
                if (line.startsWith("Submitted batch job")) {
                    String id = line.substring(20);
                    submittedJobId = Long.parseLong(id);
                    //System.out.println("   got id "+submittedJobId);
                }
            }

            slurmLog.println("Job "+internalJobId+" SLURM id "+submittedJobId);
            
            reader = new BufferedReader(new InputStreamReader(process.getErrorStream()));   
            while ((line = reader.readLine()) != null) {
                System.out.println("Error line: "+line);
            }            
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        } 
    }
    
    public long getSubmittedJobId() {
        return submittedJobId;
    }
    
    public boolean hasFinished() {
        if (dontRunCommand) {
            return true;
        } else {
            return process.isAlive() ? false:true;   
        }
    }
    
    public int getExitValue() {
        int e = 0;
        
        if (process != null) {
            if (process.exitValue() != STATE_COMPLETED) {
                e = process.exitValue();
            }
        }
        
        return e;
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
        return internalJobId;
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
    
    private void parseJobState(String stateString) {
        switch(stateString) {
            case "BOOT_FAIL": jobState = STATE_BOOT_FAIL; break;
            case "CANCELLED": jobState = STATE_CANCELLED; break;
            case "CANCELLED+": jobState = STATE_CANCELLED; break;
            case "COMPLETED": jobState = STATE_COMPLETED; break;
            case "DEADLINE": jobState = STATE_DEADLINE; break;
            case "FAILED": jobState = STATE_FAILED; break;
            case "NODE_FAIL": jobState = STATE_NODE_FAIL; break;
            case "OUT_OF_MEMORY": jobState = STATE_OOM; break;
            case "PENDING": jobState = STATE_PENDING; break;
            case "PREEMPTED": jobState = STATE_PREEMPTED; break;
            case "RUNNING": jobState = STATE_RUNNING; break;
            case "REQUEUED": jobState = STATE_REQUEUED; break;
            case "RESIZING": jobState = STATE_RESIZING; break;
            case "REVOKED": jobState = STATE_REVOKED; break;
            case "SUSPENDED": jobState = STATE_SUSPENDED; break;
            case "TIMEOUT": jobState = STATE_TIMEOUT; break;
            default: jobState = STATE_UNKNOWN; break;
        }
        slurmLog.println("Job "+internalJobId+" state parsed "+jobState);
    }
    
    public int getJobState() {
        slurmLog.println("Job "+internalJobId+" state returned "+jobState);
        return jobState;
    }
    
    public String getJobStateString() {
        String stateString = "UNKNOWN";
        
        switch(jobState) {
            case STATE_BOOT_FAIL: stateString = "BOOT FAIL" ; break;
            case STATE_CANCELLED: stateString = "CANCELLED" ; break;
            case STATE_COMPLETED: stateString = "COMPLETED" ; break;
            case STATE_DEADLINE: stateString = "DEADLINE" ; break;
            case STATE_FAILED: stateString = "FAILED"; break;
            case STATE_NODE_FAIL: stateString = "NODE FAIL"; break;
            case STATE_OOM: stateString = "OOM"; break;
            case STATE_PENDING: stateString = "PENDING" ; break;
            case STATE_PREEMPTED: stateString = "PREEMPTED"; break;
            case STATE_RUNNING: stateString = "RUNNING" ; break;
            case STATE_REQUEUED: stateString = "REQUEUED"; break;
            case STATE_RESIZING: stateString = "RESIZING"; break;
            case STATE_REVOKED: stateString = "REVOKED"; break;
            case STATE_SUSPENDED: stateString = "SUSPENDED"; break;
            case STATE_TIMEOUT: stateString = "TIMEOUT"; break;
            default: stateString = "UNKNOWN"; break;
        }
        
        return stateString;
    }
    
    public void queryJobState() {        
        if (dontRunCommand) {
            jobState=STATE_COMPLETED;
            return;
        }
                
        if (submittedJobId > 0) {
            try {
                String command = "sacct -j "+submittedJobId+" -b -X";
                Process process = Runtime.getRuntime().exec(command);

                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));   
                String line;
                slurmLog.println("Job "+internalJobId+" running "+command);
                while ((line = reader.readLine()) != null) {
                    String[] fields = line.trim().split("\\s+");
                    if (fields[0].compareTo(Long.toString(submittedJobId)) == 0) {
                        slurmLog.println("Job "+internalJobId+"      GOT "+line);
                        String state = fields[1];
                        parseJobState(state);
                        if (jobState == STATE_UNKNOWN) {
                            schedulerLog.println("Error: couldn't parse sacct state '"+state+"'");
                        }
                    } else {
                        slurmLog.println("Job "+internalJobId+" IGNORING "+line);
                    }
                }
                
                if (jobState == STATE_COMPLETED) {
                    // Job can be marked as completed by SLURM, but file writing might not have finished
                    // So we check for dependent file.
                    
                    // Note the time it was first observed as completed
                    if (completedTime == 0) {
                        slurmLog.println("Job "+internalJobId+" marked as COMPLETED by SLURM");
                        completedTime = System.nanoTime();
                    }
                    
                    // If we have a dependent file (e.g. a BLAST file being written)...
                    if (dependentFilename != null) {
                        File dependentFile = new File(dependentFilename);
                        File flagFile = new File(flagFilename);
                        
                        // Does the file exist?
                        if (dependentFile.exists()) {
                            // Note the time it was first observed as existing
                            if (dependentTime  == 0) {
                                slurmLog.println("Job "+internalJobId+" got dependent file");
                                dependentTime = System.nanoTime();
                                
                                // If there is a file write delay set, then we can't have met the delay yet, as
                                // we have only just noticed the dependent file, so we pretend the job is still running.
                                if (schedulerFileWriteDelay > 0) {
                                    jobState = STATE_RUNNING;
                                }
                            } else {
                                // How long is it since we first noticed his file
                                long timeDiff = (System.nanoTime() - dependentTime) / 1000000;
  
                                // Make sure it's at least the write delay (defined above)
                                if (timeDiff >= schedulerFileWriteDelay) {
                                    slurmLog.println("Job "+internalJobId+" completed write delay");
                                    if (flagFile.exists()) {
                                        slurmLog.println("Job "+internalJobId+" got flag filename and deleting");
                                        flagStatus = true;
                                        flagFile.delete();
                                    }
                                } else {
                                    // If write delay not exceeded, then pretend SLURM is still running
                                    slurmLog.println("Job "+internalJobId+" waiting for writes");
                                    jobState = STATE_RUNNING;
                                }
                            }
                        } else {
                            // Can't see dependent file yet. So mark as RUNNING if not timed out.
                            long timeDiff = (System.nanoTime() - completedTime) / 1000000;
                            slurmLog.println("Warning: Job "+internalJobId+" can't see dependent file "+timeDiff+" ms after COMPLETED.");
                            
                            if (flagFile.exists()) {
                                slurmLog.println("Job "+internalJobId+" flag file exists");
                            } else {
                                slurmLog.println("Job "+internalJobId+" flag file missing");
                            }
                            
                            if (timeDiff > (schedulerFileTimeout)) {
                                jobState = STATE_FAILED;
                                slurmLog.printlnLogAndScreen("Error: Job "+internalJobId+" marked as FAILED.");                                
                            } else {
                                jobState = STATE_RUNNING;
                                slurmLog.println("Warning: Job "+internalJobId+" marked as PENDING.");                                
                            }
                        }
                    }
                    
                    // If we still think this is COMPLETED, then log it...
                    if (jobState == STATE_COMPLETED) {
                        options.getProgressReport().recordCompleted(identifier);
                    }
                }

                reader = new BufferedReader(new InputStreamReader(process.getErrorStream()));   
                while ((line = reader.readLine()) != null) {
                    System.out.println("Error line: "+line);
                }
                
                // We may be able to resubmit it and try again...
                if ((jobState == STATE_FAILED) ||
                    (jobState == STATE_BOOT_FAIL) ||
                    (jobState == STATE_CANCELLED) ||
                    (jobState == STATE_DEADLINE) ||
                    (jobState == STATE_FAILED) ||
                    (jobState == STATE_NODE_FAIL) ||
                    (jobState == STATE_OOM) ||
                    (jobState == STATE_TIMEOUT))
                {
                    tryResubmission();
                }
            } catch (Exception e) {
                e.printStackTrace();
                System.exit(1);
            }
        } else {
            System.out.println("Job not submitted");
        }
    }
    
    public boolean checkJobFailed() {
        boolean failed = false;

        if (resubmissionAttempts == 0) {        
            if ((jobState == STATE_FAILED) ||
                (jobState == STATE_BOOT_FAIL) ||
                (jobState == STATE_CANCELLED) ||
                (jobState == STATE_DEADLINE) ||
                (jobState == STATE_FAILED) ||
                (jobState == STATE_NODE_FAIL) ||
                (jobState == STATE_OOM) ||
                (jobState == STATE_TIMEOUT))
            {
                failed = true;
            }        
        }
        
        return failed;
    }
    
    public void setMemory(String m) {
        memory = m;
    }
    
    public void setCPUs(int n) {
        nCPUs = n;
    }
    
    public void setQueue (String s) {
        partition = s;
    }    
    
    public boolean tryResubmission() {
        boolean resubmitted = false;
        
        if (resubmissionAttempts > 0) {
            schedulerLog.println("Job "+internalJobId+" ("+submittedJobId+") failed. Resubmitting.");
            jobState = STATE_UNKNOWN;
            this.run();
            resubmissionAttempts--;
            resubmitted = true;
        } else {
            schedulerLog.println("Job "+internalJobId+" ("+submittedJobId+") failed. No resubmission attempts remaining.");
        }
        return resubmitted;
    }
}

//BF BOOT_FAIL
//Job terminated due to launch failure, typically due to a hardware failure (e.g. unable to boot the node or block and the job can not be requeued).
//CA CANCELLED
//Job was explicitly cancelled by the user or system administrator. The job may or may not have been initiated.
//CD COMPLETED
//Job has terminated all processes on all nodes with an exit code of zero.
//DL DEADLINE
//Job terminated on deadline.
//F FAILED
//Job terminated with non-zero exit code or other failure condition.
//NF NODE_FAIL
//Job terminated due to failure of one or more allocated nodes.
//OOM OUT_OF_MEMORY
//Job experienced out of memory error.
//PD PENDING
//Job is awaiting resource allocation.
//PR PREEMPTED
//Job terminated due to preemption.
//R RUNNING
//Job currently has an allocation.
//RQ REQUEUED
//Job was requeued.
//RS RESIZING
//Job is about to change size.
//RV REVOKED
//Sibling was removed from cluster due to other cluster starting the job.
//S SUSPENDED
//Job has an allocation, but execution has been suspended and CPUs have been released for other jobs.
//TO TIMEOUT
//Job terminated upon reaching its time limit.  