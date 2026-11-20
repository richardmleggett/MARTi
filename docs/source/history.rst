Change history
==============

Version 1.0.0 (22 Oct 2026)
---------------------------

MARTi Engine:

* Diversity measures (Shannon, Pielou, Simpson, inverse Simpson, Simpson evenness and Chao1) calculated after every
  chunk and written to the accumulation files. See :ref:`diversity`.
* Taxa accumulation curves now count the taxa present at the end of the run, so they no longer dip when the LCA cutoff
  moves reads to a higher taxon.
* Trees and accumulation data also written at a 0.005% minimum abundance cutoff.
* New ``LCAMinSupportDenominator`` option, to apply the minimum abundance cutoff as a percentage of all filtered reads
  or of assigned reads.
* When BLAST hits have equal scores and E-values, the hit with the higher identity is now preferred.
* Corrected a thread synchronisation issue in classification.

MARTi GUI (versions 1.0.0 to 1.0.8, October-November 2026):

* Dashboard and Compare pages reorganised into tabs, with new Diversity, Sample relationships (PCoA, UPGMA clustering
  and distance heatmap), Taxon relationships (correlations, co-occurrence network and UpSet plot) and AMR views.
* Compare page groups, browser-only sample names, and project ``sampleGroups`` and ``heatmapTaxaPresets``.
* New Taxa heatmap options (custom taxa, presets, traffic-light colours, bubbles) and Taxon trends plot.
* Samples page search with ``taxon:`` and other filter tokens, and a new Export data card.
* Settings and Export buttons on most plots.
* Optional AI features: narrative analysis on the Dashboard and the Ask AI chat panel. See :ref:`ai`.
* The sample map reads coordinates from ``sampleLocation`` (as written by the Engine) as well as ``location``.
* Restricted mode is enforced by the server: requests to rename samples or start analyses are refused.

marti-llm (new):

* MCP server for using MARTi's results with AI assistants. See :ref:`mcp`.

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