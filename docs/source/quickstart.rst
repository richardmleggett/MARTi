.. _quickstart:

Quick start
===========

This page gets MARTi running on a laptop or desktop (macOS or Linux) in a few steps: install it with ``mamba``,
analyse a small example dataset, and look at the results in the GUI. Each step links to the pages with the full
details.

.. note::

   The bioconda package is currently older than the version described in this documentation (bioconda has MARTi
   0.9.33; this documentation describes 1.0.0). It runs analyses and shows them in the GUI, but it does not yet have
   the newer GUI features such as the Compare page tabs, diversity measures and the :ref:`AI features <ai>`. An updated
   package will be released soon. Until then, if you need those features, install MARTi from the GitHub repository
   instead (see :ref:`installationbyhand`); the rest of this page works the same way.

1. Install mamba
----------------

If you do not have ``mamba`` yet, install `Miniforge <https://github.com/conda-forge/miniforge>`__, which includes it.
On macOS with Homebrew::

    brew install miniforge

Then set up the conda channels (you only need to do this once)::

    conda config --add channels bioconda
    conda config --add channels conda-forge
    conda config --set channel_priority strict

2. Install MARTi
----------------

Create an environment called ``marti`` containing MARTi and the tools it uses (BLAST, Java and Node.js), then
activate it::

    mamba create -n marti marti
    mamba activate marti

Check that the two MARTi commands work::

    marti -help
    marti_gui --help

Each prints a list of its options. Remember to run ``mamba activate marti`` in each new terminal before
using MARTi. See :ref:`installationbioconda` for more about this installation.

3. Get the example data
-----------------------

Download the example dataset from `here <https://nbicloud-my.sharepoint.com/:u:/g/personal/peeln_nbi_ac_uk/EUwY6lJhyAtHtuq5FB6vW1YBvlxZ-Vcl-9XUyEMPA0TMJA?e=g7jKty>`__
and unzip it. The ``marti_example`` folder contains reads from a sequenced mock community, a small BLAST database of
the mock community's genomes, the NCBI taxonomy files, and a config file.

Open ``config/marti_test.txt`` in a text editor and replace every ``/usr`` with the full path of your
``marti_example`` folder, so that MARTi can find the reads, database and taxonomy.

4. Run an analysis
------------------

In a terminal, go to the ``marti_example`` folder and start the MARTi Engine::

    cd /path/to/marti_example
    marti -config config/marti_test.txt

The Engine analyses the reads in chunks and writes its results to the ``output`` folder as it goes. You do not need to
wait for it to finish before looking at the results.

5. Look at the results
----------------------

In a second terminal (remember ``mamba activate marti``), start the GUI, giving it the ``output`` folder::

    marti_gui --marti /path/to/marti_example/output

Open http://localhost:3000 in a web browser. The ``marti_test`` sample appears on the Samples page. Click the
dashboard icon next to its name to see its results; they update while the Engine is still running.

See :ref:`gui` for everything the GUI can do, and :ref:`tutorial` for a guided tour that compares several samples.

6. Analyse your own data
------------------------

To analyse your own reads you need:

* **Reference databases** - the NCBI taxonomy and one or more BLAST databases, such as nt for taxonomic
  classification and CARD for antimicrobial resistance genes. See :ref:`blastdbs`. Kraken2 and Centrifuge can be used
  instead of BLAST on less powerful computers.
* **An options file** - a ``marti_engine_options.txt`` file that tells MARTi where the taxonomy and databases are, and
  which output folders the GUI should show. See :ref:`configfiles` and :ref:`guioptionsfile`.
* **A config file for each run** - written by ``marti -writeconfig``, or by the GUI's
  :ref:`New analysis page <startinganalysis>`. See :ref:`cmdline` and :ref:`configfiles`. Add a ``Metadata`` block
  if you want to record where and when samples were collected (see :ref:`metadata`).

Then start the analysis with ``marti -config``, as above, and point the GUI at your output folder. If you run the
Engine on an HPC cluster, see :ref:`running` and :ref:`jobschedulers`.
