.. _cmdline:

Starting analysis
=================

If you're running in a local configuration, you can start new analyses from :ref:`within the MARTI GUI<startinganalysis>`, or from the command line.

If you're running in an HPC configuration, you must start analyses from the command line on your HPC system.

Starting MARTi from the command line
------------------------------------

MARTi requires a configuration (or 'config') file in order to begin an analysis. This defines the input dataset, the analysis to be run and the options for the analysis.

To run a MARTi analysis:

``marti -config <file> [options]``

Where possible additional options include:

* ``-options`` to specify the location of a marti_engine_options.txt file to use instead of the files in the default locations.
* ``-queue`` to set the default queue (partition) when using SLURM. Can also be set in config file.
* ``-dontcompressblast`` will stop compression of BLAST files once parsed. 
* ``-dontrunblast`` will avoid re-running BLAST and will use the previously generated BLAST files. 
* ``-dontrunnt`` will avoid re-running BLAST nt and will use the previously generated BLAST files. BLAST processes other than 'nt' will still be run.


Creating a config file
----------------------

To generate a new config file:

``marti -writeconfig config.txt -rawdir /path/to/my/raw/data/dir -sampledir /path/to/sample/dir -runname MyRun -barcodes 1,2,3 -blast nt,card``

Where:

* ``-rawdir`` specifies a path to a MinKNOW raw data directory (the directory containing fastq_pass directory or fastq directory for guppy run separately).
* ``-sampledir`` specifies a path to a directory where MARTi will write intermediate and final files. If this doesn't exist, it will be created.
* ``-runname`` specifies the name of this run.
* ``-barcodes`` specifies the barcodes being used, or can be left out if the run is not barcoded.
* ``-blast`` provides a comma separated list of the BLAST processes to carry out.

MARTi will generate a config file will default options and these can then be edited in a text editor.

Blast process configuration
---------------------------

The default options for blast processes are defined in the file marti_engine_options.txt which, by default, is found in the MARTi bin directory. Each blast process defined in this file has a name associated with it and this is the identifier to pass to the -blast option above. The options defined in this file will be the default ones written to the new config file.

MARTi looks for marti_engine_options.txt in three locations:

1. In the current directory.
2. If not in the current directory, in the user's home directory (i.e. ~/marti_engine_options.txt).
3. If not in the user's home directory, in the directory containing the MARTiEngine.jar, which unless you have changed things will be the bin directory.

Alternatively, you can specify the location of the file using the -options command line option. This is useful when running the docker image.