.. _docker:

Using the Docker image
======================

A docker image of NanoOK is provided on `Docker
Hub <https://registry.hub.docker.com/u/richardmleggett/nanook/>`__ which
includes all the dependencies needed to run. First, you need to have
installed the Docker Engine.  Then you can pull the NanoOK image::

  docker pull richardmleggett/nanook

To run NanoOK, the easiest way is to run a shell in the NanoOK image
using::

  docker run -i -t -v /path/to/your/data:/usr/nanopore richardmleggett/nanook bash

From here you will get a prompt from which you can run your NanoOK
commands, for example::

  nanook extract -s /usr/nanopore/YourSample

When you have finished, type ``exit`` to end Docker.

Notes:

-  In the docker run command, you need to map your data directory to the
   Docker image. This is done with the ``-v`` option. In the above
   example, the data on our local machine is in ``/path/to/your/data``
   and this appears in the Docker image as ``/usr/nanopore``, which is
   why we specify ``/usr/nanopore/YourSample`` as the sample directory
   to the nanook command.
-  If you get an error from the docker command, it may be because you
   haven't sudo'd it, or added your user to the docker group -
   see \ `How can I use docker without
   sudo? <http://askubuntu.com/questions/477551/how-can-i-use-docker-without-sudo>`__
