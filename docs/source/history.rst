Change history
==============

Version 0.9.33 (11 June 2026)
-----------------------------

* Added new NCBI ranks for domain, realm, cellular root, acellular root.
* Writes tree at 0.05% abundance in addition to 0, 0.1, 1, 2.
* Corrected bug on parsing CARD accessions.
* Early support for AI integration (inaccessible to the user at this point).

Version 0.9.31 (7 Nov 2025)
---------------------------

* Fixed bug with obtaining Kraken version.

Version 0.9.30 (19 Oct 2025)
----------------------------

* Fixed bug with amr.json generation.

Version 0.9.29 (5 Seo 2025)
----------------------------

* Added TaxaFilter and Options to Centrifuge.

Version 0.9.27 (9 Jul 2025)
----------------------------

* Changes/bug fixes to continuation code.

Version 0.9.26 (30 Jun 2025)
----------------------------

* Now aborts when Kraken2 or Centrifuge jobs fail.

Version 0.9.25 (25 Jun 2025)
----------------------------

* Removed repeated alerts.

Version 0.9.23 (19 Feb 2025)
----------------------------

* Added alerts.json file generation to back-end.

Version 0.9.22 (16 Feb 2025)
----------------------------

* Added ability to continue from aborted position.
* Removed need for marti_engine_options.txt file.
* Reads filtered through LCAMinReadLength are now marked as unclassified.
* Better reporting of SLURM errors.
* GUI updates and fixes.

Version 0.9.20 (23 Jan 2025)
----------------------------

* GUI updates and fixes.
* Added LCAMinReadLength option.

Version 0.9.18 (17 Oct 2024)
----------------------------

* New map view in samples view.
* Changes to default options.
* Minor changes to job handling on SLURM (e.g. naming)

Version 0.9.16 (1 Mar 2024)
---------------------------

* Added DIAMOND support.
* Various GUI updates.

Version 0.9.15 (30 Nov 2023)
----------------------------

* Centrifuge support.
* Metadata support.
* Support for abundance by base pairs rather than read count.
* Better default values for parameters and updated documentation to match.
* LCALimitToSpecies option added and turned off by default (was previously turned on).
* Changed error handling so that MARTi only warns when errors appear in the BLAST log. Only stops running if SLURM return code is an error.
* Removed some legacy code.
* New GUI options in marti_engine_options.

Version 0.9.14 (16 Jun 2023)
----------------------------

* First release with SLURM support.