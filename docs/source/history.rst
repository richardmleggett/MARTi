Change history
==============

Version 0.9.17
--------------

* New map view in samples view.
* Changes to default options.
* Minor changes to job handling on SLURM (e.g. naming)

Version 0.9.16
--------------

* Added DIAMOND support.
* Various GUI updates.

Version 0.9.15
--------------

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