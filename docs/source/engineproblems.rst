.. _engineproblems:

Engine problems
===============

Troubleshooting principles
--------------------------

If the MARTi Engine doesn't seem to be working, there are a number of places to go to work out what is going wrong:

* The output to screen, or if using SLURM, the out/err log files.
* The MARTiEngine log - found as sampledir/logs/engine.txt.
* The MARTiEngine scheduler log - found as sampledir/logs/scheduler.txt.

Java heap problems
------------------

For large samples, it's possible that the Java heap size will be exceeded. This might result in exceptions similar to the example below::

   Exception in thread "pool-1-thread-1" java.lang.OutOfMemoryError: Java heap space
           at java.base/java.util.Arrays.copyOf(Arrays.java:3481)
           at java.base/java.util.ArrayList.grow(ArrayList.java:238)
           at java.base/java.util.ArrayList.grow(ArrayList.java:245)
           at java.base/java.util.ArrayList.add(ArrayList.java:484)
           at java.base/java.util.ArrayList.add(ArrayList.java:497)
           at uk.ac.earlham.marti.filter.ReadFilterSample.processFile(ReadFilterSample.java:340)
           ...

In this case, you may need to edit the Java heap parameters which are specified in the marti file found in the bin directory of the MARTi code. Use a text editor to edit the line that looks something like this::

   JAVA_ARGS="-Xms1g -Xmx16g"

The xms parameter specifies the minimum heap size (in this case 1Gb) and the xmx parameter specifies the maximum heap size (16Gb here). 

