.. _continuing:

Continuing after errors
=======================

If something goes wrong with the MARTi Engine - for example it runs out of memory or individual BLAST jobs fail due to insufficient resources - it is possible to restart and MARTi will attempt to carry on from where the problem occurred.

If something goes wrong with the MARTi GUI, you can simply restart the software with the marti_gui command.

Restarting the MARTi Engine
---------------------------

MARTi's default behaviour when presented with a sample directory that contains a partially completed analysis is to attempt to continue from where it previously got to. It will repeat some of the quicker steps it has already carried out - for example read filtering - but it will not repeat time consuming tasks such as BLAST jobs that have already completed.

Before doing this, make sure you have killed the previous MARTi Engine instance. If using SLURM, this means killing the main MARTi process and any child processes (BLAST, Kraken etc.) that may be running. 

Make sure you **do not change any analysis options**, as the results may be unpredictable. For example, if you changed the minimum quality score for the read filtering, the composition of the FASTQ chunks would change and any BLAST jobs would then be out of sync. 

Forcing the MARTi Engine to start from the beginning
---------------------------------------------------- 

If you want to rerun a sample, but you don't want to continue, you can use the -dontcontinue flag to force MARTi to start from scratch.

Re-running the analysis without re-running BLAST
------------------------------------------------

If you just want to re-run the analysis, but without rerunning the BLAST jobs, you can use the -dontrunblast option. This is useful, for example, to change LCA parameters without waiting for the whole analysis to complete.

Note, you must not change any of the pre-filtering options (e.g. ReadFilterMinQ) as this will remove the linkage between FASTQ chunks and BLAST chunks.