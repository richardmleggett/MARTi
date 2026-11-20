.. _downstream:

Output files and downstream analysis
====================================

This page describes the files MARTi writes, and how to use them in other software.

Output folder layout
--------------------

Each analysis writes to a *run folder*, named after the run, inside the MARTi output directory (the
``MARTiSampleDirectory`` the GUI monitors)::

    marti_output/
        projects.json              optional: see Projects
        MyRun/                     the run folder (SampleDir in the config file)
            ids.json               optional: sample names changed after analysis
            marti/
                MyRun_bc01/        one folder per sample (barcode)
                    sample.json
                    metadata.json
                    tree_ms0.0.json ... tree_ms2.0.json
                    accumulation_ms0.0.json ... accumulation_ms2.0.json
                    assignments_ms0.0.csv ... assignments_ms2.0.csv
                    amr.json
                    alerts.json
                    narrative.json
            lcaparse/              per-read assignments (BLAST)
            megablast_nt/          BLAST results, one folder per BLAST process
            blastn_card/
            megan/                 MEGAN command files (BLAST)
            fastq/, fasta/         read chunks
            logs/

The GUI reads only the files in ``marti/``, so to share results with someone who only needs to view them in the GUI,
copying the ``marti`` folder of each run (with ``ids.json``) is enough.

Results files
-------------

The files in each sample's folder are written by the Engine and updated after every chunk of reads, so they can be
read while a run is in progress. ``_ms`` in a file name gives the LCA minimum abundance cutoff (min support) in percent;
the Engine writes 0, 0.005, 0.05, 0.1, 1 and 2%.

.. list-table::
   :header-rows: 1
   :widths: 28 72

   * - File
     - Contents
   * - ``sample.json``
     - The sample's ID and run, read counts and yields at each stage, analysis status, classification pipeline and
       database, and the MARTi version.
   * - ``tree_ms<cutoff>.json``
     - The taxonomic tree at that cutoff: for each taxon, its NCBI ID, name and rank, the reads (and bases) assigned to
       it directly and including its descendants.
   * - ``assignments_ms<cutoff>.csv``
     - The same assignments as a table, one row per taxon: name, NCBI taxon ID, reads assigned directly and reads
       including descendants. The :ref:`Samples page Export data card <exportdata>` makes more flexible tables across
       several samples.
   * - ``accumulation_ms<cutoff>.json``
     - Taxa accumulation at each rank after each chunk, and (from Engine v1.0.0) the :ref:`diversity measures
       <diversity>` after each chunk.
   * - ``amr.json``
     - Antimicrobial resistance genes found with CARD, with their drug classes, mechanisms and putative host taxa, and
       read counts after each chunk.
   * - ``alerts.json``
     - Messages about the analysis's progress, shown on the Dashboard.
   * - ``metadata.json``
     - Collection metadata: see :ref:`samplemetadata`.
   * - ``narrative.json``
     - The AI narrative analysis, if one has been generated: see :ref:`narrative-analysis`.

Through the GUI
---------------

* The :ref:`Samples page Export data card <exportdata>` downloads the taxonomic assignments of selected samples as a
  comma- or tab-separated table, at any rank and cutoff, with a choice of columns.
* Most plots can be exported as SVG, PNG or JPG, and most also export the data behind them as CSV: for example
  distance matrices and ordination coordinates, diversity measures, correlation matrices and AMR heatmaps.
* *Ask AI* conversations can be downloaded as Markdown files.

BLAST files
-----------

BLAST files can be found inside subdirectories within a MARTi sample directory that are named after the tool and database - e.g. megablast_nt or blastn_card.


The lcaparse directory
----------------------

If using BLAST for assignments, then within a MARTi sample directory, you will find an lcaparse directory that contains a number of useful files.

Files ending in _perread.txt contain assignments for each read. There is one file per processed chunk. Fields are:

#. Read ID
#. NCBI taxon ID
#. NCBI taxon name
#. NCBI taxon level - e.g. 'species'
#. The maximum BLAST hit identity for this read.
#. The mean BLAST hit identity for this read for hits that contributed to this assignment.

The megan directory
-------------------

If using BLAST for assignments, then MARTi will create a megan subdirectory within each sample directory. In here, you will find a series of files named filename_<chunk>_ms0.1pc.cmds and filename_<chunk>_ms0.1pc.sh. The .cmds file is a MEGAN6 command file which can be processed by MEGAN to generate a .rma file. The .sh file gives an example of how you can run the MEGAN command line to process the file. However, at the time of writing, this has hardcoded paths and would need to be updated for a particular user/system. The chunk number indicates how many chunks would be included in the MEGAN file and this is cumulative - for example the chunk file numbered 3 would include all chunks 0-3, the one numbered 9 would include all chunks 0-9 etc. Thus, if you just want to generate a MEGAN file of all chunks, then just use the largest chunk number file, you don't need to generate lots of files.

Using results with AI assistants
--------------------------------

MARTi's MCP server lets AI assistants such as the Claude app analyse your results directly: see :ref:`mcp`.
