.. _faqs:

FAQs
====

Why does the taxa accumulation curves go down as well as up?
------------------------------------------------------------

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

Why are the "Other" and "Higher Taxa" categories for?
------------------------------------------------------------------

In the donut and stacked bar plots within the MARTi GUI, two categories, *Other* and *Higher Taxa*, are used to help simplify the visualisations:

- *Other*: This node groups together taxa that are not among the top *N* most abundant at the selected taxonomic level. It is used to reduce visual clutter by summarising the long tail of low-abundance taxa. If you increase the number of top taxa shown in the plot options, the size of the "Other" node will decrease, as more taxa are displayed individually.

- *Higher Taxa*: This node contains reads that could not be confidently assigned to the selected taxonomic level, but were classified at a broader level (e.g. family or order). For example, if you are viewing data at genus level, any reads assigned to family level, or above, will be grouped under "Higher Taxa".

These categories ensure that all reads are accounted for, even if they are not fully resolved to the selected taxonomic rank.
