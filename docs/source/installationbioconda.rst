.. _installationbioconda:

Installation with bioconda
==========================

This page describes how to install MARTi with ``mamba``, a CLI tool to manage conda environments.

.. note::

   The bioconda package is currently MARTi 0.9.33, which is older than the version described in this documentation.
   An updated package will be released soon. Until then, install MARTi from GitHub (see :ref:`installationbyhand`) if
   you need the newer GUI features, such as the Compare page tabs, diversity measures and the :ref:`AI features <ai>`.

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


