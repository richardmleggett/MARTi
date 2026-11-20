.. _mcp:

Using MARTi with AI assistants (MCP)
====================================

MARTi comes with an MCP server, in the ``marti-llm`` folder, that lets AI assistants answer questions about your MARTi
results. MCP (Model Context Protocol) is a standard way to give an assistant tools; it is supported by the Claude
desktop app, Claude Code, LM Studio, ChatGPT (in developer mode), Open WebUI and others.

Unlike the GUI's :ref:`Ask AI <askai>`, which only sees the samples on the page, the MCP server gives the assistant all
the samples in the output directories you choose. You can ask questions across many runs, for example:

* "Screen project bambi for human pathogens."
* "What's unusual about sample X compared with the other samples from that site?"
* "Do the summer and winter samples differ? Which taxa drive the difference?"
* "Write the narrative analysis for sample X." (This saves it to the sample's Dashboard; see
  :ref:`narrative-analysis`.)

The server reads the same files as the GUI, and recalculates results as runs progress. The assistant gets tools that run
MARTi's analyses, rather than raw abundance tables: sample lists and searches, taxa tables, screens against organism
and resistance-gene lists, comparisons between samples, alpha and beta diversity (the same calculations as the GUI),
group comparisons with permutation tests, co-occurrence, AMR summaries and sequencing saturation. All the tools only
read data, apart from the one that saves a narrative.

With the Claude desktop app, the assistant uses your Claude subscription, so no API key is needed.

Setting up the Claude desktop app
---------------------------------

1. Install the Python packages: ``pip install -r /path/to/MARTi/marti-llm/requirements.txt``.
2. In the Claude desktop app, open *Settings*, then *Developer*, and click *Edit Config*. This opens
   ``claude_desktop_config.json``.
3. Add a ``marti`` entry under ``mcpServers``, with the path to ``server.py`` and your MARTi output directories (the same
   ones you give ``marti_gui --marti``, separated by ``;``)::

       {
         "mcpServers": {
           "marti": {
             "command": "python3",
             "args": ["/path/to/MARTi/marti-llm/server.py"],
             "env": {
               "MARTI_DIRS": "/path/to/marti_output;/path/to/other_marti_output"
             }
           }
         }
       }

   If the file already has other servers, add ``marti`` alongside them inside ``mcpServers``. If ``python3`` is not
   the Python you installed the packages into, give its full path as ``command``.
4. Quit the Claude app completely and reopen it. The MARTi tools then appear in the tools menu of a new chat.

The menus of the Claude app change from time to time; if these steps differ, see Anthropic's guide to local MCP servers.

Other assistants
----------------

* **LM Studio** (local models) reads MCP servers from its ``mcp.json`` file, in the same format as above. Choose a model
  that supports tool calling, with a context length of at least 16k tokens.
* **ChatGPT, Open WebUI and other web or remote clients** need the server to run over HTTP, with authentication
  (an access token, or OAuth for ChatGPT): ``python server.py --http``. The server refuses to serve beyond the local
  computer without authentication. With ChatGPT, the tool results (such as abundance tables) are sent to OpenAI.

Full instructions for these, and for using the tools from your own code with any model, are in
``marti-llm/README.md``.

Things to know
--------------

* The organism lists used for screening (human pathogens, food spoilage organisms, plant pathogens, priority
  resistance genes and others) are illustrative starter lists in ``marti-llm/marti_llm/reference_lists``. Review them
  before relying on screening results. Projects' ``heatmapTaxaPresets`` (see :ref:`projects`) can also be used as
  screening lists.
* Group comparisons accept the same groups as the Compare page: from a project's ``sampleGroups``, by location, date or
  run, or groups you name in the conversation.
* Taxonomic assignments are evidence of sequence similarity, not proof that an organism is present or viable; the
  assistant is instructed to treat low read counts as presumptive.
