.. _gui:

The MARTi GUI
=============

The MARTi GUI is a browser-based interface for viewing and interacting with analyses. The GUI consists of four pages:

#. **Samples** - for selecting and loading analysed samples into the **Dashboard** and **Compare** pages.
#. **Dashboard** - for viewing analysis results of a single sample.
#. **Compare** - for comparing the results from multiple samples.
#. **New analysis** - for configuring and initiating local **MARTi Engine** analyses.


The Samples page
----------------

.. image:: images/GuiSamples.png
  :width: 800
  :alt: MARTi GUI samples page
  :align: center

The Samples page allows users to select and load available samples into the Dashboard and Compare analysis modes. A sample can be loaded into the Dashboard mode by clicking on its sample ID or the dashboard icon next to it. To compare samples, select them with the checkboxes in the first column of the table and then navigate to the Compare page.


The Dashboard page
------------------

.. image:: images/GuiDashboard.png
  :width: 800
  :alt: MARTi GUI dashboard page
  :align: center

The Dashboard page is for viewing analysis results of an individual MARTi sample. This could be a single nanopore sequencing run or an individual barcoded sample within a run. The sample can be one that was previously analysed by the **MARTi Engine**, or one that is currently being analysed. In the latter event, the information on the page will update in real time when new analysis information is made available by the Engine.

The Dashboard content is flexible and dependent on the available analyses for the selected sample. When all available analyses are run for a sample, the page can feature up to 8 cards (content containers):

#. Sample card – Displays information about the selected sample such as its ID, the analysis pipeline used, analysis status, and total number of basecalled reads.
#. Taxa table card – A table of taxa with hits at the selected taxonomic rank and lowest common ancestor cut off value.
#. Donut card – Interactive donut plot of classified reads at selected filter levels.
#. Tree card – Customisable tree plot representing all of the analysed reads.
#. Treemap card – An interactive treemap plot.
#. Taxa accumulation card – Line chart showing taxa discovered over time, or reads analysed.
#. AMR Table card – A table of antimicrobial-resistance (AMR) genes found in the sample.
#. Walkout Analysis card – Donut plot showing results from AMR gene walkout analysis.


The Compare page
----------------

.. image:: images/GuiCompare.png
  :width: 800
  :alt: MARTi GUI compare page
  :align: center

The Compare page enables multiple samples to be explored together, including samples being analysed in real time.

This page features four cards:

#. Samples card – Allows the user to sort the selected comparison samples by ID, sequencing date, yield, reads analysed, and by manually dragging them.
#. Stacked bar card – A stacked bar chart for viewing the taxonomic composition of the selected samples side-by-side.
#. Multi-donut card – A multi-donut plot for comparing the composition of assigned reads between samples.
#. Taxa accumulation card – A multi-line chart representing taxa discovery rates of each sample over the course of analysis, with the x-axis showing either reads sampled or time analysed.


.. _startinganalysis:

New analysis page
-----------------

.. image:: images/GuiNew.png
  :width: 800
  :alt: MARTi GUI new analysis page
  :align: center

The new analysis page allows users to generate a configuration file and start a local **MARTi Engine** analysis from the **MARTi GUI**.

The MARTi Engine requires a configuration (or ‘config’) file to start a new analysis of a whole run or selected barcoded samples. The config file provides the details for the analysis to be performed by the MARTi Engine (see :ref:`here for config file format information<configfiles>`). When running MARTi in an HPC configuration, a config file with default options can be :ref:`generated via the command line<cmdline>` and then edited with a text editor if required. In local configuration, you can use the command line method or the new analysis page of the MARTi GUI to generate a config file and start analysis.

The new analysis page is comprised of several cards that together house all the input fields and buttons required to generate a config file and start a new analysis. Two of the fields rely on information provided by the user in the marti_engine_options.txt file:

* Input data directory – this dropdown is automatically populated with samples available for MARTi analysis found within the MinKNOW run directory specified by the user.
* MARTi output directory – a dropdown of paths being monitored by the GUI’s server for MARTi output. Users specify this path, or a semicolon-separated list of paths, as MARTiSampleDirectory in the engine options file. The path selected in the dropdown will be used as the output location for the new analysis.

An example of how to start a new analysis from the new analysis page can be found :ref:`here<example>`.

Options
-------


.. image:: images/GuiOptionsGeneral.png
  :width: 800
  :alt: MARTi GUI general options
  :align: center

The general options menu for the GUI can be accessed by clicking the cog icon in the top right-hand corner of the page. Alternative colour palettes for the GUI can be found in this menu.

The Dashboard and Compare pages have additional page-specific options bars fixed to the bottom of the header bar. On the Dashboard page, this houses three buttons:

1.	the *Assignments* button - for downloading MARTi’s taxonomic assignments in CSV format for downstream analysis.
2.	*LCA minimum abundance cut-off* selector – for displaying the sample’s taxonomic assignment data at one of four LCA minimum abundance cut-off values (0, 0.1, 1, or 2%).
3.	*Taxonomic rank* dropdown - allows users to view the plots at different taxonomic levels.

.. image:: images/GuiOptionsPlot.png
  :width: 800
  :alt: MARTi GUI plot options
  :align: center

Many of the plots also have plot-specific options that can be accessed via the three vertical dots menu icon in the top right-hand corner of the plot’s card.

Taxonomic ranks
---------------

To make it easier for users to filter organisms by their taxonomic ranks within the MARTi GUI, the NCBI taxonomic ranks have been simplified into 10 categories. The following table shows how the NCBI ranks are mapped to MARTi's simplified ranks.

+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| MARTi rank | Rank no. | NCBI ranks                                                                                                        |
+============+==========+===================================================================================================================+
| No rank    | 0        | clade, no rank                                                                                                    |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| Domain     | 1        | superkingdom                                                                                                      |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| kingdom    | 2        | kingdom, subkingdom, superphylum                                                                                  |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| Phylum     | 3        | phylum, subphylum, superclass                                                                                     |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| Class      | 4        | class, cohort, infraclass, subclass, subcohort, superorder                                                        |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| Order      | 5        | order, infraorder, parvorder, suborder, superfamily                                                               |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| Family     | 6        | family, subfamily, subtribe, tribe                                                                                |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| Genus      | 7        | genus, section, series, species group, species subgroup, subgenus, subsection                                     |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| Species    | 8        | species, genotype, isolate                                                                                        |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+
| Subspecies | 9        | subspecies, biotype, forma, forma specialis, morph, pathogroup, serogroup, serotype, strain, subvariety, varietas |
+------------+----------+-------------------------------------------------------------------------------------------------------------------+

