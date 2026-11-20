.. _faqs:

FAQs
====

Why do the taxa accumulation curves go down as well as up?
----------------------------------------------------------

By default, the GUI now draws accumulation curves from the *Final taxa set*: at each point it counts how many of the
taxa present at the end of the run had been seen so far, so the curves never go down. This needs results from MARTi
Engine v1.0.0 or later. The explanation below applies to the *Per-chunk taxa count* option, and to results from older
versions of the Engine.

In rare circumstances, the number of taxa in an accumulation curve can appear to dip if the LCA cutoff is set higher than 0%. This is because each point along the x-axis represents the addition of a chunk of reads. If a chunk contains enough of a taxa to just meet the LCA threshold, but the next chunk contains no reads for that taxa, the percentage of reads represented by the taxa can drop below the LCA cutoff and the reads are then pushed up to the next taxonomic level.

For example, in one sample we observed:

- At chunk 2, there were 12 out of 9705 reads for one taxa - 0.12%.
- By chunk 3, there were no more reads for that taxa, but the total read count was now 17705, which means the 12 reads now represent 0.06%.
- So by chunk 3, the taxa is now below the 0.1% min support, so it vanishes and the reads are moved up a level.

How can leaf nodes have more reads below the node?
--------------------------------------------------

Reads are assigned to nodes based on the Lowest Common Ancestor settings. However, what nodes are shown depends on the taxonomic level selected. If you select, say, genus level, there will still be reads assigned to species. These won't be shown, but they count towards the "Summed read count" that will show at genus and higher taxonomic levels.

Why do AMR hits on the heatmap sum to over 100% when grouped by "Drug class"?
-----------------------------------------------------------------------------

When grouping by "Drug class" on the AMR heatmap, it's possible for the total AMR hits to exceed 100% for a sample. This is because individual AMR genes can be associated with multiple drug classes. As a result, a single gene may contribute to more than one category, leading to overlapping counts.

What are the "Other" and "Higher Taxa" categories for?
------------------------------------------------------------------

In the donut and stacked bar plots within the MARTi GUI, two categories, *Other* and *Higher Taxa*, are used to help simplify the visualisations:

- *Other*: This node groups together taxa that are not among the top *N* most abundant at the selected taxonomic level. It is used to reduce visual clutter by summarising the long tail of low-abundance taxa. If you increase the number of top taxa shown in the plot options, the size of the "Other" node will decrease, as more taxa are displayed individually.

- *Higher Taxa*: This node contains reads that could not be confidently assigned to the selected taxonomic level, but were classified at a broader level (e.g. family or order). For example, if you are viewing data at genus level, any reads assigned to family level, or above, will be grouped under "Higher Taxa".

These categories ensure that all reads are accounted for, even if they are not fully resolved to the selected taxonomic rank.

Can I use TaxaFilter for Kraken2?
---------------------------------

For query-time exclusion, this is determined by the capabilities of the underlying tools rather than by MARTi. BLAST and Centrifuge both have options to filter taxa, but Kraken2 currently does not. Kraken2 exclusion must be achieved by omitting taxa when building the database or by post-classification filtering. 

What is the LCA minimum abundance cutoff?
-----------------------------------------

LCA stands for Lowest Common Ancestor and is the process used with BLAST results to assign reads to taxa. The cutoff sets the minimum abundance level that a taxa needs to have to be shown. If a taxa has fewer reads than this minimum abundance, its read counts will be moved up the taxonomic tree until the threshold is met. So a threshold of 0.1% means that a taxa must possess at least 0.1% of reads in order for it to be shown. It is a useful tool for simplifying a taxonomic tree.

The percentage is of either all reads that passed the quality filters or only the classified reads, as set by
``LCAMinSupportDenominator`` in the config file (see :ref:`configfiles`). The Engine writes results at cutoffs of 0,
0.005, 0.05, 0.1, 1 and 2%, and the GUI's options bar chooses between them.

Which cutoff should I use?
--------------------------

Use 0% or 0.005% when you are looking for organisms present at low levels, for example when screening for pathogens:
at higher cutoffs their reads may have been moved to a higher taxon. Use 0.1% or higher for overviews of a sample's
main components, where a long tail of rare taxa (some of which may be misassignments) would clutter the plots.
Diversity measures and taxon counts depend on the cutoff, so compare samples at the same cutoff.

Why are some plots or tabs empty for my sample?
-----------------------------------------------

Some results need particular analyses or Engine versions: the AMR tabs need a BLAST process against the CARD database,
the putative host taxa need reads to be classified with BLAST, and the diversity curves need MARTi Engine v1.0.0 or
later. Plots on the Compare page's *Sample relationships* and *Taxon relationships* tabs need several samples.

Does MARTi send my data to an AI provider?
------------------------------------------

Only if someone using the GUI chooses to: the :ref:`AI features <ai>` are off until a model is set up in *Options*, and
nothing is sent to a model until someone clicks *Generate narrative analysis* or asks *Ask AI* a question. With a local
model server, nothing leaves your own computers. If you connect MARTi's :ref:`MCP server <mcp>` to an assistant such
as the Claude app, the results the assistant asks for are sent to that assistant's provider. The MARTi Engine never
contacts a model.