How NanoOK works
================

How NanoOK deals with alignments
--------------------------------

If running with multiple reference sequences, a single query sequence
may produce 1 or more alignments to 1 or more references. NanoOK adopts
the following approach to assign reads to references:

#. Sort alignments in order of score. The read belongs to the reference
   with highest score.
#. Then merge any other alignments that align to the same reference as
   the highest scoring alignment, in order of score.
#. Any sections of these subsequent alignments that overlap with already
   merged alignments are discarded.

Where the highest score is shared by two or more identically scoring
alignments, NanoOK choses one of them at random. **This can result in
very slight changes in alignment figures reported**. If you wish
deterministic behaviour, specify the ``-deterministic`` parameter.
