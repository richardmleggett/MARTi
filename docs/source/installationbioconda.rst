.. _installationbioconda:

Installation with bioconda
==========================

This page describes how to install MARTi with ``mamba``, a CLI tool to manage conda environments.

Install Mamba
-------------

The recommended method for installing mamba is to install miniforge.

On macOS, you can install miniforge with Homebrew by running::

  brew install miniforge

For other methods, see `here <https://github.com/conda-forge/miniforge>`__.

Channel configuration
---------------------

Once you've installed miniforge, you need to run the following commands to configure the conda channels::

  conda config --add channels defaults
  conda config --add channels bioconda
  conda config --add channels conda-forge
  conda config --set channel_priority strict

Install MARTi
-------------

Create a new environment called marti and install MARTi::

  mamba create -n marti marti

Activate the marti environment::

  mamba activate marti

You should now be able to use the ``marti`` and ``marti_gui`` commands!

MARTi GUI configuration
-----------------------

The MARTi GUI requires a configuration file called ``marti_engine_options.txt``. This file will contain paths to important directories, such as the locations of input sequencing data and MARTi Engine output, and you will need to update these for your system installation.

You can generate a template ``marti_engine_options.txt`` file in your home directory by running the following command::

  marti -writeoptions ~/marti_engine_options.txt

You should then update the paths for your installation.

* TaxonomyDirectory - the location of NCBI taxonomy data (i.e. the directory containing nodes.dmp and names.dmp).
* MinKNOWRunDirectory - path to the directory containing sequencing runs or read data to be analysed by MARTi. The sequence data for each run directory within the MinKNOWRunDirectory should be in fastq format, or gzipped fastq, inside a directory called ``fastq_pass``, ``pass``, or ``fastq``. You can also specify multiple data locations with a semicolon delimited list ``/path/to/minknow/data;/path/to/minknow/data2``
* MARTiSampleDirectory - the location of a directory that contains, or will contain, MARTi output data. The MARTi GUI will monitor this directory for results to display. The GUI can monitor multiple locations if multiple paths are provided in a semicolon delimited list.
* Analysis processes - if you want to initiate MARTi analysis from the GUI, you will also need to define analysis processes in this file. The template includes examples of Blast, Centrifuge, and Kraken2 processes. Processes defined here will be available on the GUI's New Analysis page.

The MARTi GUI should automatically detect the ``marti_engine_options.txt`` if it is present in the home directory. However, you can also specify an alternative engine options file::

  marti_gui --options [/path/to/marti_engine_options.txt]
