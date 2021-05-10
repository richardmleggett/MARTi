Alignment parser API
====================

Overview
--------

You can relatively easily add support to NanoOK for new parsers. The
steps involved are:

-  Implement the AlignmentFileParser interface - see below and look at
   the examples LastParser, BlasrParser, BWAParser, MarginAlignParser.
-  Add a 'case' statement for the new aligner in the getParser method of
   NanoOKOptions.

The AlignmentFileParser interface
---------------------------------

Your parser class will need to implement the following interface:

-  **getProgramID** - returns a textual ID string for this aligner which
   should be lower case - e.g. "last". This is used as the command line
   option and also the directory name.
-  **getAlignmentFileExtension** - returns the file extension of
   alignments, including . character - e.g. ".sam".
-  **getReadFormat** - returns either NanoOKOptions.FASTA or
   NanoOKOptions.FASTQ to indicate the preferred input format.
-  **setAlignmentParams** - passes through command line alignment
   parameters.
-  **getRunCommand** - return a command line instruction to run the
   aligner.
-  **parseFile** - parse an alignment file.
-  **outputToStdout** - return true if the aligner only outputs to
   stdout and not to a file.
-  **getHighestScoringSet** - return the highest scoring set of
   alignments (ie. highest scoring reference.
-  **checkForIndex** - check presence of index files to warn before
   running alignments.

As you will see, the alignment parsers that come with NanoOK are very
simple, with the harder work of parsing held within the SAMParser and
MAFParser classes which they inherit from.
