.. _example:

Example and tutorial====================

Docker example
--------------

The following steps will take you through analysis of a small set of nanopore reads from the Zymo Microbial Mock Community using the MARTi docker image.

#. A docker image of MARTi, which includes all of the required dependencies, is provided on `Docker Hub <https://hub.docker.com/r/nedpeel/marti/>`__. To get started, ensure that you have installed the `Docker Engine <https://docs.docker.com/engine/install/>`__ on your system.
#. Once installed, you can pull the MARTi image by running the following command::

  docker pull nedpeel/marti

#. Download the sample reads, custom database, and taxonomy files from `here <https://nbicloud-my.sharepoint.com/:u:/g/personal/peeln_nbi_ac_uk/EUwY6lJhyAtHtuq5FB6vW1YBvlxZ-Vcl-9XUyEMPA0TMJA?e=g7jKty>`__.
#. Unzip the downloaded files and run the MARTi Docker image with the following command (replacing ``/path/to/marti_example/`` with the actual path to the unzipped marti_example directory)::

  docker run -i -t -p 3000:3000 -v /path/to/marti_example/databases:/usr/databases -v /path/to/marti_example/reads:/usr/reads -v /path/to/marti_example/output:/usr/output nedpeel/marti

#. Launch the MARTi GUI by running ``marti_gui`` in the docker terminal, then open a browser and navigate to GUI’s port ``localhost:3000``.
#. Navigate to the "New analysis" page using the navbar on the lefthand side of the page.
#. Make sure that the Zymo mock data directory is selected in the ``Input data directory`` dropdown.
#. In the ``Analysis processes`` section further down the page, check the ``zymo_mock`` option to add a blast process to the custom zymo database.
#. Scroll to the bottom of the page and click ``Start analysis`` to initiate the MARTi Engine.
#. At this point you should automatically be redirected to the Samples page. Within a minute or two the Zymo sample will appear in the sample selection table.
