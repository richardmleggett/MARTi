.. _blastdbs:

Database Installation
===========================

Pre-build Blast databases
-------------------------

MARTi classifies reads with a combination of BLAST and its own Lowest Common Ancestor (LCA) algorithm. Users can provide a pre-built BLAST database, such as the nucleotide sequence database (nt) or Prokaryotic RefSeq database, or build and use a custom BLAST database.

The easiest way to obtain the latest pre-built BLAST databases is by running the update_blastdb.pl script that comes with the BLAST+ command line tool (Perl is also a prerequisite). Documentation for this script can be seen by running
the script without any arguments.

To view all available BLAST databases, run the following command:

``update_blastdb.pl --showall``

To download one of these pre-built BLAST databases, run the script followed by any relevant options and the name(s) of the BLAST databases to download. For example:

``update_blastdb.pl --decompress ref_prok_rep_genomes``

Custom databases
----------------

If you want to make a custom BLAST database from FASTA files, you can use the makeblastdb tool distributed with the BLAST+ command line application. Before running the command you need to ensure that each sequence has a unique identifier and that you have created an additional file that maps these identifiers to NCBI taxids (`see here <https://www.ncbi.nlm.nih.gov/books/NBK569841/>`_ for more). Then you can build your database with a command similar to this::

  makeblastdb -in zymo_mock.fasta -parse_seqids -blastdb_version 5 -title "Zymo mock" -dbtype nucl -taxid_map taxid_map.txt

CARD
----

If specified in the configuration file, the MARTi Engine will also BLAST reads to the Comprehensive Antibiotic Resistance Database (CARD) for AMR gene identification. To use the CARD database, you will need to:

1. Download both the CARD Data and CARD Ontology files `from  the CARD website <https://card.mcmaster.ca/download>`_
2. Extract the contents of each file into a single directory.
3. Create a BLAST database from the FASTA sequences:

``makeblastdb -in nucleotide_fasta_protein_homolog_model.fasta -dbtype nucl``
