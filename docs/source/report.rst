NanoOK Report Explanation
=========================

Pass and fail counts
--------------------

This section simply shows the count of Template, Complement and 2D reads
classified in the "pass" and "fail" directories by the base caller.

Read lengths
------------

This section includes a table of read length statistics for Template,
Complement and 2D reads, as well as read length histograms.

Template/Complement/2D alignments
---------------------------------

One section for each read type. A summary table gives the number of
reads of each type, the number (and percentage) with alignments and the
number without alignments. There then follows a table with a line for
each reference, summarising the number of reads that align to that
reference, coverage and longest perfect kmer (longest stretch of
perfectly mapping sequence).

Reference error analysis
------------------------

For each reference, there is an error analysis section.

The first two rows in the table relate to query identity, excluding
indels:

-  **Overall identity (minus indels)** - the mean percentage of
   perfectly matching bases in the read set. Or specifically 100 \*
   perfectly matching bases in read set / total bases in reads.
-  **Aligned identity (minus indels)** - the mean percentage of
   perfectly matching bases in alignments. Or specifically 100 \*
   perfectly matching bases / (perfectly matching bases in alignment +
   substituted bases in alignment). 

The next four rows in the table are based on mean values per 100 bases
of alignment, including indels - and so the four values in each column
should add up to 100 (give or take a small rounding error).

-  **Identical bases per 100 aligned bases** - the mean number of
   identical bases per 100 bases of aligned sequence.
-  **Inserted bases per 100 aligned bases** - the mean number of
   inserted bases per 100 bases of aligned sequence.
-  **Deleted bases per 100 aligned bases** - the mean number of deleted
   bases per 100 bases of aligned sequence.
-  **Substitutions per 100 aligned bases** - the mean number of
   substituted bases per 100 bases of aligned sequence.

Then there are two rows with mean insertion and deletion sizes.

Finally, there are histograms of insertion and deletion size for the
three types of read.

Reference read identity
-----------------------

This section contains the following graphs, one for each read type:

-  Histogram of read identity - showing the count of reads vs identity.
-  Percent identical bases in query vs Length scatter plot.
-  Alignment identity vs percentage of query sequence aligned scatter
   plot. 

It is important to understand what we mean by alignment identity and
read identity:

-  **Read identity** is defined as the percentage of bases in the read
   which are perfectly matched to bases in the references - or 100 \*
   matched bases / read length.
-  **Alignment identity** is defined as the percentage of bases in the
   alignment string that are perfect matches.

Example
~~~~~~~

::

    Reference: TGACACTA--TGCCTAGTTAGCTA-GC
    Read:      TG--ACTATTCagCTAcTTAG--AGGCTGTGCTAC

In the above example, substitutions are shown in lower case for clarity.

-  The read is 30 bases long, but only the first 24 have been included
   in the alignment.
-  The alignment is 28 bases long.
-  16 bases match perfectly between the read and the reference.
-  So the read identity is 100 \* 16 / 30 = 53%.
-  The alignment identity is 100 \* 16 / 28 = 57%

Reference perfect kmers
-----------------------

By perfect kmer, we mean stretches of perfectly aligned sequence without
any kind of error (substitution or indel).

-  Cumulative perfect kmers - percentage of reads with a stretch of
   perfect sequence of at least this (x-axis) size.
-  Best perfect kmer - histogram of percentage of reads for which this
   (x-axis) is the best stretch of perfect sequence.
-  Scatter plot of longest perfect sequence vs read length.

Reference coverage
------------------

This section contains coverage plots for Template, Complement and 2D
data, as well as a % GC plot for the reference.

Reference 5-mer analysis
------------------------

Plots showing abundance of 5-mers in reads vs. references for Template,
Complement and 2D data.

All reference 21mer analysis
----------------------------

Scatter plots showing the number of perfect 21mers vs read length for
each read type.

All reference susbtitutions
---------------------------

A substitution table is provided for each read type - Template,
Complement, 2D, showing the percentage of all base transition (e.g. a
reference C that becomes an A).

Error motif analysis
--------------------

NanoOK stores all 3-mers, 4-mers and 5-mers that occur before a
substitution or indel. The error motif tables show the Top 10 most
common and Bottom 10 least common kmers for each error type. The logo
images are calculated based on the top 10 or bottom 10 kmers
respectively.
