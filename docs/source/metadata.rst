.. _metadata:

Sample metadata, names and projects
===================================

This page describes the information you can attach to samples, and how to organise samples into projects. All of it
is optional, but it makes the GUI more useful: dates and locations let you group, sort and map samples, keywords help
you find them and guide the :ref:`AI narrative <narrative-analysis>`, and projects keep large collections manageable.

.. _samplemetadata:

Collection metadata
-------------------

Describe where and when samples were collected with a ``Metadata`` block in the analysis config file (see
:ref:`configfiles`)::

    Metadata
        Location:52.62170,1.21900
        Date:31/10/23
        Time:11:41
        Temperature:21.7C
        Humidity:49%
        Keywords:river,water,autumn
        Barcodes:01,02

A run can have several blocks, each listing the barcodes it applies to; a block without ``Barcodes`` applies to every
sample in the run.

The Engine writes this information to a ``metadata.json`` file in each sample's output folder, next to
``sample.json``. You can also create or edit ``metadata.json`` yourself, for example to add metadata after a run, and
the GUI picks up the change straight away. The fields the GUI uses are:

.. list-table::
   :header-rows: 1
   :widths: 20 30 50

   * - Field
     - Example
     - Used for
   * - ``sampleDate``
     - ``31/10/23`` or ``2023-10-31``
     - Grouping and ordering by date on the Compare page (*Set groups from metadata*, *Taxon trends*), and date
       searches with Ask AI. Dates can be day/month/year or year-month-day.
   * - ``sampleLocation`` or ``location``
     - ``52.6217, 1.219``
     - Latitude and longitude in decimal degrees, for the :ref:`sample map <guisamples>` and distance searches with
       Ask AI. The Engine writes the config file's ``Location`` as ``sampleLocation``. A ``location`` field
       is also accepted, and is used first if both are present.
   * - ``locationName``
     - ``Hickling Broad``
     - The site's name: shown on the map, and used to group samples by location on the Compare page.
   * - ``keywords``
     - ``river, water, autumn``
     - Searching on the Samples page, and choosing the narrative analysis profile.
   * - ``sampleTime``, ``temperature``, ``humidity``
     - ``11:41``, ``21.7C``, ``49%``
     - Shown in the narrative analysis inputs.

When grouping by location, the Compare page uses ``locationName``, or the coordinates if a sample has no site name.
To add a site name, or metadata for a run analysed without a ``Metadata`` block, edit ``metadata.json``, for
example::

    {
        "barcode": "1",
        "id": "Hickling1",
        "runId": "NorfolkSeq_24-07",
        "location": "52.74, 1.57",
        "locationName": "Hickling Broad",
        "sampleDate": "2024-07-25",
        "keywords": "freshwater, broad"
    }

.. _renaming:

Renaming samples
----------------

By default, a sample's name comes from the config file: the ``BarcodeId`` lines (e.g. ``BarcodeId1:Kessingland1``),
or otherwise the run name followed by the barcode number. You can rename samples after analysis without rerunning
anything:

* In the GUI, edit the *Sample Name* in the sample's *More info* dialog on the Samples page, or click the edit icon next
  to the sample ID on its Dashboard. The new name is shown to everyone using the GUI. Renaming is not available in
  :ref:`restricted mode <restrictedmode>`.
* Or create an ``ids.json`` file in the run's output folder (see :ref:`configfiles`), mapping original names to new
  ones. This is what the GUI writes.

To change how a sample is labelled only on your own Compare page, type a name in the Compare page's Samples card
instead (see :ref:`comparesamplescard`).

.. _projects:

Projects
--------

Projects in MARTi GUI allow users to group MARTi results for easier management and navigation. Once projects are set up, they can be accessed directly via the GUI using a URL like ``http://localhost:3000/project/airseq``, which shows only that project's samples.

To set up projects, create a ``projects.json`` file and place it in one of the MARTi output directories. You can specify entire directories, specific runs, or individual samples within a barcoded run. These directories must also be listed in the ``marti_engine_options.txt`` file as a ``MARTiSampleDirectory`` or specified in the ``marti_gui`` command like so:

``marti_gui --marti "/path/to/marti_output/marc;/path/to/marti_output/airseq"``

Here is an example of a ``projects.json`` file:

::

    {
        "defaultProject": "bambi",
        "bambi": {
            "directories": [],
            "runs": [
                "BAMBI_P103M_400ng_RAD4_20122017",
                "BAMBI_P106I_LSQK108_02022018",
                "BAMBI_P116I_SQK108_02022018",
                "BAMBI_P205G_1D_12012018",
                "BAMBI_P8_1D_19092017"
            ],
            "samples": []
        },
        "marc": {
            "directories": ["/path/to/marti_output/marc"],
            "runs": [],
            "samples": []
        },
        "airseq": {
            "directories": ["/path/to/marti_output/airseq"],
            "samples": ["NorfolkSeq_test_sample"]
        }
    }

In this example, the ``bambi`` project groups specific MARTi runs, ``marc`` uses a directory path, and ``airseq`` includes both a directory and a specific sample. ``defaultProject`` is the project shown when the GUI is opened without a project in the address.

A project can also define two things for the Compare page:

* ``sampleGroups`` - default :ref:`groups <comparesamplescard>` for its samples. Each entry gives a run ID, a sample ID
  and a group name. Users can still change the groups on their own Compare page.
* ``heatmapTaxaPresets`` - named lists of taxa to offer in the *Taxa heatmap*'s *Taxa to show* menu, for example the
  pathogens or indicator organisms a project monitors. Each preset has an ``id``, a ``name``, the taxon to use as the
  percentage denominator (``denominatorTaxonId``: ``1`` for all reads, ``2`` for Bacteria), a minimum abundance in percent
  (``minimumRootPercent``) and its ``taxa``, given as NCBI taxon IDs and names.

For example::

    {
        "defaultProject": "marc",
        "marc": {
            "directories": ["/path/to/marti_output/marc"],
            "sampleGroups": [
                {"runId": "MARC_Yare_101117", "sampleId": "MARC_Yare_101117_F1", "group": "Upstream"},
                {"runId": "MARC_Yare_101117", "sampleId": "MARC_Yare_101117_F2", "group": "Downstream"}
            ],
            "heatmapTaxaPresets": [
                {
                    "id": "faecal_indicators",
                    "name": "Faecal indicator bacteria",
                    "denominatorTaxonId": "2",
                    "minimumRootPercent": 0,
                    "taxa": [
                        {"id": "562", "name": "Escherichia coli"},
                        {"id": "1350", "name": "Enterococcus"}
                    ]
                }
            ]
        }
    }

If ``sampleGroups`` or ``heatmapTaxaPresets`` contain a mistake (for example a duplicate sample or a taxon without a
name), the GUI ignores that part of the project and reports the problem in its console output.
