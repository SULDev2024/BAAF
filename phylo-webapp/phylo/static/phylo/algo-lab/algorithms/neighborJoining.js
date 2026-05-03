/** @param {string[][]} pairs from combinations */
function combinations2(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]);
  return out;
}

function key(a, b) {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

/**
 * Neighbor-Joining (Saitou–Nei style, matching Python services).
 * @param {number[][]} matrix
 * @param {string[]} taxa
 */
export function runNJ(matrix, taxa) {
  if (taxa.length < 3) throw new Error('NJ requires at least 3 taxa.');
  const dist = new Map();
  const get = (a, b) => (a === b ? 0 : dist.get(key(a, b)));
  const set = (a, b, v) => dist.set(key(a, b), v);
  for (let i = 0; i < taxa.length; i++) {
    for (let j = i + 1; j < taxa.length; j++) set(taxa[i], taxa[j], matrix[i][j]);
  }

  let active = [...taxa];
  const newickMap = Object.fromEntries(taxa.map((t) => [t, t]));
  const trees = Object.fromEntries(taxa.map((t) => [t, { name: t, isLeaf: true, branchLength: 0, children: [] }]));
  const mergeTable = [];
  const stepSnapshots = [];
  let nodeCount = 0;

  while (active.length > 2) {
    const n = active.length;
    const labels = [...active];
    const matrixBefore = labels.map((ri) =>
      labels.map((cj) => (ri === cj ? null : Math.round(get(ri, cj) * 1000) / 1000)),
    );
    const r = {};
    for (const i of active) r[i] = active.reduce((s, k) => (k === i ? s : s + get(i, k)), 0);
    let bestPair = null;
    let bestQ = Infinity;
    const qRows = [];
    for (const [i, j] of combinations2(active)) {
      const q = (n - 2) * get(i, j) - r[i] - r[j];
      qRows.push({ pair: `${i},${j}`, q: Math.round(q * 1000) / 1000 });
      if (q < bestQ) {
        bestQ = q;
        bestPair = [i, j];
      }
    }
    const [i, j] = bestPair;
    const qMatrix = labels.map((ri) =>
      labels.map((cj) => (ri === cj ? null : Math.round(((n - 2) * get(ri, cj) - r[ri] - r[cj]) * 1000) / 1000)),
    );
    stepSnapshots.push({
      iteration: nodeCount + 1,
      labels,
      matrixBefore,
      qMatrix,
      r: Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
      selectedPair: [i, j],
      bestQ: Math.round(bestQ * 1000) / 1000,
    });
    const dij = get(i, j);
    let limbI = 0.5 * dij + (r[i] - r[j]) / (2 * (n - 2));
    let limbJ = dij - limbI;
    limbI = Math.max(limbI, 0);
    limbJ = Math.max(limbJ, 0);
    nodeCount++;
    const u = `NJ${nodeCount}`;
    newickMap[u] = `(${newickMap[i]}:${limbI.toFixed(3)},${newickMap[j]}:${limbJ.toFixed(3)})`;
    trees[u] = {
      name: u,
      isLeaf: false,
      branchLength: 0,
      children: [
        { ...trees[i], branchLength: limbI },
        { ...trees[j], branchLength: limbJ },
      ],
    };
    mergeTable.push({
      iteration: nodeCount,
      pair: [i, j],
      q: Math.round(bestQ * 1000) / 1000,
      limbI: Math.round(limbI * 1000) / 1000,
      limbJ: Math.round(limbJ * 1000) / 1000,
    });
    const remaining = active.filter((k) => k !== i && k !== j);
    const newDists = {};
    for (const k of remaining) {
      const duk = 0.5 * (get(i, k) + get(j, k) - dij);
      newDists[k] = Math.max(duk, 0);
    }
    for (const k of [...dist.keys()]) {
      const [p, q] = k.split('\u0000');
      if (p === i || q === i || p === j || q === j) dist.delete(k);
    }
    delete trees[i];
    delete trees[j];
    for (const k of remaining) set(u, k, newDists[k]);
    active = [...remaining, u];
  }

  const [a, b] = active;
  const dab = get(a, b);
  const fa = dab / 2;
  const fb = dab / 2;
  const final = {
    name: 'root',
    isLeaf: false,
    branchLength: 0,
    children: [
      { ...trees[a], branchLength: fa },
      { ...trees[b], branchLength: fb },
    ],
  };
  mergeTable.push({ iteration: nodeCount + 1, pair: [a, b], final: true, limbI: fa, limbJ: fb });
  const labelsF = [...active];
  stepSnapshots.push({
    iteration: nodeCount + 1,
    labels: labelsF,
    matrixBefore: labelsF.map((ri) => labelsF.map((cj) => (ri === cj ? null : Math.round(get(ri, cj) * 1000) / 1000))),
    qMatrix: null,
    r: null,
    selectedPair: [a, b],
    final: true,
  });
  const newick = `(${newickMap[a]}:${fa.toFixed(3)},${newickMap[b]}:${fb.toFixed(3)});`;
  return { tree: final, mergeTable, newick, stepSnapshots };
}
