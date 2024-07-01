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

If using BLAST for assignments, then Within a MARTi sample directory, you will find an lcaparse directory that contains a number of useful files.

Files ending in _perread.txt contain assignments for each read. There is one file per processed chunk. Fields are:

#. Read ID
#. NCBI taxon ID
#. NCBI taxon name
#. NCBI taxon level - e.g. 'species'
#. The maximum BLAST hit identity for this read.
#. The mean BLAST hit identity for this read for hits that contributed to this assignment.
