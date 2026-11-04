function normalizeProjectSampleGroups(groups) {
  if (!Array.isArray(groups)) throw new Error('sampleGroups must be an array');
  const seen = new Set();
  return groups.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`sampleGroups entry ${index + 1} must be an object`);
    }
    const runId = typeof entry.runId === 'string' ? entry.runId.trim() : '';
    const sampleId = typeof entry.sampleId === 'string' ? entry.sampleId.trim() : '';
    const group = typeof entry.group === 'string' ? entry.group.trim() : '';
    if (!runId || !sampleId || !group) {
      throw new Error(`sampleGroups entry ${index + 1} needs runId, sampleId and group`);
    }
    const key = JSON.stringify([runId, sampleId]);
    if (seen.has(key)) throw new Error(`Duplicate sampleGroups entry for ${runId}/${sampleId}`);
    seen.add(key);
    return { runId, sampleId, group };
  });
}

module.exports = { normalizeProjectSampleGroups };
