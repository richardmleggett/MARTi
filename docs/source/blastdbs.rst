.. _blastdbs:

Reference Databases
===================

MARTi does not download or manage classification databases automatically. Users must ensure the databases are pre-built and accessible by the MARTi Engine at runtime. You must provide valid paths to these databases in the MARTi configuration file.

Pre-built Blast databases
-------------------------

Users can provide a pre-built BLAST database, such as the nucleotide sequence database (nt) or Prokaryotic RefSeq database, or build and use a custom BLAST database.

The easiest way to obtain the latest pre-built BLAST databases is by running the update_blastdb.pl script that comes with the BLAST+ command line tool (Perl is also a prerequisite). Documentation for this script can be seen by running
the script without any arguments.

To view all available BLAST databases, run the following command:

``update_blastdb.pl --showall``

To download one of these pre-built BLAST databases, run the script followed by any relevant options and the name(s) of the BLAST databases to download. For example:

``update_blastdb.pl --decompress ref_prok_rep_genomes``

Custom Blast databases
----------------------

If you want to make a custom BLAST database from FASTA files, you can use the makeblastdb tool distributed with the BLAST+ command line application. Before running the command you need to ensure that each sequence has a unique identifier and that you have created an additional file that maps these identifiers to NCBI taxids (`see here <https://www.ncbi.nlm.nih.gov/books/NBK569841/>`_ for more). Then you can build your database with a command similar to this:

``makeblastdb -in zymo_mock.fasta -parse_seqids -blastdb_version 5 -title "Zymo mock" -dbtype nucl -taxid_map taxid_map.txt``

CARD
----

If specified in the configuration file, the MARTi Engine will also BLAST reads to the Comprehensive Antibiotic Resistance Database (CARD) for AMR gene identification. To use the CARD database, you will need to:

1. Download both the CARD Data and CARD Ontology files `from  the CARD website <https://card.mcmaster.ca/download>`_
2. Extract the contents of each file into a single directory.
3. Create a BLAST database from the FASTA sequences:

``makeblastdb -in nucleotide_fasta_protein_homolog_model.fasta -dbtype nucl``

Kraken2 Databases
-----------------
To classify reads with Kraken2 users must provide a Kraken2-compatible database, either by building one themselves or downloading a pre-built one.

Pre-built databases are available from:
https://benlangmead.github.io/aws-indexes/k2

To build a custom Kraken2 database, refer to the official Kraken2 manual:
https://ccb.jhu.edu/software/kraken/MANUAL.html#custom-databases

After downloading or building a database, provide the full path to the database directory in the MARTi configuration file.

Centrifuge Databases
---------------------
MARTi also supports Centrifuge for classification. 

Prebuilt Centrifuge databases are available from:
https://benlangmead.github.io/aws-indexes/centrifuge

Note: These prebuilt databases are quite old (2016–2018) and do not reflect the latest available reference sequences. We recommend building your own up-to-date Centrifuge database where possible.

Users can build their own Centrifuge database using the `centrifuge-download` and `centrifuge-build` commands. Here is an example for constructing a basic metagenomic database for Centrifuge:
::
 # download NCBI taxonomy
 centrifuge-download -o taxonomy taxonomy

 # download RefSeq genomes for archaea, bacteria, viral and fungi
 centrifuge-download -o library -m -d "archaea,bacteria,viral,fungi" refseq > seqid2taxid.map

 # add the human reference genome
 centrifuge-download -o library -d "vertebrate_mammalian" -a "Chromosome" -t 9606 -c 'reference genome' refseq >> seqid2taxid.map

 # concatenate all sequences into one file
 find library -name '*.fna' -exec cat {} >> input-sequences.fna \;

 # build the Centrifuge index
 centrifuge-build -p 100 \
  --conversion-table seqid2taxid.map \
  --taxonomy-tree taxonomy/nodes.dmp \
  --name-table taxonomy/names.dmp \
  input-sequences.fna metagenome


