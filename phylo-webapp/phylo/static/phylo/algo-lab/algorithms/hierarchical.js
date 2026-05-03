function combinations2(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) out.push([arr[i], arr[j]]);
  return out;
}

function key(a, b) {
  return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
}

/**
 * Hierarchical clustering with single / complete / average linkage.
 * Average linkage distances match UPGMA update (noted in UI).
 */
export function runHierarchical(matrix, taxa, linkage) {
  const idx = (t) => taxa.indexOf(t);
  const clusters = new Map();
  taxa.forEach((t) => clusters.set(t, { members: [t], size: 1, tree: { name: t, isLeaf: true, branchLength: 0, children: [] } }));

  const dist = new Map();
  const get = (a, b) => (a === b ? 0 : dist.get(key(a, b)));
  const set = (a, b, v) => dist.set(key(a, b), v);
  for (let i = 0; i < taxa.length; i++) {
    for (let j = i + 1; j < taxa.length; j++) set(taxa[i], taxa[j], matrix[i][j]);
  }

  const mergeHistory = [];
  let mc = 0;

  function removeInvolving(x) {
    for (const k of [...dist.keys()]) {
      const [p, q] = k.split('\u0000');
      if (p === x || q === x) dist.delete(k);
    }
  }

  while (clusters.size > 1) {
    const keys = [...clusters.keys()];
    let best = null;
    let bestD = Infinity;
    for (const [a, b] of combinations2(keys)) {
      const dij = get(a, b);
      if (dij < bestD) {
        bestD = dij;
        best = [a, b];
      }
    }
    const [a, b] = best;
    const mergeDist = bestD;
    mc++;
    const name = `H${mc}`;
    const ca = clusters.get(a);
    const cb = clusters.get(b);
    const newMembers = [...ca.members, ...cb.members];
    const newSize = ca.size + cb.size;
    const newTree = {
      name,
      isLeaf: false,
      branchLength: 0,
      mergeHeight: mergeDist,
      children: [
        { ...ca.tree, branchLength: mergeDist / 2 },
        { ...cb.tree, branchLength: mergeDist / 2 },
      ],
    };
    removeInvolving(a);
    removeInvolving(b);
    clusters.delete(a);
    clusters.delete(b);
    const rest = keys.filter((x) => x !== a && x !== b);
    for (const x of rest) {
      const cx = clusters.get(x);
      let v;
      if (linkage === 'single') v = Math.min(get(a, x), get(b, x));
      else if (linkage === 'complete') v = Math.max(get(a, x), get(b, x));
      else v = (ca.size * get(a, x) + cb.size * get(b, x)) / newSize;
      set(name, x, v);
    }
    clusters.set(name, { members: newMembers, size: newSize, tree: newTree });
    mergeHistory.push({ step: mc, merged: [a, b], distance: mergeDist, newCluster: name });
  }
  const root = [...clusters.values()][0].tree;
  return { tree: root, mergeHistory, linkage };
}
