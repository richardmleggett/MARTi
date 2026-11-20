.. _diversity:

Diversity measures
==================

MARTi reports several standard measures of the diversity within a sample (alpha diversity). They are calculated from
the tree at the selected rank and LCA minimum abundance cutoff:

* Each taxon at the selected rank counts once, with the reads assigned to it and to all its descendants.
* A higher taxon with no descendants at the selected rank also counts once. For example, at genus level, a family
  whose reads could not be assigned to any genus counts as one taxon.
* Reads assigned directly to a higher taxon that does have descendants at the selected rank are left out, as are
  unclassified reads. This is why N, the total count used, can be less than the number of classified reads.
* With *All Levels* selected, the leaf taxa of the tree are used. With *bp yield* selected, bases are used instead of
  reads.

In the formulas, *S* is the number of taxa, *N* the total count, and *p*\ :sub:`i` the proportion of the count in
taxon *i*.

.. list-table::
   :header-rows: 1
   :widths: 22 30 48

   * - Measure
     - Formula
     - Meaning
   * - Taxa (S), richness
     - number of taxa with a count above zero
     - How many taxa were found. Depends strongly on sequencing depth.
   * - Shannon (H')
     - −Σ *p*\ :sub:`i` ln *p*\ :sub:`i`
     - Combines richness and evenness. Uses natural logarithms. 0 for a single taxon.
   * - Pielou evenness (J')
     - H' / ln S
     - How evenly reads are spread over the taxa found, from 0 (one taxon dominates) to 1 (all equal).
   * - Simpson (1 − D)
     - 1 − Σ *p*\ :sub:`i`\ :sup:`2`
     - The chance that two reads picked at random belong to different taxa.
   * - Inverse Simpson (1/D)
     - 1 / Σ *p*\ :sub:`i`\ :sup:`2`
     - The *effective number* of equally common taxa. Less affected by rare taxa than richness.
   * - Simpson evenness
     - (1/D) / S
     - Evenness based on the inverse Simpson index.
   * - Chao1
     - S + F\ :sub:`1`\ :sup:`2` / (2F\ :sub:`2`)
     - An estimate of total richness including taxa not yet seen, from the numbers of taxa seen once (F\ :sub:`1`) and
       twice (F\ :sub:`2`). Only calculated from read counts at the 0% cutoff, where these counts are genuine.
   * - Rarefied richness
     - expected S in a random subsample of a fixed number of reads
     - Richness corrected for sequencing depth. On the Compare page, every sample is rarefied to the smallest number of
       included reads among the samples being compared.

Which measures appear where:

* The **MARTi Engine** (v1.0.0 and later) calculates these measures after every chunk of reads, at each rank and LCA
  cutoff, and stores them in the ``accumulation_ms*.json`` files. The Dashboard's *Sample diversity* plot and the
  Compare page's *Taxa accumulation* plot draw these as curves, showing how diversity settled as more reads were
  analysed.
* The **Dashboard** and the **Compare** page's *Diversity across samples* plot and *Diversity metrics* table show the
  current values.

Comparing diversity between samples
-----------------------------------

Richness rises with sequencing depth, so compare it between samples only when they were sequenced to similar depths,
or use rarefied richness. Shannon and inverse Simpson diversity settle sooner as reads accumulate; the accumulation
curves show whether they have levelled off. All the measures depend on the classification database, the LCA settings
and the cutoff, so compare samples analysed in the same way.
