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

module.exports = { sampleHasTaxon };
