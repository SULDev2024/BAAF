/**
 * @param {string[][]} matrix
 * @param {string[]} taxa
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateDistanceMatrix(matrix, taxa) {
  const n = taxa.length;
  if (n < 2) return { ok: false, error: 'Need at least 2 taxa.' };
  if (!matrix || matrix.length !== n) return { ok: false, error: 'Matrix row count must match taxa count.' };
  for (let i = 0; i < n; i++) {
    if (!matrix[i] || matrix[i].length !== n) {
      return { ok: false, error: 'Matrix must be square.' };
    }
    const diag = parseFloat(matrix[i][i]);
    if (Number.isNaN(diag) || Math.abs(diag) > 1e-9) {
      return { ok: false, error: 'Diagonal entries must be 0.' };
    }
    for (let j = 0; j < n; j++) {
      const v = parseFloat(matrix[i][j]);
      if (Number.isNaN(v) || v < 0) return { ok: false, error: 'All distances must be non-negative numbers.' };
      const vji = parseFloat(matrix[j][i]);
      if (Number.isNaN(vji) || Math.abs(v - vji) > 1e-6) {
        return { ok: false, error: 'Matrix must be symmetric.' };
      }
    }
  }
  return { ok: true };
}

/** @returns {number[][]} */
export function matrixToNumeric(matrix, taxa) {
  const n = taxa.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) row.push(parseFloat(matrix[i][j]));
    out.push(row);
  }
  return out;
}

export function cloneMatrix(m) {
  return m.map((row) => row.slice());
}

export function taxaIndexMap(taxa) {
  const m = new Map();
  taxa.forEach((t, i) => m.set(t, i));
  return m;
}
