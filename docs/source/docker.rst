.. _docker:

Using the Docker image
======================

A docker image of MARTi, which includes all of the required dependencies, is provided on `Docker Hub <https://hub.docker.com/r/nedpeel/marti/>`__. To get started, ensure that you have installed the `Docker Engine <https://docs.docker.com/engine/install/>`__ on your system. Once installed, you can easily pull the MARTi image by running the following command::

  docker pull nedpeel/marti

This will fetch the latest version of the MARTi image and make it available on your system for use. To run the MARTi Docker image, execute the following command::

  docker run -i -t -p 3000:3000 -v /path/to/your/databases:/usr/databases -v /path/to/your/sequencing_data:/usr/reads -v /path/to/your/marti_output:/usr/output nedpeel/marti

This will start the container and present you with a prompt where you can enter your MARTi commands. For example, to run the MARTi Engine, use the following command::

  marti -config <file> [options]

To exit the Docker container, simply type ``exit``.

If you want to test the MARTi installation, you can use a set of sample reads, custom database, and taxonomy files available for download from `here <https://nbicloud-my.sharepoint.com/:u:/g/personal/peeln_nbi_ac_uk/EUwY6lJhyAtHtuq5FB6vW1YBvlxZ-Vcl-9XUyEMPA0TMJA?e=g7jKty>`__.

After downloading the files, unzip them and run the MARTi Docker image with the following command::

  docker run -i -t -p 3000:3000 -v /path/to/marti_example/databases:/usr/databases -v /path/to/marti_example/reads:/usr/reads -v /path/to/marti_example/output:/usr/output -v /path/to/marti_example/config:/usr/config nedpeel/marti

Once the container is running, test MARTi by running the following command::

  marti -config /usr/config/marti_test.txt

The MARTi GUI can be launched by running ``marti_gui``. To view the GUI, open a browser and navigate to GUI’s port ``localhost:3000``.

Notes:

-  In the docker run command, you need to map your database, data, and output
   directories to the Docker image. This is done with the ``-v`` option. In the above
   example, the databases and taxonomy directories on our local machine are in ``/path/to/your/databases``
   and this appears in the Docker image as ``/usr/databases``.
-  If you get an error from the docker command, it may be because you
   haven't sudo'd it, or added your user to the docker group -
   see \ `How can I use docker without
   sudo? <http://askubuntu.com/questions/477551/how-can-i-use-docker-without-sudo>`__
