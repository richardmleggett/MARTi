.. _installation:

Download and installation=========================
Overview
--------
MARTi consists of two main components:

* a back-end which performs the analysis and can be a single desktop/laptop or a high performance cluster.
* a lightweight web-based front-end which allows users to view analysis results.

Make sure you've read the :ref:`intro` and know whether you are installing MARTi in a local configuration (analysis performed on a laptop/desktop) or an HPC configuration (analysis performed on an HPC Cluster).

Both components are contained within a single GitHub repository. You need to copy the MARTi software onto any computer that will be running the MARTi Engine (back-end) or the MARTi GUI (web server). If running in local mode, this will be the same computer. If running in an HPC mode, you will copy the software on to the cluster and also onto the computer where you will be running the web server for the GUI. For simplicity, it is not necessary to separate the Engine from the GUI for installation purposes.

If you would rather use a pre-installed image, we also provide a :ref:`Docker image <docker>`.

Prerequisites
-------------
In order to run the MARTi Engine (back-end), you also need to install the following on the machine where it will be running:

* **BLAST (2.10 or greater)** - `download from NCBI <https://blast.ncbi.nlm.nih.gov/Blast.cgi?CMD=Web&PAGE_TYPE=BlastDocs&DOC_TYPE=Download>`_ or, optionally, install with `homebrew on Mac <https://brew.sh>`_. On Ubuntu, using apt-get may install an older version. In which case, it may be easiest to download executables from the NCBI link above.
* **BLAST databases** - what you'll need will depend on what you're trying to do. But you might want to start with the nt database, `available from the NCBI Blast FTP site <https://ftp.ncbi.nlm.nih.gov/blast/db/>`_.
* **NCBI taxonomy** - you can `download this from the NCBI taxonomy FTP site <https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/>`_. You need the taxdump files, specifically the nodes.dmp and names.dmp files.
* **Java Run Time Environment (OpenJDK 16.0.2 or greater)** - the simplest option is to `install OpenJDK <https://openjdk.java.net>`_. Note, on Macs, the documentation for OpenJDK isn't great. Once you download the JDK, you need to move the directory into /Library/Java/VirtualMachines (`as described here <https://java.tutorials24x7.com/blog/how-to-install-openjdk-14-on-mac>`_).

In order to run the MARTi GUI, you also need to install the following on the computer where it will be running:

* **Node.js (14.17.5 or greater)** - you can download it from `nodejs.org <https://nodejs.org/en/download/>`_. NPM, a package manager for Node.js packages, is included with the Node.js installation and therefore doesn't need to be installed separately. On Ubuntu, using apt-get may install an older version. In which case, see `the Installation instructions here <https://github.com/nodesource/distributions/blob/master/README.md#debinstall>`_.

If you are only running the GUI on a particular computer, you do not need to install the Engine dependencies. If you are only running the engine on a particular computer, you do not need to install the GUI dependencies. If you are running both the Engine and the GUI on a single computer, then you need to install both sets of dependencies on that computer.

Downloading
-----------

The easiest way to keep up to date with MARTi is to clone the GitHub repository. To do this, go to the command line, change into a convenient directory and then type:

``git clone https://github.com/richardmleggett/MARTi.git``

Alternatively, you can `visit GitHub <https://github.com/richardmleggett/MARTi>`_ and download a zip file with everything in it.
MARTi Engine (back-end) installation------------------------------------Having copied the MARTi software onto the computer or cluster being used for the back-end, you need to perform a couple of additional actions.

The marti script inside the bin directory is used to launch MARTi Engine. Open this in a text editor and change line 6 to point to the location of the bin directory containing MARTiEngine.jar, e.g.:

``MARTI_DIR=/Users/leggettr/Documents/github/MARTiEngine/bin``

Then move this marti script into somewhere in your search path. For Macs, this might be /usr/local/bin - e.g.:

``mv bin/marti /usr/local/bin``

Finally, you need to create an options file in your home directory that is required by the Engine. An example is provided in the bin directory. To copy it to your home directory, type:

``cp bin/marti_engine_options.txt ~/``

More details on what this file contains is provided in :ref:`cmdline`.

You can then check the MARTi Engine is installed by typing:

``marti -h``

If you see the help text, all is ok.

MARTi GUI (front-end) installation----------------------------------Having copied the MARTi software onto the computer or cluster being used for the back-end, you need to perform a couple of additional actions.
The marti_gui script inside the bin directory is used to launch MARTi GUI. Open this in a text editor and change line 4 to point to the location of the ``gui`` directory e.g.:

``MARTI_DIR=/Users/leggettr/Documents/github/MARTi/gui``

Then move this marti_gui script into somewhere in your search path. For Macs, this might be /usr/local/bin - e.g.:

``mv bin/marti_gui /usr/local/bin``

The GUI also requires the ``marti_engine_options.txt``. If you've already copied this to your home directory for the MARTi Engine then you can skip this step. Otherwise, copy it to your home directory, type:

``cp bin/marti_engine_options.txt ~/``

This file contains the locations of some important directories and you will need to update these for your system installation:

* MinKNOWRunDirectory - the location of the directory containing read data for runs to be analysed by MARTi. The data for each run within the MinKNOWRunDirectory should be in the MinKNOW output directory format. For example, if your MinKNOWRunDirectory is set to the following: ``/Users/peeln/Documents/minknow`` and you want to analyse a run called ``Flongle_run_11102022`` then the full path to the pass read data for that sample should look something like this: ``/Users/peeln/Documents/minknow/Flongle_run_11102022/Flongle_run_11102022/20221011_1041_X2_AMT909_e26da2dd/fastq_pass``
* MARTiSampleDirectory - the location of a directory that contains MARTi output data. The MARTi GUI will monitor this directory for results to display.
* TaxonomyDirectory - the location of NCBI taxonomy data (i.e. the directory containing nodes.dmp and names.dmp).

Then install the GUI server dependencies by running the following command from inside the gui/UI/ directory (e.g. ``cd gui/UI``) :

``npm install``

To start the GUI server, type

``marti_gui [port]``

Where port is an optional parameter to specify the port number to be used. Ignore this if unsure. The default port number is 3000.

To view the GUI, open a browser and navigate to GUI's port. For example, if using the default port enter the following into the address bar:

``localhost:3000``

**macOS differences**

On some versions of macOS, you may get an error about fsevents.node the first time you run it:

.. image:: images/fseventserror.png
  :width: 250
  :alt: MARTi local analysis configuration
  :align: center

To get rid of this, you need to go the Security & Privacy preferences window and click "Allow Anyway" next to the fsevents.node error.

.. image:: images/fseventssecurity.png
  :width: 550
  :alt: MARTi local analysis configuration
  :align: center

After this, you may get an additional error:

.. image:: images/fseventsdeveloper.png
  :width: 250
  :alt: MARTi local analysis configuration
  :align: center

Click on "Open" and hopefully that will be macOS's last warning!

BLAST database installation
---------------------------

MARTi classifies reads with a combination of BLAST and its own Lowest Common Ancestor (LCA) algorithm. Users can provide a pre-built BLAST database, such as the nucleotide sequence database (nt) or Prokaryotic RefSeq database, or build and use a custom BLAST database.

The easiest way to obtain the latest pre-built BLAST databases is by running the update_blastdb.pl script that comes with the BLAST+ command line tool (Perl is also a prerequisite). Documentation for this script can be seen by running
the script without any arguments.

To view all available BLAST databases, run the following command:

``update_blastdb.pl --showall``

To download one of these pre-built BLAST databases, run the script followed by any relevant options and the name(s) of the BLAST databases to download. For example:

``update_blastdb.pl --decompress ref_prok_rep_genomes``

If you want to make a custom BLAST database from FASTA files, you can use the makeblastdb tool distributed with the BLAST+ command line application. Before running the command you need to ensure that each sequence has a unique identifier and that you have created an additional file that maps these identifiers to NCBI taxids (`see here <https://www.ncbi.nlm.nih.gov/books/NBK569841/>`_ for more). Then you can build your database with a command similar to this::

  makeblastdb -in zymo_mock.fasta -parse_seqids -blastdb_version 5 -title "Zymo mock" -dbtype nucl -taxid_map taxid_map.txt


If specified in the configuration file, the MARTi Engine will also BLAST reads to the Comprehensive Antibiotic Resistance Database (CARD) for AMR gene identification. To use the CARD database, you will need to:

1. Download both the CARD Data and CARD Ontology files `from  the CARD website <https://card.mcmaster.ca/download>`_
2. Extract the contents of each file into a single directory.
3. Create a BLAST database from the FASTA sequences:

``makeblastdb -in nucleotide_fasta_protein_homolog_model.fasta -dbtype nucl``
