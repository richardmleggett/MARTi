.. _tutorial:

Tutorial: exploring and comparing samples
=========================================

This tutorial walks through a typical look at a set of MARTi results: finding samples, checking one sample on the
Dashboard, and then comparing samples by composition, diversity, sample relationships and antimicrobial resistance
(AMR). It takes about 20 minutes.

It uses the example results that come with MARTi, so you do not need to run an analysis first. They are nine samples
analysed with BLAST against nt and CARD:

* five infant gut samples, whose run names start with ``BAMBI``;
* four river water samples from the River Yare in Norfolk, whose run names start with ``MARC``. These are two samples
  (F1 and F2), each analysed twice, with and without a control (``with_control`` and ``no_control``).

.. raw:: html

   <video controls preload="metadata" width="800" style="max-width:100%" poster="_static/marti_gui_tour_poster.jpg" src="_static/marti_gui_tour.mp4"></video>

The video above shows the main steps.

Before you start
----------------

You need MARTi installed (see :ref:`quickstart`) and the example results, which are in the ``gui/output`` folder of the
`MARTi GitHub repository <https://github.com/richardmleggett/MARTi>`__. If you installed MARTi with mamba, download
the repository with::

    git clone https://github.com/richardmleggett/MARTi.git

(or download it as a zip file from GitHub). Then start the GUI, giving it the example results::

    marti_gui --marti /path/to/MARTi/gui/output

and open http://localhost:3000 in a web browser.

.. note::

   Parts of this tutorial need MARTi 1.0.0 or later: the Compare page tabs, the diversity measures and the sample and
   taxon relationship plots. Until the bioconda package has been updated, install MARTi from GitHub
   (:ref:`installationbyhand`) to follow all the steps.

1. Find samples
---------------

The :ref:`Samples page <guisamples>` lists all nine samples.

#. Type ``run:MARC`` in the search box and press Enter. Only the four river samples are left. Searches like this
   become *tokens*; you can combine several, and a sample must match all of them.
#. Clear the search with the × at the end of the box, then type ``taxon:Escherichia`` and press Enter. This lists the
   samples in which any reads were assigned to *Escherichia* or below it.
#. Clear the search again.

See :ref:`guisamples` for the other search tokens.

2. Look at one sample
---------------------

#. Click the dashboard icon next to ``BAMBI_P8_1D_19092017`` to open it on the :ref:`Dashboard <guidashboard>`.
#. The *Reads* card shows how many reads were analysed and classified.
#. In the options bar below the page title, choose *Genus* from the rank menu. The *Taxa Table* and the plots now
   show genera. The top genera in this sample include *Klebsiella* and *Proteus*.
#. Try the other plots in the Taxonomy tab, such as the *Treemap* and the *Sankey* diagram, and look at the
   *Diversity* and *AMR* tabs.

The *LCA minimum abundance cutoff* in the options bar sets how much evidence a taxon needs before it is shown; reads
from taxa below the cutoff are moved up to a higher taxon. The default, 0.1%, suits most purposes. See :ref:`faqs`.

3. Choose samples to compare
----------------------------

#. Go back to the Samples page (*Samples* in the bar on the left).
#. Tick the checkbox in the table header to select every sample, and click *Compare samples*. The
   :ref:`Compare page <guicompare>` opens with all nine samples.
#. Click *Show samples* in the *Samples* card. In the *Group* column, type ``Infant gut`` for the five ``BAMBI``
   samples and ``River`` for the four ``MARC`` samples.

Groups are used throughout the Compare page: to colour points, and to show results per group. If your samples have
location or date metadata, *Set groups from metadata* fills the groups in for you (see :ref:`metadata`). The groups
are saved in your browser, so they are still there next time.

4. Compare composition
----------------------

Make sure the rank in the options bar is *Genus*, then look at the Taxonomy tab:

* The *Stacked bar* shows that the two groups are very different. The infant gut samples are dominated by a few
  genera, mostly *Bifidobacterium*, with *Enterococcus*, *Enterobacter*, *Klebsiella* and others in some samples.
  The river samples contain many more genera, led by freshwater bacteria such as *Flavobacterium*, *Limnohabitans*
  and *Aquirufa*.
* The *Taxa heatmap* shows the same data as a grid. Open its *Settings* to choose which taxa to show, for example your
  own list of taxon IDs.
* *Taxon trends* plots chosen taxa across the samples.

5. Compare diversity
--------------------

Open the *Diversity* tab.

* *Diversity across samples* shows one measure for each sample. Set *Plot measure* to *Shannon (H′)*: the river
  samples are more diverse than the infant gut samples.
* Set *View* to *Assigned groups* to show the mean and range for each group instead.
* The samples were sequenced to different depths, which affects how many taxa are found. *Rarefied richness* compares
  the number of taxa at the same depth for every sample.
* *Taxa accumulation* shows how each sample's diversity built up during its run. Curves that level off suggest that
  further sequencing would find few new taxa.

See :ref:`diversity` for how the measures are calculated.

6. See which samples are similar
--------------------------------

Open the *Sample relationships* tab.

* In the *Sample ordination (PCoA)*, each point is a sample, and samples with similar profiles are close together.
  Open *Settings* and set *Colour samples by* to *Assigned group*: the river samples cluster tightly together, well
  apart from the infant gut samples, which are more spread out because they differ more from one another.
* The two analyses of each river sample (with and without the control) sit almost on top of each other.
* In *Settings*, change the *Distance method* to *Aitchison*. This gives more weight to less abundant taxa; the groups
  still separate.
* *Sample clustering (UPGMA)* shows the same relationships as a tree, and *Sample distances* as a heatmap.

7. Look at taxa that vary together
----------------------------------

The *Taxon relationships* tab finds taxa whose abundances rise and fall together across samples, and taxa that occur
together. With only nine samples from two very different environments, most strong associations simply reflect the
difference between gut and river, so treat these plots as a starting point and check interesting pairs with
*Inspect*. The *Shared taxa (UpSet)* plot shows which taxa are found in which combinations of samples, or of
groups.

8. Compare antimicrobial resistance genes
-----------------------------------------

Open the *AMR* tab. The *AMR heatmap* shows the resistance genes found by searching reads against the CARD database.
Open its *Settings*, set *Plot hits by* to *Drug class* to summarise them, and untick *Show percentages* to show
numbers of hits. Almost all of the hits are in the infant gut samples; the river samples have one hit or none. (With
percentages, a sample with a single hit shows 100% for that hit's drug class.)

On a sample's Dashboard, the AMR tab also shows which taxa the reads carrying each gene were assigned to.

9. Save and export results
--------------------------

* Every plot's *Export* button saves the plot as SVG, PNG or JPG, and most also save the data behind it as CSV.
* On the Samples page, the *Export data* card saves the taxonomic assignments of the selected samples as one table,
  for use in R, Python or a spreadsheet (see :ref:`exportdata`).
* MARTi's own output files are described in :ref:`downstream`.

10. Ask questions with AI (optional)
------------------------------------

If the :ref:`AI features <ai>` are set up, click *Ask AI* on the Compare page and ask, for example, "Which genera
differ most between the groups?". The answer comes with links that open the plots it is based on. See :ref:`askai`.

Next steps
----------

* Add metadata to your own samples so that you can map them and group them by location or date
  (:ref:`metadata`).
* Group samples into :ref:`projects <projects>`, with default groups and heatmap presets.
* Read about each page in detail: :ref:`guisamples`, :ref:`guidashboard` and :ref:`guicompare`.
