Common errors
=============

**Error: unable to find any alignments to process**

-  Have you run the align stage? If not, run it.
-  If you have run the align stage, have the alignments worked? Have a
   look inside sample/last/pass/2D or appropriate. If there are files
   there, but they are 0 bytes, see below.

**All my LAST alignment files are empty**

-  Have you indexed your reference file?

**lastal: invalid option -- 'o' when aligning**

-  This means your version of LAST is too old. Older versions do not
   support the -o option to output to a file and only output to the
   screen.
-  Solution: install latest version of LAST.

**I don't get a PDF file in the latex directory**

-  If there is a .tex file, then something went wrong converting the
   LaTeX to PDF - probably missing LaTeX packages.
-  Have a look at the .log file inside the latex directory. You will
   likely see an error such as:
   ``       ! LaTeX Error: File `multirow.sty' not found.     ``
-  In this instance, you need to install the multirow package.

**java.lang.OutOfMemoryError: Java heap space**

-   Try editing the line in the nanook file of the bin directory: JAVA\_ARGS="-Xmx2048m"
-   By default, this sets a maximum Java memory size of 2048 Mb - try increasing this according to what your memory you have available.
