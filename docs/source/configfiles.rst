.. _configfiles:

Config file format
==================

Each time you run a MARTi analysis on a sequencing run, you need to specify a config file which provides the details of the analysis to be performed.

This config file is generated by the MARTi launcher front-end (Desktop) or GUI (cluster/HPC).

The following table specifies the meaning of the parameters in the file. Keywords in **bold** are mandatory, others are optional.

Sample and global settings
--------------------------

.. csv-table::
   :header: "Keyword", "Example", "Meaning"
   :file: table1.csv
   :delim: tab

Pre-filtering settings
----------------------

.. csv-table::
   :header: "Keyword", "Example", "Meaning"
   :file: table2.csv
   :delim: tab

LCA classification settings
---------------------------

These Lowest Common Ancestor settings apply to BLAST results (see below).

.. csv-table::
   :header: "Keyword", "Example", "Meaning"
   :file: table3.csv
   :delim: tab

BLAST processes
---------------

You can run multiple BLAST processes. Each begins with the Keyword BlastProcess.

.. csv-table::
   :header: "Keyword", "Example", "Meaning"
   :file: table4.csv
   :delim: tab

Example
-------

Example file::

 SampleName:BAMBI_1D_19092017_MARTi
 RawDataDir:/Users/leggettr/Documents/Datasets/BAMBI_1D_19092017_MARTi
 SampleDir:/Users/leggettr/Documents/Projects/MARTiTest/BAMBI_1D_19092017_MARTi
 ProcessBarcodes:
 BarcodeId1:SampleNameHere
 
 Scheduler:local
 LocalSchedulerMaxJobs:4
 
 InactivityTimeout:10
 StopProcessingAfter:50000000
 
 TaxonomyDir:/Users/leggettr/Documents/Databases/taxonomy_6Jul20
 LCAMaxHits:20
 LCAScorePercent:90
 LCAMinIdentity:60
 LCAMinQueryCoverage:0
 LCAMinCombinedScore:0
 LCAMinLength:50
 
 ConvertFastQ 

 ReadsPerBlast:8000
 
 ReadFilterMinQ:9
 ReadFilterMinLength:500
 
 BlastProcess
     Name:nt
     Program:megablast
     Database:/Users/leggettr/Documents/Databases/nt_30Jan2020_v5/nt
     TaxaFilter:/Users/leggettr/Documents/Datasets/bacteria_viruses.txt
     MaxE:0.001
     MaxTargetSeqs:25
     RunMeganEvery:0
     BlastThreads:4
 
 BlastProcess
     Name:card
     Program:blastn
     Database:/Users/leggettr/Documents/Databases/card/nucleotide_fasta_protein_homolog_model.fasta
     MaxE:0.001
     MaxTargetSeqs:100
     BlastThreads:1

