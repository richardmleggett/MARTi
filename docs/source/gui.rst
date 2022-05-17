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
