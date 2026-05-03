/**
 * @param {Record<string, string>} charMatrix taxon -> sequence string
 * @param {string[]} taxa order
 * @returns {number[][]}
 */
export function hammingDistanceMatrix(charMatrix, taxa) {
  const n = taxa.length;
  const lens = taxa.map((t) => charMatrix[t].length);
  const L = lens[0];
  if (lens.some((len) => len !== L)) throw new Error('All sequences must have equal length.');
  const m = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = charMatrix[taxa[i]];
      const b = charMatrix[taxa[j]];
      let d = 0;
      for (let p = 0; p < L; p++) if (a[p] !== b[p]) d++;
      m[i][j] = m[j][i] = d;
    }
  }
  return m;
}
