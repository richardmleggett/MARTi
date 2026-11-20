# marti-llm: LLM access to MARTi results

A prototype that lets LLMs (Claude, ChatGPT, open-source models) answer questions about
[MARTi](https://github.com/richardmleggett/MARTi) output. It reads the same files the MARTi GUI
reads. The LLM gets tools backed by deterministic analysis, rather than raw abundance tables.

**MARTi compatibility.** Built against MARTi v1.0.5 (GUI) / engine commit `075bfd8` (29 Oct 2026).
It also reads output from earlier versions. Diversity, ordination, co-occurrence and correlation results
are identical to MARTi's own engine and GUI. `tests/parity_test.py` checks this against MARTi's source,
so rerun it after updating MARTi.

There are three layers:

| Layer | File | What it does |
|---|---|---|
| Data | `marti_llm/data.py` | Finds samples using the same glob patterns as `gui/UI/services/observer.js`. Parses `sample.json`, `tree_ms*.json`, `accumulation_ms*.json`, `amr.json`, `metadata.json`, `alerts.json`, `ids.json`, `projects.json` and `lcaparse/*_perread.txt`. Re-reads files when their mtime changes, so it works on live runs. |
| Analysis | `marti_llm/analysis.py`, `marti_llm/diversity.py` | Rank tables, taxid-subtree screening against curated lists and project presets, comparisons, outlier detection, alpha and beta diversity (ported from MARTi), co-occurrence, saturation and AMR summaries. All results are compact JSON. |
| Interface | `server.py`, `agent.py` | `server.py` is an MCP server (20 tools and 5 prompts) for any MCP client. `agent.py` is a provider-agnostic agent loop (Anthropic, plus any OpenAI-compatible endpoint) over the same tools. |

## Install

```bash
pip install -r requirements.txt
export MARTI_DIRS="/path/to/marti_output"     # same dirs as `marti_gui --marti`, ';'-separated
python tests/smoke_test.py /path/to/MARTi/gui/output   # optional: test on MARTi's example data
```

The example data is **not** included in this package. It is in the MARTi repository under
`gui/output/`: 5 BAMBI infant-gut samples and 4 MARC river-water samples. To get it:
`git clone https://github.com/richardmleggett/MARTi.git`.

## Use it from an MCP client (no code)

**Claude Desktop / Claude Code, or any local client using stdio.** Copy
`examples/claude_desktop_config.json` into your client config and fix the paths. Then ask, for example:
"Screen project bambi for human pathogens", or "What's unusual about sample X compared with the other
samples from that site?" Clients that support MCP prompts will also offer the four question profiles.

**LM Studio (local models).** LM Studio 0.3.17+ reads servers from its `mcp.json`, in the same format as
Claude Desktop. Open it from the Program tab → Install → Edit mcp.json, and add the same `"marti"` entry as in
`examples/claude_desktop_config.json`. LM Studio then starts the server itself over stdio, so no HTTP or
authentication is needed. Use a model that supports tool calling, with a context length of 16k–32k or more.

**Web and remote clients (ChatGPT, Open WebUI, claude.ai connectors).** These need the HTTP mode below.

## Running over HTTP

```bash
python server.py --http                      # http://127.0.0.1:8765/mcp, reachable from this computer only
```

Every tool is labelled **read-only** (MCP tool annotations), with a readable title. Clients that honour the
labels, such as ChatGPT and LM Studio, can treat calls as safe lookups rather than write actions.

**The server will not serve beyond this computer without authentication.** Listening on another address
(`--host 0.0.0.0`) or naming a public URL (`--public-url`) makes it stop with an error unless an access token
or OAuth is configured. `--allow-unauthenticated` overrides this, for short tests on the example data only.
Secrets are read from environment variables, so they don't appear in process listings.

| Client | Authentication | Set |
|---|---|---|
| Open WebUI, LM Studio (remote entry), scripts, a private network | Access token | `MARTI_MCP_TOKEN` |
| ChatGPT (and other clients that log in with OAuth) | OAuth, via your identity provider | `MARTI_MCP_OAUTH_ISSUER`, `--public-url` |

### Access token (Open WebUI and similar)

```bash
export MARTI_MCP_TOKEN=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
echo $MARTI_MCP_TOKEN                        # copy this into the client
python server.py --http
```

Clients must send `Authorization: Bearer <token>`. In **Open WebUI**, add the server under Admin Settings →
External Tools as type MCP (Streamable HTTP), URL `http://127.0.0.1:8765/mcp`, with Bearer authentication and
the token as the key. If Open WebUI runs in **Docker**, use `http://host.docker.internal:8765/mcp` and start
the server with `--allowed-host host.docker.internal`; on Linux, also listen with `--host 0.0.0.0`. For an
**LM Studio** remote entry, use `"url": "http://127.0.0.1:8765/mcp"` plus
`"headers": {"Authorization": "Bearer <token>"}`.

### OAuth (ChatGPT)

ChatGPT only reaches servers over public HTTPS, and only offers OAuth or no authentication. This server does
not log anyone in itself. An identity provider you already trust does that (Auth0, Okta, Keycloak,
Microsoft Entra ID and so on), and the server checks the signed access tokens it issues: signature, issuer,
audience, expiry, scopes and, optionally, which users are allowed. It also publishes the standard OAuth
metadata that tells ChatGPT which provider to use.

1. **Give the server a public HTTPS address.** Either a reverse proxy on a machine you control, or a tunnel,
   for example `cloudflared tunnel --url http://127.0.0.1:8765`. Start the tunnel first, since you need its
   address in step 3. Quick tunnels get a new address each time; a named tunnel or a reverse proxy keeps it.
2. **Set up the identity provider.**
   - Create an API (or resource) whose identifier, the token *audience*, is `https://<public address>/mcp`.
     If your provider can't use a URL as the audience (Entra ID uses `api://...`), set
     `MARTI_MCP_OAUTH_AUDIENCE` to what it uses.
   - Make it issue JWT access tokens signed with RS256 (the usual default).
   - Optionally add a scope such as `marti:read`, and require it with `MARTI_MCP_OAUTH_SCOPES`.
   - **Turn off public sign-up**, and add only the people who should see the data.
   - Either enable dynamic client registration, so ChatGPT registers itself, or create an application for
     ChatGPT and enter its client ID and secret in ChatGPT's connector form.
3. **Start the server:**
   ```bash
   export MARTI_MCP_OAUTH_ISSUER=https://your-tenant.example-idp.com/   # exactly as in your tokens' "iss"
   export MARTI_MCP_ALLOWED_USERS="you@example.org colleague@example.org" # optional second check, by email or sub
   python server.py --http --public-url https://<public address>
   ```
4. **Add it to ChatGPT.** Turn on Developer mode (Settings → Apps → Advanced settings), create an app with the
   URL `https://<public address>/mcp` and OAuth authentication, and log in when asked. In a chat, choose
   Developer mode from the + menu and select the app. OpenAI moves these menus from time to time, so follow
   its current Developer mode guide if they differ.

Bear in mind that tool results, such as abundance tables and pathogen hits, are sent to OpenAI as part of the
conversation.

**Tunnels and reverse proxies.** The SDK rejects requests addressed to host names it doesn't know (a
protection against DNS-rebinding attacks), so `--public-url` also tells the server to accept its public
host name. Use `--allowed-host` for any other name a proxy forwards.

## Use it from code, with any model

```bash
python agent.py --provider anthropic --model claude-sonnet-5-5 "Which human pathogens are in project bambi?"
python agent.py --provider openai --model <model> "..."                                     # OpenAI
python agent.py --provider openai --base-url http://localhost:11434/v1 --model qwen3:32b "..." # Ollama
python agent.py --provider openai --base-url http://localhost:8000/v1 --model <model> "..."    # vLLM / llama.cpp
python agent.py --provider anthropic --model ... --profile food_environment_unusual "Target X; reference Y, Z"
```

The tools and analysis are the same for every provider. Each adapter is about 30 lines.
Smaller local models vary a lot in how reliably they call tools, so test yours with the evaluation idea below.

## Tools

| Tool | Purpose |
|---|---|
| `list_samples(project?)` | Inventory: dates, depth, run status, location and metadata keywords |
| `find_samples(taxon?, date_from?, date_to?, location?, near_lat?, near_lon?, within_km?, keywords?, ...)` | Samples meeting every criterion, with the evidence: a taxon present (by default at each sample's lowest non-zero minimum abundance; abbreviations such as "E. coli" resolved), a date range, location words, a distance from a point (coordinates from the metadata `location`, as the GUI's sample map uses; estimates can be supplied for named places and are flagged), keywords, run or name |
| `sample_overview(sample)` | Read stats, status, database, metadata and alerts. The model should call this first. |
| `taxa_table(sample, rank, min_support)` | Top taxa, selected by MARTi's simplified rank as in the GUI. Separates `reads_in_clade` from `reads_assigned_exactly_here`. |
| `search_taxa(query, ...)` | Name search across samples, like the GUI's taxon filter |
| `taxon_across_samples(taxon, ...)` | One taxon across samples, ordered by date. Includes sub-taxa and reads unresolved at the parent. |
| `list_reference_lists()` / `screen_samples(list_id, ...)` | Screens by NCBI taxid, including all descendants, on the unfiltered tree. Also accepts `projects.json` heatmap presets (`project:<project>:<preset>`). Adds BLAST identity evidence when `lcaparse` files exist, and the AMR genes whose reads were classified to each hit. |
| `compare_samples(a, b)` | Bray–Curtis and Aitchison distances, and taxa higher in each sample (CLR) |
| `unusual_features(target, reference)` | Outlier score versus a baseline set; elevated, depleted, novel and missing taxa |
| `alpha_diversity(samples, rank, unit)` | S, Shannon, Pielou, Simpson, 1/D, Simpson evenness, Chao1 and rarefied richness, as MARTi computes them. Also shows how diversity changed during the run (MARTi ≥ 1.0). With groups, adds each group's mean, min and max, as the GUI's diversity plot, and a test of group differences. |
| `beta_diversity(samples, method, rank)` | Distance matrix, PCoA and UPGMA tree, as the GUI's Ordination, Dendrogram and Distance matrix tabs. With groups, also tests how well they separate. |
| `compare_groups(..., group_by or groups)` | How groups of samples differ: overall separation (PERMANOVA and a dispersion check), taxa that differ (centred log-ratios, permutation tests, false-discovery-rate q-values), taxa found in only one group, diversity by group, and AMR drug classes and priority genes by group |
| `cooccurrence(samples, method)` | `proportionality` (default; rho on CLR data, needs 5+ samples), `jaccard` (as the GUI network) or `spearman`/`pearson` (as the GUI correlation matrix) |
| `get_amr(sample, ...)` | CARD genes in one sample: drug class, mechanism, family, reads, priority flag, reads on plasmid, host taxa, and optional CARD descriptions |
| `amr_across_samples(..., by, query)` | AMR reads across samples by gene, drug class, family or mechanism, ordered by date, as counts, % of AMR reads and reads per million (like the GUI's AMR heatmap) |
| `screen_amr(samples)` | Priority resistance genes (carbapenemases, *mcr*, ESBLs, *vanA*/*vanB*, *mecA*, 16S methyltransferases, *cfr*/*optrA*, *tet(X)*), with hosts and plasmid evidence |
| `get_narrative_inputs(sample)` / `save_narrative(sample, summary, sections)` | Lets the model in an MCP client write the GUI's narrative itself: the first gives exactly what the GUI's generator would send a model, the second runs the same checks and saves `narrative.json`. `save_narrative` is the only tool that writes, and is labelled as such. |
| `sequencing_saturation` | Accumulation-curve plateau and Shannon stability |

**Sample groups** are defined the same ways as on the GUI's Compare page:

- `group_by="project"`: the `sampleGroups` list in `projects.json` (`runId`, `sampleId`, `group`), validated
  exactly as the GUI does. This is the default when a project is named.
- `group_by="location"` or `"date"`: from each sample's metadata, using the GUI's rules: site name, else
  coordinates; dates normalised to YYYY-MM-DD.
- `group_by="run"`.
- `groups={"group name": [samples]}`: explicit groups, such as those a GUI user has edited in their browser.

Group tests permute the group labels, so they make no assumptions about distributions. When there are
10,000 or fewer possible relabellings, all of them are tested (an exact test); otherwise 9,999 random ones
from a fixed seed, so results are reproducible. Every result reports the group sizes and the smallest
p-value the design allows. With small groups the tools say so, and present results as a ranking rather than
as findings.

Prompts: `human_pathogen_screen`, `food_spoilage_review`, `food_environment_unusual`, `cross_sample_trends`.
They are Markdown files in `marti_llm/profiles/`, so you can add a new sample type without writing code.

## Reference lists: curate before use

The lists in `marti_llm/reference_lists/` are **illustrative starter lists**.

`amr_priority_genes.json` matches CARD gene families, or gene-name patterns, to a priority:
critical, high, medium or low. It also has a "likely intrinsic / mutation model" category, covering
efflux pumps, *rpoB*, porins and chromosomal AmpC such as ACT, so the model downweights those genes.
In the example data they make up most AMR hits. Variant-level calls, such as which SHV or TEM variants
are ESBLs, are flagged as variant-dependent rather than decided.

The outdoor air profile adds three lists: `plant_pathogens` (airborne crop and tree pathogens: rusts, mildews,
blights), `airborne_allergens` (allergenic fungal spores and pollen) and `low_biomass_contaminants` (genera common in
extraction kits and reagents, plus human DNA). Their taxonomy IDs could not all be checked against NCBI when they were
written; the 14 that occur in MARTi's example data match. Screening now ignores a list ID whose name in your taxonomy
belongs to a different genus, and reports it in `list_validation_warnings`, so a wrong ID causes a miss, never a hit
reported under the wrong organism.

Before relying on the lists:

- Check the hazard groups against the current ACDP Approved List.
- Add your organisation's own spoilage and indicator organisms.

The 38 entries whose taxa occur in MARTi's example data were confirmed to match their names. The rest
are validated at runtime: `screen_samples` reports `list_validation_warnings` if a taxid's name in
your taxonomy differs from the list.

## Things the design deliberately handles

- **Minimum-support thresholds.** Screening defaults to `tree_ms0.0` (unfiltered), because low-level
  hazards sit below the GUI's 0.1% default. Overview tables default to 0.1.
  On MARTi's 9 example samples, a genus/species table is about 3.7k tokens at ms0.1 but about 61k at ms0.0.
- **LCA semantics.** Reads stuck at genus or family level are reported, not hidden. A
  *Salmonella enterica* hit shows how many further reads were only resolved to *Salmonella*.
- **Compositional data.** Comparisons use CLR transformation and proportionality, not raw-percentage correlation.
- **Live runs.** `still_running` is flagged on every screen result, and files are re-read on change.
- **Absence claims.** The classification database and saturation curve are surfaced, so the model can
  say whether "not detected" means anything.
- **Matching the GUI.** Diversity and comparison tools use MARTi's own rules and defaults, so
  numbers the LLM quotes can be checked on the GUI's Compare page. Taxa are selected by simplified rank,
  so "species group" counts at genus. For alpha diversity, a lineage stopping above the rank counts as one
  taxon. The defaults are a pseudocount of 0.5 and a minimum prevalence of 1 sample. Chao1 is reported
  only for read counts at min_support 0.

## Next steps

1. **More chat links.** The GUI chat links to tabs and cards. Next: links that also set something, such as
   highlighting a taxon in the heatmap or choosing the rank, and suggested settings the user applies with a click.
2. **Deterministic alerts in the engine.** The commented-out `MARTiMLAnalysis` hook in
   `ReadProcessor` is a natural place for a per-chunk taxid screen that raises a `MARTiAlert`.
   That needs no LLM and reuses `alerts.json`.
3. **Evaluation set.** Take mock communities and past runs with known answers, plus a fixed question
   list, and score each model and prompt change.

## Narrative analysis for the MARTi GUI

`marti_llm.narrate` writes a short narrative of one sample's results into `narrative.json` in the sample folder. The
MARTi GUI runs it when someone clicks *Generate narrative analysis* on the dashboard (see the MARTi docs, "Narrative
analysis (AI)"); it also works on its own:

```bash
export MARTI_LLM_API_KEY=...        # not needed for most local servers
python -m marti_llm.narrate --sample-dir <run>/marti/<sample> --provider anthropic --model <model>
python -m marti_llm.narrate --sample-dir ... --provider openai-compatible --base-url http://localhost:1234/v1 --model <model>
python -m marti_llm.narrate --sample-dir ... --dry-run     # the analyses and prompt size, no model call
python -m marti_llm.narrate --check --provider ... --model ...
```

1. **Fixed analyses.** It runs a fixed set of analyses: overview and data quality, top species and genera, screens
   against the curated organism lists, priority resistance genes and their hosts, diversity and saturation. The
   sample-type profile is chosen from the metadata keywords (`general`, `clinical`, `food_environment`,
   `environmental` or `outdoor_air`), and decides which organism lists are screened and what the narrative emphasises. The guidance
   for each profile is a Markdown file in `marti_llm/profiles/narrative/`.
2. **One model request.** The results go to the model in one request, with no tools. For the example sample this
   is about 2,100 tokens, which suits small local models. Answers wrapped in code fences or reasoning tags are
   accepted, and a malformed answer is retried once.
3. **Automatic checks.** Every organism, resistance gene and number in the answer is checked against the results
   and the sample's data. Anything that doesn't match is listed in `validation`, and shown on the GUI card.
4. **The narrative file.** `narrative.json` is written atomically. It holds the summary and sections, the model,
   provider and profile, what it was based on (reads analysed, run status), token usage, and the analysis results
   themselves, so anyone can see what the text was based on. It never contains the API key.

### Writing narratives from Claude in the Claude app (no API key)

A Claude subscription doesn't include API access, so the GUI's *Generate* button can't use it. Instead, Claude in
the Claude app can write the narrative through this MCP server: ask it, for example, "Write the narrative analysis
for BAMBI_P8" (or use the `write_narrative` prompt). Claude calls `get_narrative_inputs`, writes the text from those
results, and calls `save_narrative`. That checks the text exactly as the generator does, returns anything flagged
so Claude can correct it, and saves `narrative.json`. The GUI's card picks it up within a few seconds, credited to
the model "through the MARTi MCP server". Any MCP client can do this, LM Studio included.

The MCP server must be able to write to the sample folders. That is the case when Claude Desktop starts it on the
computer that holds the data; for a GUI on a separate machine, the server would need to run there.

## Chat in the MARTi GUI

`marti_llm.chat` answers one question in the GUI's *Ask AI* panel (Compare page and Dashboard). The GUI server
starts it per question and passes the open samples (their folders), the user's groups, what they are viewing, the
places in the GUI the answer may link to, and the conversation on stdin; the API key comes in `MARTI_LLM_API_KEY`.
It runs a tool-calling loop (Anthropic, OpenAI or any OpenAI-compatible server) over the same 18 read-only tools as
the MCP server, from `marti_llm/tools.py`, against a store holding only the open samples, so the model cannot read
or name anything else. Project parameters are hidden. Each tool call is reported as a JSON line, so the panel can
show progress. The answer keeps only links of the form `[text](marti:<target>)` to the places the GUI listed, and
links to samples that are open (rewritten to the GUI's run and sample IDs). Other links become plain text, and
reasoning blocks are removed. After 12 model calls the model must answer from what it has.

On the Samples page the model is given a summary of the listed samples (runs, date range, locations, keywords, the
current selection) rather than the full list, and one extra tool, `select_samples(samples, mode)`. It changes
nothing itself: the selections come back with the answer as `actions`, and the GUI ticks the rows, with Undo.

On every page the model also has `open_view(target, sample?)`, for "open the treemap for sample X": a view on the
current page, or a view on the dashboard of any sample the Samples page lists (matched by run/name, name, or a part of
the name that only one sample has). It too returns an action, which the GUI follows.

    echo '{"page": "compare", "samples": [{"dir": "/data/run1/marti/s1"}], "messages": [{"role": "user", "content": "Summarise"}]}' |
        MARTI_LLM_API_KEY=... python -m marti_llm.chat --provider anthropic --model claude-sonnet-5-5

## Tests

| Test | Needs | Checks |
|---|---|---|
| `tests/smoke_test.py <MARTi>/gui/output` | Python only | Every tool through the MCP layer, on old and new (MARTi ≥ 1.0) output formats |
| `tests/agent_mock_test.py` | Python only | Both provider adapters against mocked APIs, with real tool calls |
| `tests/parity_test.py <MARTi>` | JDK 17+, Node.js | Results identical to MARTi's own Java engine and GUI JavaScript, including the GUI's sample-grouping rules |
| `tests/narrate_test.py <MARTi>/gui/output` | Python only | Narrative generator against a mock LLM (OpenAI-compatible and Anthropic formats): parsing, retries, automatic checks catching an absent organism, an absent gene and a wrong number, profiles, atomic writing, the key kept out of files and the command line |
| `tests/gui_e2e_test.py <MARTi>` | Node.js, Playwright | The real MARTi GUI with the narrative patch, a mock LLM and a headless browser: settings, connection test, generating, display, a second user, the key never reaching a browser, model output shown as text, out-of-date notice, restricted mode (including forged requests) |
| `tests/chat_test.py <MARTi>/gui/output` | Python only | GUI chat against a scripted mock LLM in both formats: tool schemas, tools limited to the open samples, groups, errors returned to the model, link checking and rewriting, history handling, the step limit, the CLI and the key |
| `tests/gui_chat_e2e_test.py <MARTi>` | Node.js, Playwright | The real GUI with the chat panel, a tool-calling mock LLM and a headless browser: setup, progress, answers with links that open tabs and dashboards, download, errors and Stop, conversations kept per set of samples, restricted mode with and without `--restricted-chat` |
| `tests/stats_test.py` | `scikit-bio`, `scipy` | PERMANOVA against scikit-bio; dispersion against vegan's `betadisper` method; per-taxon ANOVA and false-discovery-rate correction against SciPy; exact relabelling; false-positive rate on null data |
| `tests/http_auth_test.py` | `pyjwt[crypto]` | Read-only labels; refusal to serve unauthenticated; access token; public host names; OAuth against a stand-in identity provider (valid, expired, wrong-audience, wrong-issuer, missing-scope, wrong-user and forged tokens) |

## Notes from testing on MARTi's example data

- The co-occurrence tool run across all 9 example samples (5 BAMBI gut, 4 MARC river) mostly finds
  freshwater genera "co-occurring". That reflects the sample-type split, not ecology. The tool reports
  the sample groups and says so. Run it within one project or site.
- The example output in the MARTi repo predates MARTi 1.0, so it has no per-chunk `diversity` series.
  `tests/smoke_test.py` adds one to a temporary copy, in the engine's JSON layout. It also adds
  **synthetic** `metadata.json`, `projects.json` (with a heatmap preset) and a per-read file.
- `tests/agent_mock_test.py` exercises both provider adapters against mocked APIs, with real tool calls.
- Tested with MCP Python SDK 1.30 and 2.3, over stdio and streamable HTTP. The OAuth mode has been tested
  against a stand-in identity provider, not yet against ChatGPT or a real provider.

## Possible issue in the MARTi GUI: AMR counts on the Compare page

`gui/UI/public/js/compare.js` (`updateAmrPlots`, three places) picks each gene's latest chunk with
`chunk > highestChunk`. The chunk keys are strings, so beyond chunk 9 the comparison is alphabetical:
"9" > "10". In MARTi's example data, 39 of 129 gene counts on the Compare AMR heatmap show an earlier
chunk's value. For example, *tet(O)* in BAMBI_P103M shows 22 reads rather than 50. Comparing numerically,
with `Number(chunk) > Number(highestChunk)`, would fix it. marti-llm uses the true latest chunk, and
`tests/smoke_test.py` checks this.

## Changes

**Opening views (20 Nov 2026).** `open_view` in the GUI chat: "open the treemap for sample X".

**Finding and selecting samples (20 Nov 2026).** New `find_samples` tool (MCP server and GUI chat), and the
Samples page chat with `select_samples`. With more than 30 matches the rows are shortened to key, date and evidence,
with counts by location and run, so a search over a whole collection fits in a model's context. Matches whose names
look like controls (NC_, Negative, Positive, PC_, blank) are listed separately, and samples with no location at
all are not offered for estimated positions.

**Chat in the GUI (19 Nov 2026).** New `marti_llm.chat`. The tool functions moved from `server.py` to
`marti_llm/tools.py`, so the MCP server and the GUI chat share them (the MCP tools are unchanged).
`get_narrative_inputs` now says how the profile was chosen and lists the other profiles, so a model asked about an
air sample with no keywords uses `outdoor_air` rather than adapting another profile.

**Outdoor air profile (19 Nov 2026).** New `outdoor_air` narrative profile, chosen by keywords such as *air*,
*bioaerosol* or *pollen* (but not with *indoor*). It reports composition by domain and kingdom, the main fungal genera
and plant families, and screens for plant pathogens, allergens and low-biomass contaminants. The collection time,
temperature and humidity are now included for every profile. Keywords now match from the start of a word, so *hair*
no longer counts as *air*. List IDs pointing at an unrelated organism are now ignored.

**Narratives written by an MCP client (19 Nov 2026).** New `get_narrative_inputs` and `save_narrative` tools
and a `write_narrative` prompt.

**Narrative analysis (19 Nov 2026).**

- New `marti_llm.narrate` and `marti_llm.providers`, and narrative profiles.
- AMR read totals now read both engine formats. Newer engines split the total into reads with an identified host
  (`readsWithAMRHitsAndWalkout`) and reads with no bacterial hit (`readsWithAMRHitsOnly`). `get_amr` reports the
  split, and `amr_across_samples` computes "% of AMR reads" from the combined total; with the new format it was
  previously empty.

**Sample groups (19 Nov 2026).**

- New `compare_groups` tool; `alpha_diversity` and `beta_diversity` accept groups; `list_samples` shows
  project groups.
- Fixed how `metadata.json` is read. The engine writes `sampleLocation`, `sampleDate` (often day-first, such
  as 14/04/25) and `keywords` as one comma-separated string. Previously the location was missed, keywords
  were split into single characters, and day-first dates sorted wrongly. Dates are now normalised as the
  GUI does, which also fixes date ordering in `taxon_across_samples` and `amr_across_samples`.
- The smoke test now uses metadata in the engine's own format.

**HTTP security (18 Nov 2026).**

- Every tool is labelled read-only, non-destructive and idempotent, with a readable title.
- HTTP mode supports an access token (`MARTI_MCP_TOKEN`) or OAuth via an external identity provider
  (`MARTI_MCP_OAUTH_ISSUER`), and refuses to serve beyond this computer without one of them.
- `--public-url` and `--allowed-host` let tunnels and reverse proxies through. Previously the SDK rejected
  their host names, so the earlier instructions for reaching the server through a tunnel would have failed.

**AMR (4 Nov 2026).**

- Added `amr_across_samples` and `screen_amr`, with the `amr_priority_genes` list.
- `screen_samples` now links each pathogen hit to the AMR genes attributed to it.
- `get_amr` adds priority flags, total plasmid reads and optional CARD descriptions.
- Older `amr.json` files, which store hosts as a dict, are also read.

**Updated for MARTi v1.0.x (29 Oct 2026).**

- Added `alpha_diversity`, which replaces `diversity`. It counts taxa the way the engine's new
  `DiversityStats` does: lineages stopping above the rank count as one taxon, and the yield tree is
  used for bases. It adds Chao1, rarefied richness, and the engine's per-chunk diversity series.
- Added `beta_diversity`, ported from the GUI's `services/ordination.js`.
- Added the `jaccard`, `spearman` and `pearson` methods to `cooccurrence`, matching the GUI's new tabs.
- Taxa are now selected by MARTi's simplified rank everywhere.
- `sequencing_saturation` handles the new accumulation curves: `reads` now counts final-run taxa,
  and the old curve is kept as `rawReads`.
- `projects.json` `heatmapTaxaPresets` can now be used as screening lists.
- Added `search_taxa`.
- Added the parity test.
