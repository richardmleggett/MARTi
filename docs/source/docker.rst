.. _docker:

Using the Docker image
======================

A docker image of MARTi, which includes all of the required dependencies, is provided on `Docker Hub <https://hub.docker.com/r/nedpeel/marti/>`__. First, you need to have installed the `Docker Engine <https://docs.docker.com/engine/install/>`__.  Then you can pull the MARTi image::

  docker pull nedpeel/marti

Run the MARTi docker image using::

  docker run -i -t -p 3000:3000 -v /path/to/your/databases:/usr/databases -v /path/to/your/sequencing_data:/usr/reads -v /path/to/your/marti_output:/usr/output nedpeel/marti

From here you will get a prompt from which you can run your MARTi commands, for example::

  marti -config <file> [options]

When you have finished, type ``exit`` to end Docker.

A small set of reads, custom database, and taxonomy files are available for testing the MARTi installation and can be downloaded from `here <https://nbicloud-my.sharepoint.com/:u:/g/personal/peeln_nbi_ac_uk/EUwY6lJhyAtHtuq5FB6vW1YBvlxZ-Vcl-9XUyEMPA0TMJA?e=g7jKty>`__.

Unzip the downloaded file and run the MARTi docker image using the following command::

  docker run -i -t -p 3000:3000 -v /path/to/marti_example/databases:/usr/databases -v /path/to/marti_example/reads:/usr/reads -v /path/to/marti_example/output:/usr/output -v /path/to/marti_example/config:/usr/config nedpeel/marti

Test MARTi by running the following command::

  marti -config /usr/config/marti_test.txt

The MARTi GUI can be launched by running: ``marti_gui``. To view the GUI, open a browser and navigate to GUI’s port: ``localhost:3000``

Notes:

-  In the docker run command, you need to map your database, data, and output
   directories to the Docker image. This is done with the ``-v`` option. In the above
   example, the databases and taxonomy directories on our local machine are in ``/path/to/your/databases``
   and this appears in the Docker image as ``/usr/databases``.
-  If you get an error from the docker command, it may be because you
   haven't sudo'd it, or added your user to the docker group -
   see \ `How can I use docker without
   sudo? <http://askubuntu.com/questions/477551/how-can-i-use-docker-without-sudo>`__
