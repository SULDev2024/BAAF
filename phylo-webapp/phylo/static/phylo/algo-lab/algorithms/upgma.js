/**
 * UPGMA — cluster merge with average inter-cluster distance (same as Python services).
 * @param {number[][]} matrix numeric symmetric
 * @param {string[]} taxa
 */
export function runUPGMA(matrix, taxa) {
  const n0 = taxa.length;
  const idx = (t) => taxa.indexOf(t);

  const clusters = new Map();
  taxa.forEach((t) => {
    clusters.set(t, { members: [t], height: 0, tree: leafNode(t, 0) });
  });

  const dist = new Map();
  function key(a, b) {
    return a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
  }
  function getD(a, b) {
    if (a === b) return 0;
    return dist.get(key(a, b));
  }
  function setD(a, b, v) {
    dist.set(key(a, b), v);
  }
  function removeDistInvolving(x) {
    for (const k of [...dist.keys()]) {
      const [p, q] = k.split('\u0000');
      if (p === x || q === x) dist.delete(k);
    }
  }

  for (let i = 0; i < n0; i++) {
    for (let j = i + 1; j < n0; j++) {
      setD(taxa[i], taxa[j], matrix[i][j]);
    }
  }

  const mergeHistory = [];
  const stepSnapshots = [];
  let mergeCount = 0;
  const names = [...taxa];

  while (clusters.size > 1) {
    const keys = [...clusters.keys()];
    const matrixBefore = snapshot(keys, getD);
    let best = null;
    let bestD = Infinity;
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = keys[i];
        const b = keys[j];
        const d = getD(a, b);
        if (d < bestD) {
          bestD = d;
          best = [a, b];
        }
      }
    }
    const [a, b] = best;
    const dAb = bestD;
    const newHeight = dAb / 2;
    const ca = clusters.get(a);
    const cb = clusters.get(b);
    const branchA = Math.max(newHeight - ca.height, 0);
    const branchB = Math.max(newHeight - cb.height, 0);
    mergeCount++;
    const newName = `U${mergeCount}`;
    const newMembers = [...ca.members, ...cb.members];
    const newTree = {
      name: newName,
      isLeaf: false,
      branchLength: 0,
      mergeHeight: newHeight,
      children: [
        { ...ca.tree, branchLength: branchA },
        { ...cb.tree, branchLength: branchB },
      ],
    };

    const updates = [];
    removeDistInvolving(a);
    removeDistInvolving(b);
    const remaining = keys.filter((x) => x !== a && x !== b);
    for (const other of remaining) {
      const co = clusters.get(other);
      let sum = 0;
      let cnt = 0;
      for (const x of newMembers) {
        for (const y of co.members) {
          sum += matrix[idx(x)][idx(y)];
          cnt++;
        }
      }
      const val = sum / cnt;
      setD(newName, other, val);
      updates.push({ other, value: val, formula: `avg between {${newMembers}} and {${co.members}}` });
    }
    clusters.delete(a);
    clusters.delete(b);
    clusters.set(newName, { members: newMembers, height: newHeight, tree: newTree });

    mergeHistory.push({
      step: mergeCount,
      merged: [a, b],
      mergeHeight: newHeight,
      newCluster: newName,
      size: newMembers.length,
      branchLengths: { [a]: branchA, [b]: branchB },
    });
    stepSnapshots.push({
      iteration: mergeCount,
      labels: [...keys],
      matrixBefore,
      selectedPair: [a, b],
      mergeHeight: newHeight,
      updates,
      matrixAfter: snapshot([...clusters.keys()], getD),
    });
  }

  const rootKey = [...clusters.keys()][0];
  const rootTree = clusters.get(rootKey).tree;
  normalizeRoot(rootTree);
  return {
    tree: rootTree,
    mergeHistory,
    stepSnapshots,
    newick: toNewick(rootTree) + ';',
  };
}

function leafNode(name, bl) {
  return { name, isLeaf: true, branchLength: bl, children: [] };
}

function snapshot(keys, getD) {
  return keys.map((ri) => keys.map((cj) => (ri === cj ? null : Math.round(getD(ri, cj) * 1000) / 1000)));
}

function normalizeRoot(node) {
  if (!node) return;
  node.branchLength = node.branchLength || 0;
  (node.children || []).forEach(normalizeRoot);
}

function toNewick(node, isRoot = true) {
  if (node.isLeaf) {
    const bl = (node.branchLength || 0).toFixed(3);
    return `${node.name}:${bl}`;
  }
  const ch = node.children.map((c) => toNewick(c, false)).join(',');
  const bl = (node.branchLength || 0).toFixed(3);
  if (isRoot) return `(${ch})`;
  return `(${ch})${node.name || ''}:${bl}`;
}
