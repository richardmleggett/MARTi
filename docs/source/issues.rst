.. _issues:

Known issues
============

Taxa accumulation curves can go down as well as up
--------------------------------------------------

In rare circumstances, the number of taxa in an acuumulation curve can appear to dip if the LCA cutoff is set higher than 0%. This is because each point along the x-axis represents the addition of a chunk of reads. If a chunk contains enough of a taxa to just meet the LCA threshold, but the next chunk contains no reads for that taxa, the percentage of reads represented by the taxa can drop below the LCA cutoff and the reads are then pushed up to the next taxonomic level.

For example, in one sample we observed:

- At chunk 2, there were 12 out of 9705 reads for one taxa - 0.12%.
- By chunk 3, there were no more reads for that taxa, but the total read count was now 17705, which means the 12 reads now represent 0.06%. 
- So by chunk 3, the taxa is now below the 0.1% min support, so it vanishes and the reads are moved up a level.
