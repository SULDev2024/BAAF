const INF = 1e12;

function statesForMode(mode) {
  return mode === 'binary' ? ['0', '1'] : ['A', 'C', 'G', 'T'];
}

/** default cost: identity 0 else 1 */
export function defaultCostMatrix(mode) {
  const st = statesForMode(mode);
  const m = {};
  for (const a of st) {
    m[a] = {};
    for (const b of st) m[a][b] = a === b ? 0 : 1;
  }
  return m;
}

export function runSankoff(tree, charMatrix, costMatrix, mode) {
  const states = statesForMode(mode);
  const L = charMatrix[Object.keys(charMatrix)[0]].length;
  let total = 0;
  const tables = [];
  let sankoffTree = null;

  for (let pos = 0; pos < L; pos++) {
    const S = new Map();
    function post(v) {
      if (v.isLeaf) {
        const obs = charMatrix[v.name][pos];
        const row = {};
        for (const s of states) row[s] = s === obs ? 0 : INF;
        S.set(v, row);
        return row;
      }
      const r1 = post(v.children[0]);
      const r2 = post(v.children[1]);
      const row = {};
      for (const s of states) {
        let m1 = INF;
        let m2 = INF;
        for (const t of states) m1 = Math.min(m1, (costMatrix[s]?.[t] ?? 1) + r1[t]);
        for (const t of states) m2 = Math.min(m2, (costMatrix[s]?.[t] ?? 1) + r2[t]);
        row[s] = m1 + m2;
      }
      S.set(v, row);
      return row;
    }
    const rootRow = post(tree);
    const best = Math.min(...states.map((s) => rootRow[s]));
    total += best;
    tables.push({ position: pos, rootCosts: { ...rootRow } });
    if (pos === 0) {
      sankoffTree = annotateSankoffTree(tree, charMatrix, costMatrix, states, pos);
    }
  }
  return { totalCost: total, tables, states, sankoffTree };
}

function annotateSankoffTree(node, charMatrix, costMatrix, states, pos) {
  function walk(v) {
    if (v.isLeaf) {
      const obs = charMatrix[v.name][pos];
      const row = {};
      for (const s of states) row[s] = s === obs ? 0 : INF;
      return {
        name: v.name,
        isLeaf: true,
        costVector: row,
        bestState: obs,
        children: [],
      };
    }
    const left = walk(v.children[0]);
    const right = walk(v.children[1]);
    const row = {};
    for (const s of states) {
      let m1 = INF;
      let m2 = INF;
      for (const t of states) m1 = Math.min(m1, (costMatrix[s]?.[t] ?? 1) + left.costVector[t]);
      for (const t of states) m2 = Math.min(m2, (costMatrix[s]?.[t] ?? 1) + right.costVector[t]);
      row[s] = m1 + m2;
    }
    let bestState = states[0];
    let bestVal = row[bestState];
    for (const s of states) {
      if (row[s] < bestVal) {
        bestVal = row[s];
        bestState = s;
      }
    }
    return {
      name: v.name || '',
      isLeaf: false,
      costVector: row,
      bestState,
      children: [left, right],
    };
  }
  return walk(node);
}
