.. _docker:

Using the MARTi Docker image
============================

A docker image of MARTi, which includes all of the required dependencies, is provided on `Docker Hub <https://hub.docker.com/r/nedpeel/marti/>`__. To get started, ensure that you have installed the `Docker Engine <https://docs.docker.com/engine/install/>`__ on your system. Once installed, you can easily pull the MARTi image by running the following command::

  docker pull nedpeel/marti

This will fetch the latest version of the MARTi image and make it available on your system for use. To run the MARTi Docker image, execute the following command::

  docker run -i -t -p 3000:3000 -v /path/to/your/databases:/usr/databases -v /path/to/your/sequencing_data:/usr/reads -v /path/to/your/marti_output:/usr/output nedpeel/marti

This will start the container and present you with a prompt where you can enter your MARTi commands. For example, to run the MARTi Engine, use the following command::

  marti -config <file> [options]

To exit the Docker container, simply type ``exit``.

Notes:

-  In the docker run command, you need to map your database, data, and output
   directories to the Docker image. This is done with the ``-v`` option. In the above
   example, the databases and taxonomy directories on our local machine are in ``/path/to/your/databases``
   and this appears in the Docker image as ``/usr/databases``.
-  If you get an error from the docker command, it may be because you
   haven't sudo'd it, or added your user to the docker group -
   see \ `How can I use docker without
   sudo? <http://askubuntu.com/questions/477551/how-can-i-use-docker-without-sudo>`__

Test data
---------

If you want to test the MARTi installation, you can use a set of sample reads, custom database, and taxonomy files available for download from `here <https://nbicloud-my.sharepoint.com/:u:/g/personal/peeln_nbi_ac_uk/EUwY6lJhyAtHtuq5FB6vW1YBvlxZ-Vcl-9XUyEMPA0TMJA?e=g7jKty>`__.

After downloading the files, unzip them and run the MARTi Docker image with the following command (replacing ``/path/to/marti_example/`` with the actual path to the unzipped marti_example directory)::

  docker run -i -t -p 3000:3000 -v /path/to/marti_example/databases:/usr/databases -v /path/to/marti_example/reads:/usr/reads -v /path/to/marti_example/output:/usr/output -v /path/to/marti_example/config:/usr/config nedpeel/marti

Once the container is running, start the analysis with MARTi Engine running in the background with the following command::

  marti -config /usr/config/marti_test.txt > marti_out.txt &

Launch the MARTi GUI by running ``marti_gui``, open a browser and navigate to GUI’s port ``localhost:3000``.

Persistent options file
-----------------------

The ``marti_engine_options.txt`` file is used by both the Engine and the GUI. Users can set paths to their taxonomy directory and define blast processes, making MARTi config generation easier (see :ref:`cmdline` for more information about creating a config file and defining Blast processes). This file is also used to set the read data and MARTi output locations for the GUI to monitor (see :ref:`installation`). However, changes made to the options file within the Docker (``~/marti_engine_options.txt``) will be lost on exit. For a persistent options file, copy the file to your local machine, map the directory containing the file to the Docker image, and then run the Engine and GUI with the ``-options`` flag followed by the path to your options file. For example::

  marti -config <file> -options /path/to/marti_engine_options.txt [other options]

  marti_gui -options /path/to/marti_engine_options.txt


GUI only
--------

To view previously analysed samples, the MARTi Docker image can be used to run only the GUI component of the tool. When running the Docker for this purpose, you only need to specify the MARTi output directory as a volume::

  docker run -i -t -p 3000:3000 -v /path/to/marti_example/output:/usr/output nedpeel/marti

Once the container is running, launch the MARTi GUI by running ``marti_gui``. To view the GUI, open a browser and navigate to GUI’s port ``localhost:3000``.
