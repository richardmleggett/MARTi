.. _cmdline:

Starting analysis from the command line
=======================================

Running MARTi
-------------

MARTi requires a configuration (or 'config') file in order to begin an analysis. This defines the input dataset, the analysis to be run and the options for the analysis.

To run a MARTi analysis:

``marti -config <file> [options]``

Creating a config file
----------------------

To generate a new config file:

``marti -writeconfig config.txt -rawdir /path/to/my/raw/data/dir -sampledir /path/to/sample/dir -runname MyRun -barcodes 1,2,3 -blast nt,card``

Where:

* ``-rawdir`` specifies a path to a MinKNOW raw data directory (the directory containing fastq_pass).
* ``-sampledir`` specifies a path to a directory where MARTi will write intermediate and final files. If this doesn't exist, it will be created.
* ``-runname`` specifies the name of this run.
* ``-barcodes`` specifies the barcodes being used, or can be left out if the run is not barcoded.
* ``-blast`` provides a comma separated list of the BLAST processes to carry out.

MARTi will generate a config file will default options and these can then be edited in a text editor.

Blast processes
---------------

The default options for blast processes are defined in the file marti_engine_options.txt which, by default, is found in the bin directory. Each blast process defined in this file has a name associated with it and this is the identifier to pass to the -blast option above.