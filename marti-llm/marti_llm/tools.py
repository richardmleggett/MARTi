"""
The MARTi analysis tools, shared by the MCP server (server.py) and the GUI's chat (marti_llm.chat).

Each tool is a plain function over the module-level `store`, set with configure(): the MCP server uses every
sample under MARTI_DIRS; the GUI chat uses only the samples being compared. Errors are returned as data so a model
can correct its call.
"""
from __future__ import annotations

import functools

from marti_llm import analysis as A
from marti_llm import groups as GR
from marti_llm import narrate as N
from marti_llm.data import MartiStore

store: MartiStore | None = None


def configure(new_store: MartiStore) -> MartiStore:
    global store
    store = new_store
    return store


INSTRUCTIONS = """\
Tools over MARTi (Metagenomic Analysis in Real Time) results. Guidance:
- Use the tools for all counts, percentages and statistics; do not compute them from raw tables yourself.
- Abundances are read-based and relative (compositional). 'reads_in_clade' includes descendants;
  'reads_assigned_exactly_here' are reads the LCA could not resolve further.
- Trees exist at several minimum-support thresholds (min_support, % of reads). 0.0 is unfiltered and best
  for screening for low-level organisms; 0.1 matches the GUI default and is better for overviews.
- Ranks are MARTi's simplified ranks (domain, kingdom, phylum, class, order, family, genus, species,
  subspecies). Diversity and distance tools reproduce the MARTi GUI's calculations and defaults exactly, so
  the user can check results on the GUI's Compare page; say which settings you used.
- Check sample_overview first: runs may still be in progress, and detection depends on the database used.
- Taxonomic hits are evidence of sequence similarity, not viability, serotype or virulence. Flag low-read
  and closely-related-group calls as presumptive.
- Sample references can be 'run/sample' keys, sample ids or display names (see list_samples).
- Narratives for the MARTi GUI: only when the user asks for one, call get_narrative_inputs, write the text from
  its analysis_results following its instructions, then call save_narrative. Fix anything its checks flag.
- Groups of samples, for compare_groups and the diversity tools, are given as group_by ("project" for
  projects.json sampleGroups, or "location", "date", "run" from sample metadata) or as explicit groups
  {"group name": [samples]}. Group tests are permutation tests: report the group sizes and the smallest
  possible p, and treat results from very small groups as descriptive.
"""


def _grouping(samples, project, group_by, groups):
    if not (group_by or groups):
        return None
    return GR.resolve_groups(store, samples, project, group_by, groups)



def safe(fn):
    """Return errors to the model as data rather than failing the call."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except (KeyError, ValueError, FileNotFoundError, PermissionError) as e:
            return {"error": str(e.args[0]) if e.args else str(e)}
    return wrapper


# ------------------------------------------------------------------ inventory
@safe
def list_samples(project: str | None = None) -> dict:
    """List MARTi samples (optionally only those in a project from projects.json) with date,
    depth, run status, location, metadata keywords (which often indicate sample type) and, where the project
    defines them, sample groups."""
    return A.list_samples(store, project)


@safe
def sample_overview(sample: str) -> dict:
    """Run statistics, analysis status, classification database, metadata and recent alerts for one
    sample. Call this before interpreting a sample."""
    return A.sample_overview(store.get(sample))


# ------------------------------------------------------------------ taxa
@safe
def taxa_table(sample: str, rank: str = "genus", min_support: float = 0.1,
               top_n: int = 30, min_reads: int = 1) -> dict:
    """Most abundant taxa in one sample at a rank (superkingdom, phylum, class, order, family,
    genus, species), with read counts and % of classified reads."""
    return A.taxa_table(store.get(sample), rank, min_support, top_n, min_reads)


@safe
def search_taxa(query: str, samples: list[str] | None = None, project: str | None = None,
                min_support: float = 0.0) -> dict:
    """Find taxa whose names contain the query (exact, then prefix, then substring matches), with how many
    samples contain each. Use to resolve spellings or find which taxa of a group are present."""
    return A.search_taxa(store.resolve(samples, project), query, min_support)


@safe
def taxon_across_samples(taxon: str, samples: list[str] | None = None, project: str | None = None,
                         min_support: float = 0.0) -> dict:
    """Abundance of one taxon (name or NCBI taxid) in each sample, ordered by date, including how many
    reads were only resolved to its parent and its main sub-taxa. Use for trends and persistence."""
    return A.taxon_across_samples(store.resolve(samples, project), taxon, min_support)


@safe
def find_samples(taxon: str | None = None, min_reads: int = 1, min_percent: float | None = None,
                 min_support: float | None = None, date_from: str | None = None, date_to: str | None = None,
                 location: list[str] | None = None, near_lat: float | None = None, near_lon: float | None = None,
                 within_km: float | None = None, estimated_coordinates: dict[str, list[float]] | None = None,
                 keywords: list[str] | None = None, run: str | None = None, name: str | None = None,
                 samples: list[str] | None = None, project: str | None = None) -> dict:
    """Find the samples that meet every criterion given, with the evidence for each: a taxon present (name,
    taxid or abbreviation such as "E. coli"; at least min_reads reads and optionally min_percent of classified
    reads; by default at the lowest non-zero minimum abundance each sample has, or min_support if given), a
    collection-date range (date_from/date_to as YYYY-MM-DD, inclusive), location words (any of them), a
    distance (within_km of near_lat/near_lon, using coordinates written in the metadata location), keywords (all
    of them), or run or sample name text. Samples without coordinates are listed by location name; to include
    them, call again with estimated_coordinates {location name: [lat, lon]} and say the distances are estimates."""
    return A.find_samples(store.resolve(samples, project), taxon, min_reads, min_percent, min_support, date_from,
                          date_to, location, near_lat, near_lon, within_km, estimated_coordinates, keywords, run,
                          name)


# ------------------------------------------------------------------ screening
@safe
def list_reference_lists() -> list[dict]:
    """Organism lists available for screen_samples: curated lists (human_pathogens, food_spoilage,
    hygiene_indicators) plus any heatmap taxa presets defined per project in projects.json
    (ids like "project:<project>:<preset>")."""
    return A.available_lists(store)


@safe
def screen_samples(list_id: str, samples: list[str] | None = None, project: str | None = None,
                   min_support: float = 0.0, min_reads: int = 1, include_amr: bool = True) -> dict:
    """Screen samples against a curated organism list by NCBI taxid (including all descendant taxa).
    Returns hits with reads, %, resolution, list notes, BLAST identity evidence where available, and the AMR
    genes whose reads were classified to each hit (with priority and plasmid evidence)."""
    return A.screen_samples(store.resolve(samples, project), list_id, min_support, min_reads, store=store,
                            include_amr=include_amr)


# ------------------------------------------------------------------ comparisons
@safe
def compare_samples(sample_a: str, sample_b: str, rank: str = "genus", min_support: float = 0.1,
                    top_n: int = 15) -> dict:
    """Compare two samples: distances, shared taxa, and taxa most higher in each (CLR log-ratio)."""
    return A.compare_samples(store.get(sample_a), store.get(sample_b), rank, min_support, top_n)


@safe
def unusual_features(target: str, reference: list[str] | None = None, reference_project: str | None = None,
                     rank: str = "genus", min_support: float = 0.1, top_n: int = 15) -> dict:
    """What is unusual about a target sample relative to a reference set (e.g. earlier samples from the
    same site): overall outlier score, elevated/depleted taxa, taxa unique to or missing from the target."""
    ref = store.resolve(reference, reference_project)
    return A.unusual_features(store.get(target), ref, rank, min_support, top_n)


@safe
def beta_diversity(samples: list[str] | None = None, project: str | None = None, method: str = "brayCurtis",
                   rank: str = "genus", min_support: float = 0.1, min_prevalence: int = 1,
                   pseudocount: float = 0.5, group_by: str | None = None,
                   groups: dict[str, list[str]] | None = None) -> dict:
    """Between-sample distances (method "brayCurtis" or "aitchison"), PCoA ordination (3+ samples) and UPGMA
    clustering, identical to the MARTi GUI's Ordination/Dendrogram/Distance matrix tabs. Use to find clusters of
    similar samples and outliers. min_prevalence = minimum number of samples a taxon must occur in. With groups,
    also labels each sample and tests how well the groups separate (PERMANOVA, dispersion)."""
    g = _grouping(samples, project, group_by, groups)
    chosen = g.samples + g.ungrouped if g else store.resolve(samples, project)
    return A.beta_diversity(chosen, method, rank, min_support, min_prevalence, pseudocount, grouping=g)


@safe
def cooccurrence(samples: list[str] | None = None, project: str | None = None, rank: str = "genus",
                 min_support: float = 0.1, method: str = "proportionality", min_prevalence: float = 0.3,
                 top_n: int = 20, min_total_reads: int = 20) -> dict:
    """Taxa that occur together across samples. method: "proportionality" (rho on CLR data, compositionally
    sound, 5+ samples; default), "jaccard" (presence/absence network as the GUI Co-occurrence tab), or
    "spearman"/"pearson" (relative-abundance correlation as the GUI Taxon correlation tab). Best run within
    one sample type/site (e.g. a project)."""
    return A.cooccurrence(store.resolve(samples, project), rank, min_support, method, min_prevalence, top_n,
                          min_total_reads=min_total_reads)


# ------------------------------------------------------------------ other
@safe
def alpha_diversity(samples: list[str] | None = None, project: str | None = None, rank: str = "species",
                    min_support: float = 0.1, unit: str = "reads", group_by: str | None = None,
                    groups: dict[str, list[str]] | None = None) -> dict:
    """Within-sample diversity for one or more samples, computed exactly as MARTi does: richness S, Shannon,
    Pielou, Simpson, inverse Simpson, Simpson evenness, Chao1 (min_support 0 only), rarefied richness at a
    common depth, and how diversity changed during the run (MARTi >= 1.0). unit: "reads" or "bases". With
    groups, adds each group's mean, min and max (as the GUI's diversity plot) and a test of group differences."""
    g = _grouping(samples, project, group_by, groups)
    chosen = g.samples + g.ungrouped if g else store.resolve(samples, project)
    return A.alpha_diversity(chosen, rank, min_support, unit, grouping=g)


@safe
def compare_groups(samples: list[str] | None = None, project: str | None = None, group_by: str | None = None,
                   groups: dict[str, list[str]] | None = None, rank: str = "genus", min_support: float = 0.1,
                   method: str = "brayCurtis", top_n: int = 15, include_amr: bool = True) -> dict:
    """How groups of samples differ (e.g. drains vs surfaces, before vs after cleaning, site A vs site B):
    whether the groups separate overall (PERMANOVA and a dispersion check on Bray-Curtis or Aitchison
    distances), which taxa differ (centred log-ratios, permutation tests, false-discovery-rate q-values), taxa
    found in only one group, diversity by group, and AMR drug classes and priority genes by group. Returns
    summaries per group, so it suits large sample sets. Defaults to the project's groups when a project is
    named."""
    g = GR.resolve_groups(store, samples, project, group_by, groups)
    return A.compare_groups(g, rank, min_support, method, top_n=top_n, include_amr=include_amr)


@safe
def sequencing_saturation(sample: str, rank: str = "species", min_support: float = 0.1) -> dict:
    """Whether new taxa were still being discovered at the end of the run (from MARTi's accumulation
    curves), and whether Shannon diversity had stabilised. Use before claiming an organism is absent."""
    return A.sequencing_saturation(store.get(sample), rank, min_support)


@safe
def get_amr(sample: str, drug_class: str | None = None, min_reads: int = 1, top_n: int = 40,
            include_descriptions: bool = False) -> dict:
    """Antimicrobial resistance genes (CARD) detected in one sample: drug class, mechanism, family, read counts,
    priority flag (e.g. carbapenemase, or 'likely intrinsic'), reads on plasmid, and the taxa the reads were
    assigned to. include_descriptions adds CARD's gene descriptions."""
    return A.amr_summary(store.get(sample), drug_class, min_reads, top_n, include_descriptions)


@safe
def amr_across_samples(samples: list[str] | None = None, project: str | None = None, by: str = "gene",
                       query: str | None = None, min_reads: int = 1, top_n: int = 30) -> dict:
    """AMR reads across samples ordered by date, like the GUI's AMR heatmap: rows by gene, drug_class, family
    or mechanism, with counts, % of AMR reads and reads per million. query filters by substring of gene, drug
    class, family or mechanism (e.g. "carbapenem", "KPC", "tet("). Use for trends and 'which samples carry X'."""
    return A.amr_across_samples(store.resolve(samples, project), by, query, min_reads, top_n)


@safe
def screen_amr(samples: list[str] | None = None, project: str | None = None, min_reads: int = 1,
               include_low: bool = False) -> dict:
    """Screen samples for AMR genes of clinical/public-health priority (carbapenemases, mcr, ESBLs, vanA/B,
    mecA, 16S methyltransferases, cfr/optrA, tet(X), ...) using the amr_priority_genes list, with host
    attribution and plasmid evidence. include_low adds lower-priority acquired genes (e.g. erm)."""
    return A.screen_amr(store.resolve(samples, project), min_reads, include_low)


# ------------------------------------------------------------------ narratives written by the client's model
@safe
def get_narrative_inputs(sample: str, profile: str = "auto") -> dict:
    """Everything needed to write a narrative analysis of one sample for the MARTi GUI's dashboard card: the
    analysis results, the writing instructions for the sample type and the sections to write. These are exactly
    what the GUI's own generator sends to a model. profile: auto (from metadata keywords), general, clinical,
    food_environment, environmental or outdoor_air (air, bioaerosol and spore-trap samples). If the user says
    what kind of sample it is, pass that profile: many samples have no metadata keywords, and auto then gives
    general."""
    return N.narrative_inputs(store.get(sample), profile)


@safe
def save_narrative(sample: str, summary: str, sections: list[dict[str, str]], profile: str = "auto",
                   model: str = "") -> dict:
    """Save a narrative analysis you have written (after get_narrative_inputs) as narrative.json in the sample's
    folder, where the MARTi GUI shows it. sections: [{"title": ..., "text": ...}] in the order given by
    get_narrative_inputs; use the same profile. model: the name of the model writing it, if known. Every
    organism, resistance gene and number is checked against the analysis results, and anything that does not
    match is returned under validation: correct real errors and save again. Replaces any existing narrative."""
    return N.save_narrative(store.get(sample), summary, sections, profile, model=model)


READ_TOOLS = [
    (list_samples, "List samples"), (find_samples, "Find samples"), (sample_overview, "Sample overview"),
    (taxa_table, "Taxa table"),
    (search_taxa, "Search taxa"), (taxon_across_samples, "Taxon across samples"),
    (list_reference_lists, "List reference lists"), (screen_samples, "Screen samples against an organism list"),
    (compare_samples, "Compare two samples"), (unusual_features, "Unusual features vs reference samples"),
    (beta_diversity, "Beta diversity"), (compare_groups, "Compare groups of samples"),
    (cooccurrence, "Co-occurrence"), (alpha_diversity, "Alpha diversity"),
    (sequencing_saturation, "Sequencing saturation"), (get_amr, "AMR genes in a sample"),
    (amr_across_samples, "AMR across samples"), (screen_amr, "Screen for priority AMR genes"),
]
