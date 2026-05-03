/**
 * Dynamic Figure-5 ML: star-based model test (JC69 / K80 / HKY), AIC,
 * then 3-taxon binary topology search with branch-length optimization.
 */

import { parseNewick } from '../utils/newickParser.js';

const BASES = ['A', 'C', 'G', 'T'];
const PUR = new Set([0, 2]);
const PYR = new Set([1, 3]);

export function baseIndex(ch) {
  const u = String(ch).toUpperCase();
  const i = BASES.indexOf(u);
  return i >= 0 ? i : 0;
}

export function empiricalPi(charMatrix, taxa) {
  const c = [0, 0, 0, 0];
  const L = taxa.length ? charMatrix[taxa[0]].length : 0;
  for (let pos = 0; pos < L; pos++) {
    for (const t of taxa) {
      c[baseIndex(charMatrix[t][pos])] += 1;
    }
  }
  const s = c.reduce((a, b) => a + b, 0) || 1;
  return c.map((x) => x / s);
}

function isTransition(i, j) {
  if (i === j) return false;
  return (PUR.has(i) && PUR.has(j)) || (PYR.has(i) && PYR.has(j));
}

export function buildHKYQ(pi, kappa) {
  const Q = [];
  for (let i = 0; i < 4; i++) Q[i] = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if (i === j) continue;
      const r = isTransition(i, j) ? kappa : 1;
      Q[i][j] = pi[j] * r;
    }
    let row = 0;
    for (let j = 0; j < 4; j++) if (i !== j) row += Q[i][j];
    Q[i][i] = -row;
  }
  let mut = 0;
  for (let i = 0; i < 4; i++) mut -= pi[i] * Q[i][i];
  const scale = 1 / Math.max(mut, 1e-12);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) Q[i][j] *= scale;
  return Q;
}

function matEye4() {
  const I = [];
  for (let i = 0; i < 4; i++) {
    I[i] = [0, 0, 0, 0];
    I[i][i] = 1;
  }
  return I;
}

function matMul4(A, B) {
  const C = [];
  for (let i = 0; i < 4; i++) {
    C[i] = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) C[i][j] += A[i][k] * B[k][j];
  }
  return C;
}

function matScale4(A, s) {
  return A.map((row) => row.map((v) => v * s));
}

function matAdd4(A, B) {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}

function matNormInf4(A) {
  let m = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) m = Math.max(m, Math.abs(A[i][j]));
  return m;
}

export function transitionFromQ(Q, t) {
  let M = matScale4(Q, Math.max(t, 1e-10));
  let sq = 0;
  while (matNormInf4(M) > 0.5) {
    M = matScale4(M, 0.5);
    sq++;
  }
  let E = matEye4();
  let Pk = matEye4();
  for (let k = 1; k <= 28; k++) {
    Pk = matMul4(Pk, matScale4(M, 1 / k));
    E = matAdd4(E, Pk);
  }
  for (let s = 0; s < sq; s++) E = matMul4(E, E);
  return E;
}

function leafPartials(charMatrix, taxon, siteIndex) {
  const L = [];
  const ch = charMatrix[taxon][siteIndex];
  for (let b = 0; b < 4; b++) L[b] = ch === BASES[b] ? 1 : 0;
  return L;
}

export function siteLikelihoodStar(charMatrix, taxa, siteIndex, t0, t1, t2, pi, kappa) {
  const Q = buildHKYQ(pi, kappa);
  const P0 = transitionFromQ(Q, t0);
  const P1 = transitionFromQ(Q, t1);
  const P2 = transitionFromQ(Q, t2);
  const L0 = leafPartials(charMatrix, taxa[0], siteIndex);
  const L1 = leafPartials(charMatrix, taxa[1], siteIndex);
  const L2 = leafPartials(charMatrix, taxa[2], siteIndex);
  const U0 = [];
  const U1 = [];
  const U2 = [];
  for (let s = 0; s < 4; s++) {
    let a0 = 0;
    let a1 = 0;
    let a2 = 0;
    for (let y = 0; y < 4; y++) {
      a0 += P0[s][y] * L0[y];
      a1 += P1[s][y] * L1[y];
      a2 += P2[s][y] * L2[y];
    }
    U0[s] = a0;
    U1[s] = a1;
    U2[s] = a2;
  }
  let tot = 0;
  for (let s = 0; s < 4; s++) tot += pi[s] * U0[s] * U1[s] * U2[s];
  return Math.max(tot, 1e-300);
}

export function logLikelihoodStar(charMatrix, taxa, t0, t1, t2, pi, kappa) {
  const L = charMatrix[taxa[0]].length;
  let logL = 0;
  for (let pos = 0; pos < L; pos++) {
    logL += Math.log(siteLikelihoodStar(charMatrix, taxa, pos, t0, t1, t2, pi, kappa));
  }
  return logL;
}

function partialsBinary(node, charMatrix, siteIndex, pi, kappa) {
  if (node.isLeaf) {
    const seq = charMatrix[node.name];
    const ch = seq[siteIndex];
    const L = [];
    for (let b = 0; b < 4; b++) L[b] = ch === BASES[b] ? 1 : 0;
    return L;
  }
  const left = partialsBinary(node.children[0], charMatrix, siteIndex, pi, kappa);
  const right = partialsBinary(node.children[1], charMatrix, siteIndex, pi, kappa);
  const tL = Math.max(node.children[0].branchLength || 0, 1e-8);
  const tR = Math.max(node.children[1].branchLength || 0, 1e-8);
  const Q = buildHKYQ(pi, kappa);
  const PL = transitionFromQ(Q, tL);
  const PR = transitionFromQ(Q, tR);
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

export function siteLikelihoodBinaryTree(tree, charMatrix, taxa, siteIndex, pi, kappa) {
  const p = partialsBinary(tree, charMatrix, siteIndex, pi, kappa);
  let s = 0;
  for (let i = 0; i < 4; i++) s += pi[i] * p[i];
  return Math.max(s, 1e-300);
}

export function logLikelihoodBinaryTree(tree, charMatrix, taxa, pi, kappa) {
  const L = charMatrix[taxa[0]].length;
  let logL = 0;
  for (let pos = 0; pos < L; pos++) {
    logL += Math.log(siteLikelihoodBinaryTree(tree, charMatrix, taxa, pos, pi, kappa));
  }
  return logL;
}

export function nelderMead(f, start, lo, hi, maxIter = 450) {
  const n = start.length;
  const simplex = (x) => {
    const y = x.map((v, i) => Math.min(hi[i], Math.max(lo[i], v)));
    return { x: y, fx: f(y) };
  };
  const pts = [];
  pts.push(simplex(start));
  const step = hi.map((h, i) => Math.max((h - lo[i]) * 0.06, 1e-3));
  for (let i = 0; i < n; i++) {
    const x = start.slice();
    x[i] += step[i];
    pts.push(simplex(x));
  }
  const α = 1;
  const γ = 2;
  const ρ = 0.5;
  const σ = 0.5;
  for (let it = 0; it < maxIter; it++) {
    pts.sort((a, b) => a.fx - b.fx);
    const best = pts[0];
    const worst = pts[pts.length - 1];
    if (worst.fx - best.fx < 1e-6) break;
    const x0 = [];
    const m = pts.length - 1;
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let i = 0; i < m; i++) s += pts[i].x[j];
      x0[j] = s / m;
    }
    const xr = [];
    for (let j = 0; j < n; j++) xr[j] = x0[j] + α * (x0[j] - worst.x[j]);
    const R = simplex(xr);
    let accepted = false;
    if (R.fx < pts[m - 1].fx) {
      const xe = [];
      for (let j = 0; j < n; j++) xe[j] = x0[j] + γ * (R.x[j] - x0[j]);
      const E = simplex(xe);
      pts[m] = E.fx < R.fx ? E : R;
      accepted = true;
    } else if (R.fx < worst.fx) {
      pts[m] = R;
      accepted = true;
    }
    if (!accepted) {
      const xc = [];
      for (let j = 0; j < n; j++) xc[j] = x0[j] + ρ * (worst.x[j] - x0[j]);
      const C = simplex(xc);
      if (C.fx < worst.fx) pts[m] = C;
      else {
        for (let i = 1; i < pts.length; i++) {
          const nx = [];
          for (let j = 0; j < n; j++) nx[j] = best.x[j] + σ * (pts[i].x[j] - best.x[j]);
          pts[i] = simplex(nx);
        }
      }
    }
  }
  pts.sort((a, b) => a.fx - b.fx);
  return pts[0];
}

function negLogLStar(charMatrix, taxa, pi, kappa, logT0, logT1, logT2) {
  const t0 = Math.exp(logT0);
  const t1 = Math.exp(logT1);
  const t2 = Math.exp(logT2);
  return -logLikelihoodStar(charMatrix, taxa, t0, t1, t2, pi, kappa);
}

export function fitStarJC69(charMatrix, taxa) {
  const piEq = [0.25, 0.25, 0.25, 0.25];
  const kappa = 1;
  const lo = [Math.log(1e-4), Math.log(1e-4), Math.log(1e-4)];
  const hi = [Math.log(4), Math.log(4), Math.log(4)];
  const start = [Math.log(0.12), Math.log(0.12), Math.log(0.12)];
  const f = (x) => negLogLStar(charMatrix, taxa, piEq, kappa, x[0], x[1], x[2]);
  const sol = nelderMead(f, start, lo, hi);
  const t = sol.x.map(Math.exp);
  const logL = logLikelihoodStar(charMatrix, taxa, t[0], t[1], t[2], piEq, kappa);
  return { logL, params: { t0: t[0], t1: t[1], t2: t[2], kappa: 1, pi: piEq }, k: 3 };
}

export function fitStarK80(charMatrix, taxa) {
  const piEq = [0.25, 0.25, 0.25, 0.25];
  const lo = [Math.log(0.15), Math.log(1e-4), Math.log(1e-4), Math.log(1e-4)];
  const hi = [Math.log(30), Math.log(4), Math.log(4), Math.log(4)];
  const start = [Math.log(2), Math.log(0.12), Math.log(0.12), Math.log(0.12)];
  const f = (x) => negLogLStar(charMatrix, taxa, piEq, Math.exp(x[0]), x[1], x[2], x[3]);
  const sol = nelderMead(f, start, lo, hi);
  const kappa = Math.exp(sol.x[0]);
  const t = [Math.exp(sol.x[1]), Math.exp(sol.x[2]), Math.exp(sol.x[3])];
  const logL = logLikelihoodStar(charMatrix, taxa, t[0], t[1], t[2], piEq, kappa);
  return { logL, params: { t0: t[0], t1: t[1], t2: t[2], kappa, pi: piEq }, k: 4 };
}

export function fitStarHKY(charMatrix, taxa, piEmp) {
  const lo = [Math.log(0.15), Math.log(1e-4), Math.log(1e-4), Math.log(1e-4)];
  const hi = [Math.log(35), Math.log(4), Math.log(4), Math.log(4)];
  const start = [Math.log(2), Math.log(0.12), Math.log(0.12), Math.log(0.12)];
  const f = (x) => negLogLStar(charMatrix, taxa, piEmp, Math.exp(x[0]), x[1], x[2], x[3]);
  const sol = nelderMead(f, start, lo, hi);
  const kappa = Math.exp(sol.x[0]);
  const t = [Math.exp(sol.x[1]), Math.exp(sol.x[2]), Math.exp(sol.x[3])];
  const logL = logLikelihoodStar(charMatrix, taxa, t[0], t[1], t[2], piEmp, kappa);
  return { logL, params: { t0: t[0], t1: t[1], t2: t[2], kappa, pi: piEmp.slice() }, k: 4 };
}

export function aic(logL, k) {
  return 2 * k - 2 * logL;
}

function setLengthsPostOrder(node, arr, ref) {
  if (node.isLeaf) return;
  node.children.forEach((c) => setLengthsPostOrder(c, arr, ref));
  node.children[0].branchLength = Math.max(arr[ref.i++], 1e-8);
  node.children[1].branchLength = Math.max(arr[ref.i++], 1e-8);
}

export function optimizeBinaryTree(charMatrix, taxa, treeTemplate, pi, kappa) {
  const lo = [Math.log(1e-4), Math.log(1e-4), Math.log(1e-4), Math.log(1e-4)];
  const hi = [Math.log(5), Math.log(5), Math.log(5), Math.log(5)];
  const start = [Math.log(0.1), Math.log(0.1), Math.log(0.1), Math.log(0.1)];
  const f = (logLens) => {
    const tree = JSON.parse(JSON.stringify(treeTemplate));
    const t = logLens.map((x) => Math.exp(x));
    const ref = { i: 0 };
    setLengthsPostOrder(tree, t, ref);
    return -logLikelihoodBinaryTree(tree, charMatrix, taxa, pi, kappa);
  };
  const sol = nelderMead(f, start, lo, hi, 550);
  const tree = JSON.parse(JSON.stringify(treeTemplate));
  const t = sol.x.map((x) => Math.exp(x));
  const ref = { i: 0 };
  setLengthsPostOrder(tree, t, ref);
  const logL = logLikelihoodBinaryTree(tree, charMatrix, taxa, pi, kappa);
  return { logL, tree, lengths: t };
}

export function runMlFigure5(charMatrix, taxa) {
  if (taxa.length !== 3) throw new Error('Figure 5 ML uses exactly three taxa.');
  const piEmp = empiricalPi(charMatrix, taxa);
  const piEq = [0.25, 0.25, 0.25, 0.25];

  const jc = fitStarJC69(charMatrix, taxa);
  const k80 = fitStarK80(charMatrix, taxa);
  const hky = fitStarHKY(charMatrix, taxa, piEmp);

  const candidates = [
    { id: 'JC69', label: 'JC69', aic: aic(jc.logL, jc.k), logL: jc.logL, k: jc.k, fit: jc, pi: piEq, kappa: 1 },
    { id: 'K80', label: 'K80', aic: aic(k80.logL, k80.k), logL: k80.logL, k: k80.k, fit: k80, pi: piEq, kappa: k80.params.kappa },
    { id: 'HKY85', label: 'HKY85', aic: aic(hky.logL, hky.k), logL: hky.logL, k: hky.k, fit: hky, pi: piEmp.slice(), kappa: hky.params.kappa },
  ];
  candidates.sort((a, b) => a.aic - b.aic);
  const bestM = candidates[0];
  return {
    modelComparison: candidates,
    bestModel: bestM,
    piEmp,
  };
}

export function scoreThreeBinaryTopologies(charMatrix, taxa, pi, kappa, newickStrings) {
  return newickStrings.map((nw, idx) => {
    const treeTemplate = parseNewick(nw);
    const opt = optimizeBinaryTree(charMatrix, taxa, treeTemplate, pi, kappa);
    return { id: idx + 1, newick: nw, logL: opt.logL, tree: opt.tree };
  });
}

/** SVG 4×4 substitution-rate diagram (off-diagonal circles). */
export function renderSubstitutionMatrixSvg(container, pi, kappa) {
  if (!container) return;
  const Q = buildHKYQ(pi, kappa);
  let mx = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (i !== j) mx = Math.max(mx, Math.abs(Q[i][j]));
  mx = Math.max(mx, 1e-6);
  const labels = BASES;
  const cell = 22;
  const pad = 14;
  const W = pad * 2 + cell * 4;
  const H = pad * 2 + cell * 4;
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="mx-auto">`;
  svg += `<text x="${pad}" y="11" font-size="9" fill="#64748b">${labels.join(' ')}</text>`;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cx = pad + j * cell + cell / 2;
      const cy = pad + i * cell + cell / 2;
      if (i === j) {
        svg += `<circle cx="${cx}" cy="${cy}" r="2.5" fill="#cbd5e1"/>`;
      } else {
        const r = 3 + (Math.abs(Q[i][j]) / mx) * 7.5;
        const tr = isTransition(i, j);
        const fill = tr ? '#f59e0b' : '#3b82f6';
        svg += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="${fill}" fill-opacity="0.85"/>`;
      }
    }
  }
  for (let i = 0; i < 4; i++) {
    svg += `<text x="4" y="${pad + i * cell + cell / 2 + 4}" font-size="10" font-weight="600" fill="#334155">${labels[i]}</text>`;
  }
  svg += '</svg>';
  container.innerHTML = svg;
}
