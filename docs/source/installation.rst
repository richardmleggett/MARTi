.. _installation:

Download and installation=========================
Overview
--------

MARTi is undergoing some final testing before we release the code to the world.

However, if you would like to get access to a test version before we release it, please email richard.leggett@earlham.ac.uk.
MARTi consists of two main components:

* a back-end which performs the analysis and can be a single desktop/laptop or a high performance cluster.
* a lightweight web-based front-end which allows users to view analysis results.
MARTi Engine (back-end) installation------------------------------------Coming soon.MARTi GUI (front-end) installation----------------------------------The only pre-requistite is to have node.js installed. `You can download it from nodejs.org <https://nodejs.org/en/download/>`_.Then to install the MARTi GUI:``git clone <URL>``

The server requires an options file which is placed in your home directory. An example is provided. To copy it to your home directory, type:

``cp marti_server_options.txt ~/``

This file contains the locations of some important directories and you will need to update these for your system installation:

* MinKNOWRunDirectory - the location of MinKNOW run data.
* MARTiSampleDirectory - the location to put MARTi's analysis directories.
* BlastDatabaseDirectory - the location of blast databases.
* TaxonomyDirectory - the location of NCBI taxonomy data.

To start the GUI server, type

``node UI/index.js``

**macOS**

On some versions of macOS, you may get an error about fsevents.node the first time you run it:

.. image:: images/fseventserror.png
  :width: 250
  :alt: MARTi local analysis configuration
  :align: center

To get rid of this, you need to go the Security & Privacy preferences window and click "Allow Anyway" next to the fsevents.node error.

.. image:: images/fseventssecurity.png
  :width: 550
  :alt: MARTi local analysis configuration
  :align: center

After this, you may get an additional error:

.. image:: images/fseventsdeveloper.png
  :width: 250
  :alt: MARTi local analysis configuration
  :align: center

Click on "Open" and hopefully that will be macOS's last warning!
