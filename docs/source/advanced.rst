.. _advanced:

Advanced features
=================

Re-running analysis without running BLAST
-----------------------------------------

Sometimes you might want to re-run the analysis without re-running all the BLAST jobs - for example, if there is a new version of MARTi, or if you change some of the analysis parameters. You can do this using the -dontrunblast option on the command line when launching the MARTi Engine.

When you do this, the BLAST results will not be overwritten but other files will. If you want to keep the previous analysis results for comparison, the easiest way is to make a copy of the marti and lcaparse directories within the sample directory. This options will also work for Centrifuge and Kraken2 processes.

