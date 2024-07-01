.. _downstream:

Downstream analysis
===================

Various files output by the MARTi can be utilised for downstream analysis. 

Through the GUI
---------------

The samples page provides an Export Data option that allows the user to download comma or tab separated files of assignments.

BLAST files
-----------

BLAST files can be found inside subdirectories within a MARTi sample directory that are named after the tool and database - e.g. megablast_nt or blastn_card.


The lcaparse directory
----------------------

If using BLAST for assignments, then within a MARTi sample directory, you will find an lcaparse directory that contains a number of useful files.

Files ending in _perread.txt contain assignments for each read. There is one file per processed chunk. Fields are:

#. Read ID
#. NCBI taxon ID
#. NCBI taxon name
#. NCBI taxon level - e.g. 'species'
#. The maximum BLAST hit identity for this read.
#. The mean BLAST hit identity for this read for hits that contributed to this assignment.

The megan directory
-------------------

If using BLAST for assignments, then MARTi will create a megan subdirectory within each sample directory. In here, you will find a series of files named filename_<chunk>_ms0.1pc.cmds and filename_<chunk>_ms0.1pc.sh. The .cmds file is a MEGAN6 command file which can be processed by MEGAN to generate a .rma file. The .sh file gives an example of how you can run the MEGAN command line to process the file. However, at the time of writing, this has hardcoded paths and would need to be updated for a particular user/system. The chunk number indicates how many chunks would be included in the MEGAN file and this is cumulative - for example the chunk file numbered 3 would include all chunks 0-3, the one numbered 9 would include all chunks 0-9 etc. Thus, if you just want to generate a MEGAN file of all chunks, then just use the largest chunk number file, you don't need to generate lots of files.