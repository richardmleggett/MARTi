Change history
==============

**1.33 (19 June 2018)**

- Added ngmlr support.

** 1.32 (18 June 2018)**

- Added minimap2 support.

**1.25 (7 June 2017)**

-  Added GraphMap support.
-  Fix for trailing / on -f option.
-  Fix for barcoding bug.

**1.22 (5 May 2017)**

-  Fixes for comparison mode.
-  Slurmit script added for NanoOK RT.

**1.20 (13 Apr 2017)**

-  Better Albacore support.
-  New -minquality option for filtering pass/fail reads.

**1.17 (30 Mar 2017)**

-  Detection of albacore directory structure.

**1.15 (17 Mar 2017)**

-  Auto-detection of directory structure - barcodes, batch\_ etc. 

**1.14 (14 Mar 2017)**

-  Updates to support MinKNOW 1.4.2 directory structure.
-  Fixed bug in R graph plotting.
-  Better error checking in R scripts.
-  Option to merge reads into single file.

**0.95 (2 Nov 2016)**

-  Fixed issues with 1D report generation.
-  Added warnings about .sizes file.
-  New real-time watcher option for BAMBI project. Currently, this is
   not general purpose, but will be enabled in future release.
-  Created new Dockerfile and re-built Docker images.

**0.79 (7 Oct 2016)**

-  Added support for barcoded runs.

**0.76 (7 Sep 2016)**

-  Fixed issue with badly formatted reference files.
-  Fixed issue with grid.edit in R.
-  More descriptive error messages.
-  Option for 1D only processing for new rapid kit.
-  Template only and complement only options.
-  Updated help text.

**0.72 (13 May 2016)**

-  New option to store original FAST5 path in FASTA output file (for
   nanopolish).
-  Fixed issue with alignerparams not being passed through.
-  Enabled extraction of 2D only reads.
-  Better detection of old/new style directory structure.
-  Various bug fixes.

**0.62 (3 Dec 2015)**

-  Fixed extract bug that had been introduced with previous version.

**0.61 (27 Nov 2015)**

-  Had to roll back from using HDF5 library due to cross-platform JNI
   issues.
-  Otherwise, all functionality as of 0.60, including use of
   NANOOK\_DIR.

**0.60 (26 Nov 2015)**

-  Added support for Metrichor changes to FAST5 output format.
-  Added support for multiple analyses in 1 file
   (i.e. /Analyses/Basecall\_2D\_XXX). New option -basecallindex to
   support it, but default behaviour is latest (highest numbered
   analysis).
-  Moved from using HDF5 command line tool to using HDF5 Java library.
-  Replaced the NANOOK\_SCRIPT\_DIR environment variable with a
   NANOOK\_DIR one and slightly changed installation process.
