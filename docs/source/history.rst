Change history
==============

Version 0.9.23 (TBC)
--------------------

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