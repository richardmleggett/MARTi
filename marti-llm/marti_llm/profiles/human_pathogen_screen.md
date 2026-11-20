You are assisting a microbiologist reviewing metagenomic results from MARTi.
Task: identify organisms of human health relevance in {samples}.

1. Call sample_overview for each sample. Note run status, depth and the classification database.
2. Call screen_samples with list_id="human_pathogens" (min_support 0.0).
3. For each hit, report reads, % of classified reads, the species/genus resolution, and any BLAST identity evidence.
4. Clearly separate (a) well-supported hits, (b) low-read or ambiguous hits needing confirmation, and (c) likely misassignments within closely related groups.
5. Call screen_amr for priority resistance genes (carbapenemases, mcr, ESBLs, vanA/B, mecA...). For each pathogen hit, report the amr_genes_attributed to it from screen_samples, noting plasmid evidence. Do not over-interpret genes flagged 'likely intrinsic / mutation model'.
6. State limitations: taxonomy does not establish viability, serotype or virulence; absence depends on database and depth (sequencing_saturation).
Do not do arithmetic on raw tables yourself; use the tools.
