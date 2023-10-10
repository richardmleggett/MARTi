.. _example:

Example and tutorial====================

Engine-initiated local analysis
-------------------------------

1. Install MARTi (Engine and GUI) by following the steps on the :ref:`Download and installation <installation>` page.
2. Once installed, download the example reads, custom database, and taxonomy files from `here <https://nbicloud-my.sharepoint.com/:u:/g/personal/peeln_nbi_ac_uk/EUwY6lJhyAtHtuq5FB6vW1YBvlxZ-Vcl-9XUyEMPA0TMJA?e=g7jKty>`__.
3. Extract the downloaded files and navigate to the ``config`` directory. Open ``marti_test.txt`` with a text editor and replace ``/usr`` with the path to your unzipped ``marti_example`` directory.
4. Open ``~/marti_engine_options.txt`` in a text editor and update the ``TaxonomyDir``, ``MinKNOWRunDirectory``, and ``MARTiSampleDirectory`` paths (replacing ``/path/to/marti_example/`` with the actual path to your unzipped marti_example directory)::

    TaxonomyDir:/path/to/marti_example/databases/taxonomy_6Jul20
    MinKNOWRunDirectory:/path/to/marti_example/reads
    MARTiSampleDirectory:/path/to/marti_example/output

5. Open a terminal in the ``marti_example`` directory and run the MARTi Engine with the following command::

    marti -config config/marti_test.txt

6. Open another terminal window and launch the MARTi GUI by running ``marti_gui``, then open a browser and navigate to ``localhost:3000``.
7. The ``marti_test`` sample should appear in the sample selection table. View the results in the Dashboard by clicking on the Sample ID.

Docker - GUI-initiated local analysis
-------------------------------------

The following steps will take you through a local MARTi analysis of a small set of nanopore reads from the Zymo Microbial Mock Community using the docker image.

1. A docker image of MARTi, which includes all of the required dependencies, is provided on `Docker Hub <https://hub.docker.com/r/nedpeel/marti/>`__. To get started, ensure that you have installed the `Docker Engine <https://docs.docker.com/engine/install/>`__ on your system.
2. Once installed, you can pull the MARTi image by running the following command::

    docker pull nedpeel/marti

3. Download the sample reads, custom database, and taxonomy files from `here <https://nbicloud-my.sharepoint.com/:u:/g/personal/peeln_nbi_ac_uk/EUwY6lJhyAtHtuq5FB6vW1YBvlxZ-Vcl-9XUyEMPA0TMJA?e=g7jKty>`__.
4. Unzip the downloaded files and run the MARTi Docker image with the following command (replacing ``/path/to/marti_example/`` with the actual path to the unzipped marti_example directory)::

    docker run -i -t -p 3000:3000 -v /path/to/marti_example/databases:/usr/databases -v /path/to/marti_example/reads:/usr/reads -v /path/to/marti_example/output:/usr/output nedpeel/marti

5. Launch the MARTi GUI by running ``marti_gui`` in the docker terminal, then open a browser and navigate to GUI’s port ``localhost:3000``.
6. Navigate to the "New analysis" page using the navbar on the lefthand side of the page.
7. Make sure that the Zymo mock data directory is selected in the ``Input data directory`` dropdown.
8. In the ``Analysis processes`` section further down the page, check the ``zymo_mock`` option to add a blast process to the custom zymo database.
9. Scroll to the bottom of the page and click ``Start analysis`` to initiate the MARTi Engine.
10. At this point you should automatically be redirected to the Samples page. Within a minute or two the Zymo sample will appear in the sample selection table.
