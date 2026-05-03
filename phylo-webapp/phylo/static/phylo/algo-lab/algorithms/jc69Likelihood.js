/**
 * JC69 + Felsenstein pruning (4 states), rooted binary tree.
 * Branch length t in expected substitutions per site (rate μ=1).
 */

const BASES = ['A', 'C', 'G', 'T'];

/** JC69 substitution probability P(parent=i -> child=j | t), μ=1. */
function jc69P(t) {
  const r = Math.exp((-4 * t) / 3);
  const diag = 0.25 + 0.75 * r;
  const off = 0.25 - 0.25 * r;
  const m = [];
  for (let i = 0; i < 4; i++) {
    m[i] = [];
    for (let j = 0; j < 4; j++) m[i][j] = i === j ? diag : off;
  }
  return m;
}

function partialsAt(node, charMatrix, siteIndex, defaultT = 0.1) {
  if (node.isLeaf) {
    const name = node.name;
    const seq = charMatrix[name];
    const L = [];
    const ch = seq[siteIndex];
    for (let b = 0; b < 4; b++) {
      const base = BASES[b];
      L[b] = ch === base ? 1 : 0;
    }
    return L;
  }
  const left = partialsAt(node.children[0], charMatrix, siteIndex, defaultT);
  const right = partialsAt(node.children[1], charMatrix, siteIndex, defaultT);
  const tL = node.children[0].branchLength > 0 ? node.children[0].branchLength : defaultT;
  const tR = node.children[1].branchLength > 0 ? node.children[1].branchLength : defaultT;
  const PL = jc69P(tL);
  const PR = jc69P(tR);
  const out = [];
  for (let i = 0; i < 4; i++) {
    let sL = 0;
    let sR = 0;
    for (let j = 0; j < 4; j++) {
      sL += left[j] * PL[i][j];
      sR += right[j] * PR[i][j];
    }
    out[i] = sL * sR;
  }
  return out;
}

function sitePartials(tree, charMatrix, siteIndex) {
  const p = partialsAt(tree, charMatrix, siteIndex);
  const pi = 0.25;
  let s = 0;
  for (let i = 0; i < 4; i++) s += pi * p[i];
  return Math.max(s, 1e-300);
}

/**
 * Log-likelihood for full alignment under JC69, equal branch length if missing.
 */
export function logLikelihoodJC69(tree, charMatrix, taxa) {
  const L = taxa.length ? charMatrix[taxa[0]].length : 0;
  let logL = 0;
  for (let pos = 0; pos < L; pos++) {
    const siteL = sitePartials(tree, charMatrix, pos);
    logL += Math.log(siteL);
  }
  return logL;
}
