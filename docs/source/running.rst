.. _running:

Running MARTi
=============

As described in the introduction, there are two common configurations for MARTi:

#. a local analysis configuration where both the MARTi Engine and the MARTi GUI are installed on a single laptop/desktop.
#. an HPC configuration, where the MARTi Engine resides on an HPC and the MARTi GUI resides somewhere else - e.g. on a laptop/desktop.

In both situations, the GUI looks the same, but the method of initiating the MARTi Engine is slightly different.

In either situation, the machine running the MARTi Engine needs to have access to the drive where the sequencer is outputting reads. Typically this is done by mapping the drive over a network. But in certain situations, it may be achieved by rsync'ing data from the sequencer to the analysis machine.

Key concept
-----------

In summary, MARTi works as follows:

#. The MARTi Engine accesses read data in nanopore run directories, specifically the fastq_pass directory from MinKNOW or the fastq directory from guppy.
#. The MARTi Engine writes analysis results to a MARTi run directory, named for the run.
#. The MARTi GUI anticipates that MARTi run directories are contained within a single parent directory. The GUI scans this parent directory to look for run analyses which are displayed within the GUI.

Initiating analyses in the local configuration
----------------------------------------------

In the local configuration, analyses can be initiated through a page in the MARTi GUI. They can also be initiated from the command line, as with the HPC configuration.

Initiating analyses in the HPC configuration
--------------------------------------------

In an HPC configuration, analyses can not be initiated through the MARTi GUI, but have to be initiated from the command line when logged into the HPC. This is because many HPC implementations do not permit users to easily install software which has the necessary access to perform this.

See :ref:`cmdline`.

rsync'ing or mapping?
---------------------

The simplest approach to access a remote sequencer is to map its drive across the network. However, if you have an unreliable network connection, this will result in stalled analysis. Therefore, the safest option may be to rsync the raw data from the sequencer to the analysis machine. Then if the network fails and the drive disappears, the analysis will not fail. When the network reappears, the rsync can be resumed.

Note: the timeout value set may mean that MARTi Engine stops processing a run if a long time passes before the network link and rsync is reestablished.

Connecting a Mk1C in a local configuration
------------------------------------------

A Mk1C can be connected to the analysis laptop through a number of means which are described in the Mk1C manual. This includes via a wired or wireless network connection to the same network and through its hotspot.

Once connected, you need to ensure that the Mk1C is sharing its data directory over samba. This is accomplished through the settings options in the Mk1C's user interface.

The data drive then needs to be mapped on the analysis laptop. On MacOS, this can be achieved through the finder by selecting Go->Connect to Server and specifying smb://mc-XXXXXX (where mc-XXXXXX is the Mk1C machine name). On Linux, there are a number of ways this can be achieved and if you are unfamiliar, it is probably worth a quick google. For example, `see this link <https://tecadmin.net/mounting-samba-share-on-ubuntu/>`_.
