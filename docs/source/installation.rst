.. _installation:

Installation overview
=====================

MARTi consists of two main components:

* a back-end which performs the analysis and can be a single desktop/laptop or a high performance cluster.
* a lightweight web-based front-end which allows users to view analysis results.

Make sure you've read the :ref:`intro` and know whether you are installing MARTi in a local configuration (analysis performed on a laptop/desktop) or an HPC configuration (analysis performed on an HPC Cluster).

You need to copy the MARTi software onto any computer that will be running the MARTi Engine (back-end) or the MARTi GUI (web server). If running in local mode, this will be the same computer. If running in an HPC mode, you will copy the software on to the cluster and also onto the computer where you will be running the web server for the GUI. For simplicity, it is not necessary to separate the Engine from the GUI for installation purposes (you can do, but there's no point).

Because MARTi makes use of a number of other tools (e.g. BLAST, Centrifuge etc.), there are a few dependencies that need to be installed. So we've tried to make this as simple as possible by offering two alternative ways of installing depending on what you're comfortable with:

* :ref:`installationbyhand` from the GitHub repository
* :ref:`installationbioconda`

Click on each of the links above to access the instructions for that method.

Once you've installed the software, you will need to install some genome reference databases on the computer running the MARTi Engine. See the :ref:`BLAST database installation page <blastdbs>`.

Please note, MARTi is unsupported on Windows, as the developers do not have access to it. We develop on macOS and run MARTi on macOS and Linux. The web interface should work fine on Windows browsers, but we have not been able to test the back-end or GUI components.