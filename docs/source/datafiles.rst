NanoOK data files
=================

While analysing alignments, NanoOK will write a number of tab delimited
files to the 'analysis' subdirectory. These are used for graph plotting
through R, but you may wish to use them in other applications or your
own custom analyses. There are a number of global data files, plus
subdirectories for each reference.

In the analysis directory are the global data files:

-  **length\_summary.txt**

   -  Column 1: Read type - Template, Complement or 2D
   -  Column 2: Number of reads
   -  Column 3: Mean read length
   -  Column 4: Longest read length
   -  Column 5: Shortest read length
   -  Column 6: N50 length
   -  Column 7: Number of reads covered by N50
   -  Column 8: N90 length
   -  Column 9: Number of reads covered by N90

-  **all\_summary.txt** - summary of number of reads and number of
   alignments
-  **all\_\ **[2D\|Template\|Complement]\_**\ alignment\_summary.txt** -
   summary of number of reads aligning to each reference for Template,
   Complement and 2D reads.
-  **all\_[2D\|Template\|Complement]\_lengths.txt** - for each read of
   each type:

   -  Column 1: read ID
   -  Column 2: length of read

-  **all\_\ **[2D\|Template\|Complenent]\_**\ kmers.txt** - for each
   read of each type:

   -  Column 1: read ID
   -  Column 2: length of read
   -  Column 3: number of perfect 15mers
   -  Column 4: number of perfect 17mers
   -  Column 5: number of perfect 19mers
   -  Column 6: number of perfect 21mers
   -  Column 7: number of perfect 23mers
   -  Column 8: number of perfect 25mers

-  **all\_[2D\|Template\|Complenent]\_substitutions\_percent.txt** -
   base substitution table.
-  all\_\ **[2D\|Template\|Complenent]\_[deletion\|insertion\|substitution]\_[n]mer\_motifs.txt**
   - deletion/insertion/substitution kmer motifs:

   -  Column 1: kmer
   -  Column 2: percentage this kmer occurs before error

Within 'analysis', there will be a subdirectory for each reference. In
each reference subdirectory is:

-  **reference\_[2D\|Template\|Complement]\_alignments.txt** -
   multi-column files of read-by-read alignment data for each read type.
   Includes IDs, start and end positions of alignment, bases covered,
   longest perfect kmer, mean perfect kmer etc. Header line provides
   details.
-  **reference\_[2D\|Template\|Complement]\_all\_perfect\_kmers.txt**

   -  Column 1: kmer size
   -  Column 2: number of perfect kmers of size across all reads

-  **reference\_[2D\|Template\|Complement]\_best\_perfect\_kmers.txt**

   -  Column 1: kmer size
   -  Column 2: number of reads with best perfect kmer of size
   -  Column 3: percentage of reads with best perfect kmer of size

-  **reference\_[2D\|Template\|Complement]\_cumulative\_perfect\_kmers.txt**

   -  Column 1: kmer size
   -  Column 2: number of reads with best perfect kmer of size or
      greater
   -  Column 3: percentage of reads with best perfect kmer of size or
      greater

-  **reference\_[2D\|Template\|Complement]\_coverage.txt**

   -  Column 1: position on reference
   -  Column 2: mean coverage in bin

-  **reference\_[2D\|Template\|Complement]\_deletions.txt**

   -  Column 1: deletion size
   -  Column 2: percentage of deletions that are this size

-  **reference\_[2D\|Template\|Complement]\_insertions.txt**

   -  Column 1: insertion size
   -  Column 2: percentage of insertions that are this size

-  **reference\_gc.txt**

   -  Column 1: position
   -  Column 2: mean GC percentage for bin

-  **reference\_[2D\|Template\|Complement]\_kmers.txt**

   -  Column 1: kmer (5-mer)
   -  Column 2: Number of times kmer occurs in reference
   -  Column 3: Percentage of total kmers in reference represented by
      the kmer
   -  Column 4: Number of times kmer occurs in the reads
   -  Column 5: Percentage of total kmers in reads represented by the
      kmer
