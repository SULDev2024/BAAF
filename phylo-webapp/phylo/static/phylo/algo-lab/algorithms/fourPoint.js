function combinations4(arr) {
  const out = [];
  const n = arr.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++) out.push([arr[a], arr[b], arr[c], arr[d]]);
  return out;
}

function d(matrix, taxa, i, j) {
  const a = taxa.indexOf(i);
  const b = taxa.indexOf(j);
  return matrix[a][b];
}

/**
 * Four-point condition (additive matrix test).
 */
export function checkFourPoint(matrix, taxa) {
  const rows = [];
  let allPass = true;
  for (const quad of combinations4(taxa)) {
    const [i, j, k, l] = quad;
    const s1 = d(matrix, taxa, i, j) + d(matrix, taxa, k, l);
    const s2 = d(matrix, taxa, i, k) + d(matrix, taxa, j, l);
    const s3 = d(matrix, taxa, i, l) + d(matrix, taxa, j, k);
    const arr = [s1, s2, s3].sort((a, b) => a - b);
    const max = Math.max(s1, s2, s3);
    const cnt = [s1, s2, s3].filter((x) => Math.abs(x - max) < 1e-6).length;
    const pass = cnt === 2 && arr[1] <= max + 1e-6;
    if (!pass) allPass = false;
    rows.push({
      quadruple: quad.join(', '),
      s1: Math.round(s1 * 1000) / 1000,
      s2: Math.round(s2 * 1000) / 1000,
      s3: Math.round(s3 * 1000) / 1000,
      pass,
    });
  }
  return { additive: allPass, rows };
}
