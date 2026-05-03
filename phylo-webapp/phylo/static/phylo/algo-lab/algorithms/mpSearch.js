/**
 * Small-n Maximum Parsimony: informative sites + exhaustive 4-taxon unrooted topologies (Fitch score).
 */

const DNA = new Set(['A', 'C', 'G', 'T']);

function normalizeSeq(s) {
  return String(s || '')
    .trim()
    .toUpperCase()
    .replace(/\s/g, '');
}

/**
 * Parse "A: ATGC" lines or aligned block (first line site numbers optional).
 */
export function parseSequenceBlock(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const taxa = [];
  const rows = {};

  const labelLine = /^([A-Za-z0-9_.-]+)\s*[:]\s*([A-Za-z0-9]+)\s*$/;
  let usedLabelFormat = false;

  for (const line of lines) {
    const m = line.match(labelLine);
    if (m) {
      usedLabelFormat = true;
      const t = m[1].toUpperCase();
      taxa.push(t);
      rows[t] = normalizeSeq(m[2]);
    }
  }

  if (usedLabelFormat && taxa.length) {
    return { taxa, rows };
  }

  // Matrix: optional header "1 2 3 ..." then "A   A T G ..."
  const matrixLines = lines.filter((l) => !/^\d+(\s+\d+)*$/.test(l));
  for (const line of matrixLines) {
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;
    const t = parts[0].toUpperCase();
    const rest = parts.slice(1).join('');
    taxa.push(t);
    rows[t] = normalizeSeq(rest);
  }

  return { taxa, rows };
}

export function alphabetFromRows(rows, taxa) {
  const chars = new Set();
  taxa.forEach((t) => {
    for (const ch of rows[t] || '') chars.add(ch);
  });
  const dnaLike = [...chars].every((c) => DNA.has(c));
  return dnaLike ? 'dna' : 'other';
}

/**
 * Site is parsimony-informative (classic definition): ≥2 distinct states, each in ≥2 taxa.
 */
export function informativeSitesTable(rows, taxa) {
  const L = taxa.length ? rows[taxa[0]].length : 0;
  const out = [];
  for (let pos = 0; pos < L; pos++) {
    const counts = new Map();
    for (const t of taxa) {
      const ch = rows[t][pos];
      counts.set(ch, (counts.get(ch) || 0) + 1);
    }
    const states = [...counts.keys()];
    const ge2 = states.filter((s) => counts.get(s) >= 2);
    const informative = states.length >= 2 && ge2.length >= 2;
    let reason = '';
    if (states.length < 2) reason = 'Only one character state at this site.';
    else if (ge2.length < 2) reason = 'Some state appears in fewer than 2 sequences.';
    else reason = 'At least two states, each in ≥2 taxa.';
    out.push({ site: pos + 1, informative, reason, counts: Object.fromEntries(counts) });
  }
  return out;
}

/** Three unrooted quartets as rooted Newick (arbitrary root on internal edge). */
export function fourTaxonTopologyNewicks(t) {
  const [a, b, c, d] = t;
  return [
    { id: 1, newick: `((${a},${b}),(${c},${d}));`, label: `(( ${a},${b} ),( ${c},${d} ))` },
    { id: 2, newick: `((${a},${c}),(${b},${d}));`, label: `(( ${a},${c} ),( ${b},${d} ))` },
    { id: 3, newick: `((${a},${d}),(${b},${c}));`, label: `(( ${a},${d} ),( ${b},${c} ))` },
  ];
}

export function validateAligned(rows, taxa) {
  if (taxa.length < 2) throw new Error('Provide at least two taxa.');
  const L = rows[taxa[0]].length;
  if (!L) throw new Error('Sequences are empty.');
  for (const t of taxa) {
    if (rows[t].length !== L) throw new Error(`Sequence length mismatch for ${t}.`);
  }
  return L;
}

/** Three rooted resolutions for three taxa (Figure 5 style candidate trees). */
export function threeTaxonRootedNewicks([a, b, c]) {
  const x = String(a).trim();
  const y = String(b).trim();
  const z = String(c).trim();
  return [
    { id: 1, newick: `((${x},${y}),${z});`, label: `(( ${x},${y} ),${z})` },
    { id: 2, newick: `((${x},${z}),${y});`, label: `(( ${x},${z} ),${y})` },
    { id: 3, newick: `((${y},${z}),${x});`, label: `(( ${y},${z} ),${x})` },
  ];
}
