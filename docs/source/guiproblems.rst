.. _guiproblems:

GUI problems
============

No samples appear on the Samples page
-------------------------------------

* Check that the GUI is monitoring the right directory: the console output when ``marti_gui`` starts lists the
  directories it is monitoring. Give the directory that *contains* the run folders (``--marti`` or
  ``MARTiSampleDirectory``), not a run folder itself.
* Samples appear once the Engine has written their ``sample.json`` (in ``<run>/marti/<sample>/``), which is after the
  first chunk of reads has been analysed.
* If a ``projects.json`` file exists, the Samples page only shows the samples of the open project (see
  :ref:`projects`). Check that the project includes your runs, directories or samples, and that ``defaultProject``
  names a project that exists.
* When several directories are given on the command line, put them in quotes: ``--marti "/path/one;/path/two"``.
  Without quotes, the shell treats ``;`` as the end of the command.

The sample map is missing or empty
----------------------------------

The map only appears when at least one sample's ``metadata.json`` has coordinates (``latitude, longitude`` in decimal
degrees) in its ``sampleLocation`` or ``location`` field, and its background needs an internet connection. Check that
the coordinates are numbers in range (latitude -90 to 90, longitude -180 to 180) and in that order. See
:ref:`samplemetadata`.

A plot or tab is empty
----------------------

See the FAQ :ref:`faqs`. Results such as AMR, putative host taxa and diversity curves need particular analyses or
Engine versions.

AI features
-----------

*The Generate button is disabled or missing, or Ask AI says no model is set up*
    Choose a model in *Options* (see :ref:`aisetup`). In :ref:`restricted mode <restrictedmode>`, narratives cannot be
    generated and the chat is off unless the GUI was started with ``--restricted-chat``.

*"Could not start Python"*
    The GUI could not run ``python3``. Install Python 3.10 or later, or give the Python to use with ``--llm-python``
    or ``LLMPython``.

*"The marti-llm folder ... was not found" or "The marti_llm package was not found"*
    The GUI looks for the ``marti-llm`` folder beside its ``gui`` folder. If yours is elsewhere, give its path with
    ``--llm-tools`` or ``LLMToolsDir``.

*"A Python package ... is missing"*
    Install marti-llm's requirements into the Python the GUI uses:
    ``pip install -r /path/to/MARTi/marti-llm/requirements.txt``.

*Test connection fails*
    Check the provider, model name and key. For a local server, check that it is running and that the server URL
    (including ``/v1``) is right. Model names must be exactly as the provider lists them.

*Ask AI answers slowly, or does not use the analyses*
    Each answer may need several analysis steps, which can take minutes with a local model. Small local models can
    fail to call tools reliably; try a larger model, or one known to support tool calling, with a context length of at
    least 16k tokens.

*The narrative cannot be saved*
    The GUI writes ``narrative.json`` into the sample's folder, so the account running the GUI needs write access to
    the MARTi output directories.

*An answer took too long and was stopped*
    Increase ``LLMTimeoutMinutes`` in ``marti_engine_options.txt`` (default 10 minutes).

The port is already in use
--------------------------

Another program (or another copy of the GUI) is using port 3000. Stop it, or start the GUI on another port with
``--port``.
