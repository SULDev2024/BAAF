/**
 * Fitch small parsimony per character site.
 */
export function runFitch(tree, charMatrix, mode) {
  const taxa = Object.keys(charMatrix);
  const L = charMatrix[taxa[0]].length;
  if (taxa.some((t) => charMatrix[t].length !== L)) throw new Error('Aligned sequences required.');

  const byCharacter = [];
  let totalScore = 0;

  for (let pos = 0; pos < L; pos++) {
    const nodeSets = new Map();
    function post(v) {
      if (v.isLeaf) {
        const ch = charMatrix[v.name][pos];
        const s = new Set([ch]);
        nodeSets.set(v, s);
        return s;
      }
      const Ls = post(v.children[0]);
      const Rs = post(v.children[1]);
      const inter = new Set([...Ls].filter((x) => Rs.has(x)));
      const s = inter.size ? inter : new Set([...Ls, ...Rs]);
      nodeSets.set(v, s);
      return s;
    }
    post(tree);

    const assigned = new Map();
    function assignDown(v, parentState) {
      const s = nodeSets.get(v);
      if (v.isLeaf) {
        assigned.set(v, charMatrix[v.name][pos]);
        return;
      }
      let st = parentState;
      if (parentState != null && s.has(parentState)) st = parentState;
      else st = [...s][0];
      assigned.set(v, st);
      v.children.forEach((c) => assignDown(c, st));
    }
    const rootSet = nodeSets.get(tree);
    const rootPick = [...rootSet][0];
    assigned.set(tree, rootPick);
    tree.children.forEach((c) => assignDown(c, rootPick));

    let siteScore = 0;
    (function scoreTree(v) {
      if (v.isLeaf) return;
      const Ls = nodeSets.get(v.children[0]);
      const Rs = nodeSets.get(v.children[1]);
      const inter = new Set([...Ls].filter((x) => Rs.has(x)));
      if (!inter.size) siteScore += 1;
      v.children.forEach(scoreTree);
    })(tree);
    totalScore += siteScore;

    function collect(v) {
      const row = { node: v.isLeaf ? v.name : v.name || 'internal', set: [...nodeSets.get(v)].join(''), assigned: assigned.get(v) };
      if (!v.children.length) return [row];
      return [row, ...v.children.flatMap(collect)];
    }
    byCharacter.push({ index: pos, score: siteScore, rows: collect(tree) });
  }

  return { totalScore, byCharacter, mode };
}
