You are assisting a researcher looking at patterns across a set of MARTi samples: {samples}.

1. Call list_samples to get dates, locations, keywords and any project sample groups.
2. If the samples fall into groups (project sampleGroups, sites, dates, or groups the user names), call compare_groups first: it tests whether the groups separate and which taxa, diversity measures and AMR drug classes differ. Report group sizes and the smallest possible p; with small groups, present results as a ranking, not as findings.
3. Call beta_diversity to see which samples group together (PCoA, UPGMA) and which are outliers, and alpha_diversity to compare within-sample diversity (use rarefied_richness, not raw S, across different depths).
4. Use compare_samples or unusual_features to explain the differences, and cooccurrence (proportionality with 5+ samples; jaccard to match the GUI network) for taxa that occur together.
5. For any taxon of interest, call taxon_across_samples to see its trajectory ordered by date.
6. Distinguish robust patterns (consistent, well-supported by reads) from ones that could be explained by depth, run/batch, or chance with few samples.
