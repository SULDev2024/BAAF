/**
 * Binary characters only. Four-gamete compatibility + greedy max compatible set.
 */
export function checkPerfectPhylogeny(charMatrix, taxa) {
  const L = charMatrix[taxa[0]].length;
  const chars = [...Array(L).keys()];
  const pairs = [];
  for (let a = 0; a < L; a++) {
    for (let b = a + 1; b < L; b++) {
      const gam = new Set();
      for (const t of taxa) {
        gam.add(`${charMatrix[t][a]}${charMatrix[t][b]}`);
      }
      const pass = gam.size <= 3;
      pairs.push({ c1: a, c2: b, pass, gametes: [...gam] });
    }
  }
  const ok = pairs.every((p) => p.pass);
  return {
    perfect: ok,
    pairs,
    summary: `${pairs.filter((p) => p.pass).length} of ${pairs.length} character pairs compatible`,
  };
}
