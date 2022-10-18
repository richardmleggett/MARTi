.. _installation:

Download and installation=========================
Overview
--------
MARTi consists of two main components:

* a back-end which performs the analysis and can be a single desktop/laptop or a high performance cluster.
* a lightweight web-based front-end which allows users to view analysis results.

Make sure you've read the :ref:`intro` and know whether you are installing MARTi in a local configuration (analysis performed on a laptop/desktop) or an HPC configuration (analysis performed on an HPC Cluster).

Both components are contained within a single GitHub repository. You need to copy the MARTi software onto any computer that will be running the MARTi Engine (back-end) or the MARTi GUI (web server). If running in local mode, this will be the same computer. If running in an HPC mode, you will copy the software on to the cluster and also onto the computer where you will be running the web server for the GUI. For simplicity, it is not necessary to separate the Engine from the GUI for installation purposes.

Prerequisites
-------------
In order to run the MARTi Engine (back-end), you also need to install the following on the machine where it will be running:

* BLAST (2.10 or greater) - `download from NCBI <https://blast.ncbi.nlm.nih.gov/Blast.cgi?CMD=Web&PAGE_TYPE=BlastDocs&DOC_TYPE=Download>`_ or, optionally, install with `homebrew on Mac <https://brew.sh>`_.
* BLAST databases - what you'll need will depend on what you're trying to do. But you might want to start with the nt database, `available from the NCBI Blast FTP site <https://ftp.ncbi.nlm.nih.gov/blast/db/>`_.
* NCBI taxonomy - you can `download this from the NCBI taxonomy FTP site <https://ftp.ncbi.nlm.nih.gov/pub/taxonomy/>`_. You need the taxdump files, specifically the nodes.dmp and names.dmp files.
* Java Run Time Environment (OpenJDK 16.0.2 or greater) - the simplest option is to `install OpenJDK <https://openjdk.java.net>`_. Note, on Macs, the documentation for OpenJDK isn't great. Once you download the JDK, you need to move the directory into /Library/Java/VirtualMachines (`as described here <https://java.tutorials24x7.com/blog/how-to-install-openjdk-14-on-mac>`_).

In order to run the MARTi GUI, you also need to install the following on the computer where it will be running:

* node.js (14.17.5 or greater) - you can download it from `nodejs.org <https://nodejs.org/en/download/>`_.

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

Next, you need to create an options file in your home directory that is required by the GUI. An example is provided in the bin directory. To copy it to your home directory, type:

``cp bin/marti_server_options.txt ~/``

This file contains the locations of some important directories and you will need to update these for your system installation:

* MinKNOWRunDirectory - the location of MinKNOW run data.
* MARTiSampleDirectory - the location to put MARTi's analysis directories.
* BlastDatabaseDirectory - the location of blast databases.
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

For the CARD database, you will need to:

1. Download Data `from  the CARD website <https://card.mcmaster.ca/download>`_
2. Create BLAST databases from the FASTA sequences:

``makeblastdb -in nucleotide_fasta_protein_homolog_model.fasta -dbtype nucl``

3. Download the ontology separately `from  the CARD website <https://card.mcmaster.ca/download>`_
4. Place aro.tsv from the ontology in the same directory as the database.
