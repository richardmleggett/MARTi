.. _example:

Example and tutorial
====================

Engine-initiated local analysis
-------------------------------

1. Install MARTi (Engine and GUI) by following the steps on the :ref:`Download and installation <installation>` page.
2. Once installed, download the example reads, custom database, and taxonomy files from `here <https://nbicloud-my.sharepoint.com/:u:/g/personal/peeln_nbi_ac_uk/EUwY6lJhyAtHtuq5FB6vW1YBvlxZ-Vcl-9XUyEMPA0TMJA?e=g7jKty>`__.
3. Extract the downloaded files and navigate to the ``config`` directory. Open ``marti_test.txt`` with a text editor and replace all occurrences of ``/usr`` with the path to your unzipped ``marti_example`` directory.
4. Open a terminal in the ``marti_example`` directory and run the MARTi Engine with the following command::

    marti -config config/marti_test.txt

5. Open another terminal window and launch the MARTi GUI with the following command. Be sure to replace ``/path/to/output`` with the actual path to the ``output`` directory inside your unzipped ``marti_example`` directory::
    
    marti_gui --marti /path/to/output
 
6. Open a browser and navigate to ``localhost:3000``
7. The ``marti_test`` sample should appear in the sample selection table. View the results in the Dashboard by clicking on the Sample ID.

GUI-initiated local analysis
-------------------------------------

The following steps will take you through a local MARTi analysis initiated from the GUI.

1. Install MARTi (Engine and GUI) by following the steps on the :ref:`Download and installation <installation>` page.
2. Once installed, download the example reads, custom database, and taxonomy files from `here <https://nbicloud-my.sharepoint.com/:u:/g/personal/peeln_nbi_ac_uk/EUwY6lJhyAtHtuq5FB6vW1YBvlxZ-Vcl-9XUyEMPA0TMJA?e=g7jKty>`__.
3. Extract the downloaded files.
4. Open a terminal window and run the MARTi GUI with the following command. Be sure to replace ``/path/to/`` with the full paths to directories inside your unzipped ``marti_example`` directory::

    marti_gui --marti /full/path/to/output --taxonomy /full/path/to/databases/taxonomy_6Jul20 --minknow /full/path/to/reads

5. Launch the MARTi GUI by running ``marti_gui`` in a terminal, then open a browser and navigate to GUI’s port ``localhost:3000``.
6. Navigate to the "New analysis" page using the navbar on the lefthand side of the page.
7. Make sure that the Zymo mock data directory is selected in the ``Input data directory`` dropdown.
8. In the ``Analysis processes`` section further down the page, check the ``example`` option to add a blast process. Replace the ``Database`` path with the actual path to the custom zymo database. The process should look something like this::
    
    Name:example_blast
    Program:megablast
    Database:/full/path/to/databases/zymo_mock/zymo_refs_sam.fasta
    MaxE:0.001
    MaxTargetSeqs:25
    UseToClassify

9. Scroll to the bottom of the page and click ``Start analysis`` to initiate the MARTi Engine.
10. At this point you should automatically be redirected to the Samples page. Within a minute or two the Zymo sample will appear in the sample selection table.
