function normalizeHeatmapTaxaPresets(presets) {
  if (!Array.isArray(presets)) throw new Error('heatmapTaxaPresets must be an array');

  const seenPresetIds = new Set(['top', 'custom']);
  return presets.map((preset, index) => {
    if (!preset || typeof preset !== 'object' || Array.isArray(preset)) {
      throw new Error(`Preset ${index + 1} must be an object`);
    }
    const id = typeof preset.id === 'string' ? preset.id.trim() : '';
    const name = typeof preset.name === 'string' ? preset.name.trim() : '';
    const denominatorTaxonId = String(preset.denominatorTaxonId == null ? '' : preset.denominatorTaxonId);
    const minimumRootPercent = preset.minimumRootPercent;
    if (!id || seenPresetIds.has(id)) throw new Error(`Preset ${index + 1} needs a unique ID other than top or custom`);
    if (!name) throw new Error(`Preset ${id} needs a name`);
    if (!/^\d+$/.test(denominatorTaxonId)) throw new Error(`Preset ${id} needs a numeric denominator taxon ID`);
    if (typeof minimumRootPercent !== 'number' || !Number.isFinite(minimumRootPercent) ||
        minimumRootPercent < 0 || minimumRootPercent > 100) {
      throw new Error(`Preset ${id} needs a minimumRootPercent between 0 and 100`);
    }
    if (!Array.isArray(preset.taxa) || !preset.taxa.length) throw new Error(`Preset ${id} needs at least one taxon`);

    const seenTaxonIds = new Set();
    const taxa = preset.taxa.map((taxon) => {
      const taxonId = String(taxon && taxon.id != null ? taxon.id : '');
      const taxonName = taxon && typeof taxon.name === 'string' ? taxon.name.trim() : '';
      if (!/^\d+$/.test(taxonId) || !taxonName || seenTaxonIds.has(taxonId)) {
        throw new Error(`Preset ${id} has a taxon with an invalid or duplicate ID or missing name`);
      }
      seenTaxonIds.add(taxonId);
      return { id: taxonId, name: taxonName };
    });
    seenPresetIds.add(id);
    return { id, name, denominatorTaxonId, minimumRootPercent, taxa };
  });
}

module.exports = { normalizeHeatmapTaxaPresets };
