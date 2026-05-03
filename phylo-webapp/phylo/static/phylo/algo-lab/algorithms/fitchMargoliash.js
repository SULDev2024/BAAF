import { runUPGMA } from './upgma.js';

function subtreeHas(v, x) {
  if (!v) return false;
  if (v.isLeaf) return v.name === x;
  return v.children.some((c) => subtreeHas(c, x));
}

function distDown(v, x) {
  if (v.isLeaf) return v.name === x ? 0 : null;
  for (const c of v.children) {
    const sub = distDown(c, x);
    if (sub != null) return (c.branchLength || 0) + sub;
  }
  return null;
}

function patristic(u, a, b) {
  if (u.isLeaf) return 0;
  const L = u.children[0];
  const R = u.children[1];
  if (subtreeHas(L, a) && subtreeHas(L, b)) return patristic(L, a, b);
  if (subtreeHas(R, a) && subtreeHas(R, b)) return patristic(R, a, b);
  return distDown(L, a) + distDown(R, b);
}

/**
 * FM-style residuals using UPGMA ultrametric tree as additive approximation.
 */
export function runFM(matrix, taxa) {
  const up = runUPGMA(matrix, taxa);
  const n = taxa.length;
  const residual = [];
  let S = 0;
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row.push({ obs: 0, tree: 0, err: 0 });
        continue;
      }
      const obs = matrix[i][j];
      const tr = patristic(up.tree, taxa[i], taxa[j]);
      const w = 1 / (obs * obs + 1e-6);
      const e = (tr - obs) ** 2;
      S += w * e;
      row.push({ obs, tree: Math.round(tr * 1000) / 1000, sq: Math.round(e * 1000) / 1000, werr: Math.round(w * e * 1000) / 1000 });
    }
    residual.push(row);
  }
  return { tree: up.tree, newick: up.newick, totalS: Math.round(S * 1000) / 1000, residualMatrix: residual, taxa };
}
