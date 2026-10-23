function taxonCountsAtRank(tree, rank) {
  const counts = new Map();
  const stack = tree ? [tree] : [];
  while (stack.length) {
    const node = stack.pop();
    if (Number(node.rank) === rank && /^\d+$/.test(String(node.ncbiID))) {
      const count = Number(node.summedValue);
      if (Number.isFinite(count) && count > 0) counts.set(String(node.ncbiID), count);
      continue;
    }
    if (Array.isArray(node.children)) stack.push(...node.children);
  }
  return counts;
}

function centeredGram(distances) {
  const n = distances.length;
  const squared = distances.map(row => row.map(value => value * value));
  const rowMean = squared.map(row => row.reduce((sum, value) => sum + value, 0) / n);
  const grandMean = rowMean.reduce((sum, value) => sum + value, 0) / n;
  return squared.map((row, i) => row.map((value, j) =>
    -0.5 * (value - rowMean[i] - rowMean[j] + grandMean)));
}

function symmetricEigen(matrix) {
  const n = matrix.length;
  const a = matrix.map(row => row.slice());
  const vectors = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  for (let sweep = 0; sweep < 60; sweep++) {
    let largest = 0;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p][q];
        largest = Math.max(largest, Math.abs(apq));
        if (Math.abs(apq) < 1e-12) continue;
        const tau = (a[q][q] - a[p][p]) / (2 * apq);
        const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;
        const app = a[p][p];
        const aqq = a[q][q];
        a[p][p] = app - t * apq;
        a[q][q] = aqq + t * apq;
        a[p][q] = a[q][p] = 0;
        for (let k = 0; k < n; k++) {
          if (k !== p && k !== q) {
            const akp = a[k][p];
            const akq = a[k][q];
            a[k][p] = a[p][k] = c * akp - s * akq;
            a[k][q] = a[q][k] = s * akp + c * akq;
          }
          const vkp = vectors[k][p];
          const vkq = vectors[k][q];
          vectors[k][p] = c * vkp - s * vkq;
          vectors[k][q] = s * vkp + c * vkq;
        }
      }
    }
    if (largest < 1e-10) break;
  }
  return Array.from({ length: n }, (_, i) => ({
    value: a[i][i], vector: vectors.map(row => row[i])
  })).sort((left, right) => right.value - left.value);
}

function calculateSampleDistances(samples, options, minimumSamples) {
  const rank = Number(options.rank);
  const method = options.method;
  const minimumPrevalence = Number(options.minimumPrevalence);
  const pseudocount = Number(options.pseudocount);
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) throw new Error('Choose a single taxonomic rank.');
  if (method !== 'brayCurtis' && method !== 'aitchison') throw new Error('Unknown distance method.');
  if (!Number.isInteger(minimumPrevalence) || minimumPrevalence < 1) {
    throw new Error('Minimum prevalence must be a positive whole number.');
  }
  if (method === 'aitchison' && (!Number.isFinite(pseudocount) || pseudocount < 0)) {
    throw new Error('Pseudocount must be zero or greater.');
  }

  const withCounts = samples.filter(sample => sample && sample.tree).map(sample => ({
    name: sample.name, runId: sample.runId, tree: sample.tree,
    counts: taxonCountsAtRank(sample.tree, rank)
  })).filter(sample => sample.counts.size > 0);
  if (withCounts.length < minimumSamples) throw new Error('Select at least ' +
    (minimumSamples === 2 ? 'two' : 'three') + ' samples with taxa at this rank and LCA cutoff.');
  if (withCounts.length > 80) throw new Error('Select no more than 80 samples for this analysis.');

  const prevalence = new Map();
  withCounts.forEach(sample => sample.counts.forEach((_, id) =>
    prevalence.set(id, (prevalence.get(id) || 0) + 1)));
  const taxa = [...prevalence.keys()].filter(id => prevalence.get(id) >= minimumPrevalence).sort();
  if (!taxa.length) throw new Error('No taxa meet the minimum prevalence.');
  if (method === 'aitchison' && taxa.length < 2) {
    throw new Error('Aitchison distance needs at least two retained taxa.');
  }

  const included = withCounts.map(sample => {
    const values = taxa.map(id => sample.counts.get(id) || 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    const rootTotal = Number(sample.tree.summedValue) || 0;
    return { name: sample.name, runId: sample.runId, values, total,
      coveragePercent: rootTotal > 0 ? 100 * total / rootTotal : 0 };
  }).filter(sample => sample.total > 0);
  if (included.length < minimumSamples) throw new Error('Fewer than ' +
    (minimumSamples === 2 ? 'two' : 'three') + ' samples have reads in the retained taxa.');

  let transformed;
  if (method === 'brayCurtis') {
    transformed = included.map(sample => sample.values.map(value => value / sample.total));
  } else {
    if (pseudocount === 0 && included.some(sample => sample.values.some(value => value === 0))) {
      throw new Error('A positive pseudocount is required when taxa are absent from a sample.');
    }
    transformed = included.map(sample => {
      const logs = sample.values.map(value => Math.log(value + pseudocount));
      const mean = logs.reduce((sum, value) => sum + value, 0) / logs.length;
      return logs.map(value => value - mean);
    });
  }

  const n = included.length;
  const distances = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distance = method === 'brayCurtis' ?
        transformed[i].reduce((sum, value, k) => sum + Math.abs(value - transformed[j][k]), 0) / 2 :
        Math.sqrt(transformed[i].reduce((sum, value, k) =>
          sum + (value - transformed[j][k]) ** 2, 0));
      distances[i][j] = distances[j][i] = distance;
    }
  }

  return { method, rank, minimumPrevalence, pseudocount, taxa, included, distances };
}

function calculateOrdination(samples, options) {
  const { method, rank, minimumPrevalence, pseudocount, taxa, included, distances } =
    calculateSampleDistances(samples, options, 3);

  let eigen = symmetricEigen(centeredGram(distances));
  const largest = Math.max(1, eigen[0].value);
  let lingoesConstant = 0;
  if (method === 'brayCurtis' && eigen[eigen.length - 1].value < -largest * 1e-8) {
    lingoesConstant = -eigen[eigen.length - 1].value;
    const corrected = distances.map((row, i) => row.map((value, j) =>
      i === j ? 0 : Math.sqrt(value * value + 2 * lingoesConstant)));
    eigen = symmetricEigen(centeredGram(corrected));
  }
  const positive = eigen.filter(item => item.value > Math.max(1, eigen[0].value) * 1e-9);
  if (!positive.length) throw new Error('The selected samples have identical taxon profiles.');
  const positiveTotal = positive.reduce((sum, item) => sum + item.value, 0);
  const points = included.map((sample, i) => ({
    name: sample.name, runId: sample.runId, coveragePercent: sample.coveragePercent,
    x: Math.sqrt(positive[0].value) * positive[0].vector[i],
    y: positive[1] ? Math.sqrt(positive[1].value) * positive[1].vector[i] : 0
  }));
  return {
    method, rank, minimumPrevalence, pseudocount: method === 'aitchison' ? pseudocount : null,
    featureCount: taxa.length, sampleCount: points.length,
    excludedCount: samples.length - points.length,
    axisPercent: [positive[0].value / positiveTotal * 100,
      positive[1] ? positive[1].value / positiveTotal * 100 : 0],
    lingoesConstant, points, distances
  };
}

function calculateDistanceMatrix(samples, options) {
  const { method, rank, minimumPrevalence, pseudocount, taxa, included, distances } =
    calculateSampleDistances(samples, options, 2);
  return {
    method, rank, minimumPrevalence,
    pseudocount: method === 'aitchison' ? pseudocount : null,
    featureCount: taxa.length, sampleCount: included.length,
    excludedCount: samples.length - included.length,
    samples: included.map(sample => ({
      name: sample.name, runId: sample.runId, coveragePercent: sample.coveragePercent
    })),
    distances
  };
}

function calculateDendrogram(samples, options) {
  const { method, rank, minimumPrevalence, pseudocount, taxa, included, distances } =
    calculateSampleDistances(samples, options, 2);
  let nextId = included.length;
  let active = included.map((sample, i) => ({
    id: i, order: i, size: 1, distance: 0, name: sample.name,
    runId: sample.runId, coveragePercent: sample.coveragePercent
  }));
  const clusterDistances = new Map();
  const key = (a, b) => a < b ? a + ',' + b : b + ',' + a;
  distances.forEach((row, i) => row.forEach((value, j) => {
    if (i < j) clusterDistances.set(key(i, j), value);
  }));
  while (active.length > 1) {
    let first, second, minimum = Infinity;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const distance = clusterDistances.get(key(active[i].id, active[j].id));
        if (distance < minimum) {
          minimum = distance;
          first = active[i];
          second = active[j];
        }
      }
    }
    const merged = {
      id: nextId++, order: Math.min(first.order, second.order),
      size: first.size + second.size, distance: minimum,
      children: [first, second]
    };
    active.forEach(other => {
      if (other === first || other === second) return;
      const mean = (first.size * clusterDistances.get(key(first.id, other.id)) +
        second.size * clusterDistances.get(key(second.id, other.id))) / merged.size;
      clusterDistances.set(key(merged.id, other.id), mean);
    });
    active = active.filter(cluster => cluster !== first && cluster !== second);
    active.push(merged);
    active.sort((a, b) => a.order - b.order);
  }
  return {
    method, rank, minimumPrevalence,
    pseudocount: method === 'aitchison' ? pseudocount : null,
    featureCount: taxa.length, sampleCount: included.length,
    excludedCount: samples.length - included.length,
    tree: active[0], distances
  };
}

module.exports = { calculateOrdination, calculateDendrogram, calculateDistanceMatrix, taxonCountsAtRank, symmetricEigen };
