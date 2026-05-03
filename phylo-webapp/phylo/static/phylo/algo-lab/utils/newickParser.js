/**
 * Parse Newick into standardized tree nodes.
 * @param {string} s
 * @returns {{ name: string, isLeaf: boolean, branchLength: number, children: any[] }}
 */
export function parseNewick(s) {
  const t = s.trim().replace(/;+$/, '');
  let i = 0;

  function skipWs() {
    while (i < t.length && /\s/.test(t[i])) i++;
  }

  function readLabel() {
    skipWs();
    const start = i;
    while (i < t.length && !',;:()'.includes(t[i])) i++;
    return t.slice(start, i).trim();
  }

  function readBranchLength() {
    skipWs();
    if (t[i] !== ':') return 0;
    i++;
    const start = i;
    while (i < t.length && /[0-9.eE+-]/.test(t[i])) i++;
    const v = parseFloat(t.slice(start, i));
    return Number.isFinite(v) ? v : 0;
  }

  function parseSubtree() {
    skipWs();
    if (t[i] === '(') {
      i++;
      const children = [];
      while (true) {
        children.push(parseSubtree());
        skipWs();
        if (t[i] === ',') {
          i++;
          continue;
        }
        if (t[i] === ')') {
          i++;
          break;
        }
        throw new Error(`Expected , or ) at position ${i}`);
      }
      const name = readLabel() || `n${i}`;
      const bl = readBranchLength();
      return { name, isLeaf: false, branchLength: bl, children };
    }
    const name = readLabel();
    if (!name) throw new Error(`Empty leaf at position ${i}`);
    const bl = readBranchLength();
    return { name, isLeaf: true, branchLength: bl, children: [] };
  }

  const root = parseSubtree();
  root.branchLength = root.branchLength || 0;
  return root;
}
