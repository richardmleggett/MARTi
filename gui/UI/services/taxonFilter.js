function sampleHasTaxon(tree, taxonId) {
  if (!tree || !/^\d+$/.test(String(taxonId))) return false;

  const nodes = [tree];
  while (nodes.length) {
    const node = nodes.pop();
    if (String(node.ncbiID) === String(taxonId)) {
      return Number(node.summedValue) > 0;
    }
    if (Array.isArray(node.children)) nodes.push(...node.children);
  }
  return false;
}

const treeTaxaCache = new WeakMap();

function taxaInTree(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (treeTaxaCache.has(tree)) return treeTaxaCache.get(tree);
  const taxa = [];
  const nodes = [tree];
  while (nodes.length) {
    const node = nodes.pop();
    if (node && Number(node.summedValue) > 0 && /^\d+$/.test(String(node.ncbiID)) &&
        typeof node.name === 'string' && node.name.trim()) {
      taxa.push({ id: String(node.ncbiID), name: node.name.trim(), rank: String(node.ncbiRank || '') });
    }
    if (node && Array.isArray(node.children)) nodes.push(...node.children);
  }
  treeTaxaCache.set(tree, taxa);
  return taxa;
}

function suggestTaxa(trees, query, limit = 20) {
  const term = String(query || '').trim().toLocaleLowerCase();
  const numeric = /^\d+$/.test(term);
  if (term.length < 2 && !numeric) return [];
  const matches = new Map();
  for (const tree of trees) {
    for (const taxon of taxaInTree(tree)) {
      const name = taxon.name.toLocaleLowerCase();
      if ((name.includes(term) || (numeric && taxon.id.includes(term))) && !matches.has(taxon.id)) {
        matches.set(taxon.id, taxon);
      }
    }
  }
  return Array.from(matches.values()).sort((a, b) => {
    const score = taxon => numeric && taxon.id === term ? 0
      : numeric && taxon.id.startsWith(term) ? 1
      : numeric && taxon.id.includes(term) ? 2
      : taxon.name.toLocaleLowerCase() === term ? 3
      : taxon.name.toLocaleLowerCase().startsWith(term) ? 4 : 5;
    return score(a) - score(b) ||
      a.name.localeCompare(b.name) || a.id.localeCompare(b.id, undefined, { numeric: true });
  }).slice(0, limit);
}

module.exports = { sampleHasTaxon, suggestTaxa };
