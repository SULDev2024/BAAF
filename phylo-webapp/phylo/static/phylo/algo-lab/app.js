import { runUPGMA } from './algorithms/upgma.js';
import { runNJ } from './algorithms/neighborJoining.js';
import { checkFourPoint } from './algorithms/fourPoint.js';
import { runHierarchical } from './algorithms/hierarchical.js';
import { runFitch } from './algorithms/fitch.js';
import { runSankoff, defaultCostMatrix } from './algorithms/sankoff.js';
import { checkPerfectPhylogeny } from './algorithms/perfectPhylogeny.js';
import {
  alphabetFromRows,
  fourTaxonTopologyNewicks,
  informativeSitesTable,
  parseSequenceBlock,
  threeTaxonRootedNewicks,
  validateAligned,
} from './algorithms/mpSearch.js';
import { logLikelihoodJC69 } from './algorithms/jc69Likelihood.js';
import {
  runMlFigure5,
  scoreThreeBinaryTopologies,
  renderSubstitutionMatrixSvg,
} from './algorithms/mlDynamic.js';
import { parseNewick } from './utils/newickParser.js';
import { validateDistanceMatrix, matrixToNumeric } from './utils/matrixUtils.js';
import { renderDendrogram } from './rendering/dendrogramRenderer.js';
import { renderForceTree, renderRootedTree, renderSankoffTree, renderUnrootedQuartet } from './rendering/treeRenderer.js';
import { renderMatrix } from './rendering/matrixDisplay.js';

const DIST_EX_TAXA = ['A', 'B', 'C', 'D', 'E'];
const DIST_EX_MAT = [
  ['0', '5', '9', '9', '8'],
  ['5', '0', '10', '10', '9'],
  ['9', '10', '0', '8', '7'],
  ['9', '10', '8', '0', '3'],
  ['8', '9', '7', '3', '0'],
];

const CHAR_EX_TAXA = ['A', 'B', 'C', 'D', 'E'];
const CHAR_EX_ROWS = { A: '0011', B: '0010', C: '1100', D: '1000', E: '0111' };

const MP_DEFAULT_TEXT = `a: ATTGCCA
b: ATCGACT
c: AGTAACA
d: TGTAACT`;

const ML_DEFAULT_TEXT = `a: ATC
b: GCC
c: AAG`;

/** Lab sections with their own sequence textareas (not the shared character matrix). */
const STANDALONE_SEQ_SECTION_IDS = ['sec-mp', 'sec-ml'];

const state = {
  distTaxa: [...DIST_EX_TAXA],
  distMat: DIST_EX_MAT.map((r) => [...r]),
  charTaxa: [...CHAR_EX_TAXA],
  charRows: { ...CHAR_EX_ROWS },
  charMode: 'binary',
  lastUpgma: null,
  lastNj: null,
  lastUpgmaTaxa: null,
  upgmaStep: 0,
  njStep: 0,
  currentSection: 'sec-upgma',
  isHydratingSavedRun: false,
};

/** Sections that each have their own distance-matrix DOM (must stay in sync with `state`). */
const DIST_SECTION_IDS = ['sec-upgma', 'sec-nj', 'sec-4pt', 'sec-hc'];
const CHAR_SECTION_IDS = ['sec-fitch', 'sec-sankoff', 'sec-pp'];

function distanceGridId(sectionId) {
  const m = {
    'sec-upgma': 'upgma-dist-grid',
    'sec-nj': 'nj-dist-grid',
    'sec-4pt': 'fp-dist-grid',
    'sec-hc': 'hc-dist-grid',
  };
  return m[sectionId] || 'upgma-dist-grid';
}

function charGridId(sectionId) {
  const m = {
    'sec-fitch': 'fitch-char-grid',
    'sec-sankoff': 'sankoff-char-grid',
    'sec-pp': 'pp-char-grid',
  };
  return m[sectionId] || 'fitch-char-grid';
}

/** Read the visible character grid into `state.charRows` / `state.charTaxa`. */
function readCharFromDom(containerId) {
  const wrap = $(containerId);
  if (!wrap) return;
  const taxa = [];
  wrap.querySelectorAll('tbody tr').forEach((tr) => {
    const th = tr.querySelector('th');
    const t = th?.textContent?.trim();
    if (!t) return;
    taxa.push(t);
    const cells = [...tr.querySelectorAll('td input')];
    const fallback = state.charMode === 'dna' ? 'A' : '0';
    state.charRows[t] = cells
      .map((c) => {
        const v = c.value.trim().toUpperCase();
        return v.slice(0, 1) || fallback;
      })
      .join('');
  });
  if (taxa.length) state.charTaxa = taxa;
}

/** Re-render all distance tables from `state` so UPGMA/NJ/FP/HC always show the same matrix. */
function syncAllDistanceGridsFromState() {
  ['upgma', 'nj', 'fp', 'hc'].forEach((p) => mountDistGrid(`${p}-dist-grid`));
  updateMatrixTitles();
}

/**
 * Persist edits from whichever distance section is active, then refresh every distance grid.
 * Call this before any distance-based run so NJ/FP/HC do not read stale DOM from another tab.
 */
function prepareDistanceRun() {
  if (DIST_SECTION_IDS.includes(state.currentSection)) {
    readDistFromDom(distanceGridId(state.currentSection));
  }
  syncAllDistanceGridsFromState();
}

/** Persist edits from the active character section, then repaint all character grids. */
function prepareCharacterRun() {
  if (CHAR_SECTION_IDS.includes(state.currentSection)) {
    readCharFromDom(charGridId(state.currentSection));
    remountCharGrids();
  }
}

function $(id) {
  return document.getElementById(id);
}

function showErr(elId, msg) {
  const el = $(elId);
  if (!el) return;
  if (msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  } else el.classList.add('hidden');
}

function mountDistGrid(containerId) {
  const wrap = $(containerId);
  if (!wrap) return;
  const taxa = state.distTaxa;
  const matrix = state.distMat;
  const n = taxa.length;
  wrap.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'w-full border-collapse text-[14px]';
  const thead = document.createElement('thead');
  const tr0 = document.createElement('tr');
  const c00 = document.createElement('th');
  c00.className = 'border border-slate-200 bg-slate-50 p-1';
  tr0.appendChild(c00);
  for (let j = 0; j < n; j++) {
    const th = document.createElement('th');
    th.className = 'border border-slate-200 bg-slate-50 p-1';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = taxa[j];
    inp.dataset.idx = String(j);
    inp.className = 'w-full min-w-[2.5rem] rounded border border-slate-200 px-1 text-center text-[13px]';
    inp.addEventListener('change', () => {
      state.distTaxa[parseInt(inp.dataset.idx, 10)] = inp.value.trim() || `T${j}`;
    });
    th.appendChild(inp);
    tr0.appendChild(th);
  }
  thead.appendChild(tr0);
  table.appendChild(thead);
  const tb = document.createElement('tbody');
  for (let i = 0; i < n; i++) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.className = 'border border-slate-200 bg-slate-50 px-2 py-1 text-left text-[13px]';
    th.textContent = taxa[i];
    tr.appendChild(th);
    for (let j = 0; j < n; j++) {
      const td = document.createElement('td');
      td.className = 'border border-slate-200 p-0';
      const cell = document.createElement('input');
      cell.type = 'text';
      cell.inputMode = 'decimal';
      cell.value = matrix[i]?.[j] ?? '0';
      cell.dataset.i = String(i);
      cell.dataset.j = String(j);
      cell.className = 'w-full min-w-[2.5rem] bg-white px-1 py-1 text-right text-[13px]';
      cell.disabled = i === j;
      cell.addEventListener('change', () => {
        const ii = parseInt(cell.dataset.i, 10);
        const jj = parseInt(cell.dataset.j, 10);
        const v = cell.value.trim();
        if (!state.distMat[ii]) return;
        state.distMat[ii][jj] = v;
        if (ii !== jj) state.distMat[jj][ii] = v;
      });
      td.appendChild(cell);
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  }
  table.appendChild(tb);
  const tools = document.createElement('div');
  tools.className = 'mt-2 flex flex-wrap gap-2';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'rounded border border-slate-200 px-2 py-1 text-[14px]';
  addBtn.textContent = 'Add taxon';
  addBtn.onclick = () => {
    const nn = state.distTaxa.length + 1;
    state.distTaxa.push(`T${nn}`);
    state.distMat.forEach((r) => r.push('1'));
    state.distMat.push(Array.from({ length: nn }, (_, j) => (j === nn - 1 ? '0' : '1')));
    syncAllDistanceGridsFromState();
  };
  const rmBtn = document.createElement('button');
  rmBtn.type = 'button';
  rmBtn.className = 'rounded border border-slate-200 px-2 py-1 text-[14px]';
  rmBtn.textContent = 'Remove last taxon';
  rmBtn.onclick = () => {
    if (state.distTaxa.length < 3) return;
    state.distTaxa.pop();
    state.distMat.pop();
    state.distMat.forEach((r) => r.pop());
    syncAllDistanceGridsFromState();
  };
  tools.appendChild(addBtn);
  tools.appendChild(rmBtn);
  wrap.appendChild(table);
  wrap.appendChild(tools);
}

function readDistFromDom(containerId) {
  const wrap = $(containerId);
  if (!wrap) return { taxa: [], mat: [] };
  const headerInputs = wrap.querySelectorAll('thead input');
  const taxa = [...headerInputs].map((inp, j) => inp.value.trim() || `T${j + 1}`);
  const mat = [];
  wrap.querySelectorAll('tbody tr').forEach((tr) => {
    const cells = [...tr.querySelectorAll('td input')];
    mat.push(cells.map((c) => c.value.trim()));
  });
  state.distTaxa = taxa;
  state.distMat = mat;
  return { taxa, mat };
}

function mountCharGrid(containerId) {
  const wrap = $(containerId);
  if (!wrap) return;
  const taxa = state.charTaxa;
  const L = taxa.length ? (state.charRows[taxa[0]] || '').length || 4 : 4;
  wrap.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'border-collapse text-[14px]';
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  const c0 = document.createElement('th');
  c0.className = 'border border-slate-200 bg-slate-50 px-2 py-1';
  c0.textContent = 'Taxon';
  trh.appendChild(c0);
  for (let c = 0; c < L; c++) {
    const th = document.createElement('th');
    th.className = 'border border-slate-200 bg-slate-50 px-2 py-1';
    th.textContent = `c${c + 1}`;
    trh.appendChild(th);
  }
  thead.appendChild(trh);
  table.appendChild(thead);
  const tb = document.createElement('tbody');
  taxa.forEach((t) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.className = 'border border-slate-200 px-2 py-1 text-left';
    th.textContent = t;
    tr.appendChild(th);
    const seq = (state.charRows[t] || '').padEnd(L, '0').slice(0, L);
    state.charRows[t] = seq;
    for (let c = 0; c < L; c++) {
      const td = document.createElement('td');
      td.className = 'border border-slate-200 p-0';
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.maxLength = 1;
      inp.className = 'w-10 bg-white px-1 py-1 text-center font-mono uppercase';
      inp.value = seq[c];
      inp.dataset.taxon = t;
      inp.dataset.pos = String(c);
      inp.addEventListener('change', () => {
        const tx = inp.dataset.taxon;
        const pos = parseInt(inp.dataset.pos, 10);
        const arr = (state.charRows[tx] || '').split('');
        while (arr.length <= pos) arr.push('0');
        arr[pos] = inp.value.trim().slice(0, 1) || '0';
        state.charRows[tx] = arr.join('');
      });
      td.appendChild(inp);
      tr.appendChild(td);
    }
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  const addChar = document.createElement('button');
  addChar.type = 'button';
  addChar.className = 'mt-2 rounded border border-slate-200 px-2 py-1 text-[14px]';
  addChar.textContent = 'Add character column';
  addChar.onclick = () => {
    state.charTaxa.forEach((t) => {
      state.charRows[t] = (state.charRows[t] || '') + (state.charMode === 'binary' ? '0' : 'A');
    });
    mountCharGrid(containerId);
  };
  wrap.appendChild(table);
  wrap.appendChild(addChar);
}

function charMatrixObject() {
  const o = {};
  state.charTaxa.forEach((t) => {
    o[t] = state.charRows[t] || '';
  });
  return o;
}

function validateChars(mode) {
  const allowed = mode === 'binary' ? /^[01]$/ : /^[ACGT]$/i;
  for (const t of state.charTaxa) {
    const s = state.charRows[t] || '';
    for (let i = 0; i < s.length; i++) {
      if (!allowed.test(s[i])) return `Invalid "${s[i]}" for ${t} at c${i + 1} (${mode}).`;
    }
  }
  return '';
}

function htmlTable(headers, rows) {
  let h = '<table class="min-w-full border-collapse border border-slate-200 text-left text-[14px]"><thead><tr>';
  headers.forEach((x) => {
    h += `<th class="border border-slate-200 bg-slate-50 px-2 py-1">${x}</th>`;
  });
  h += '</tr></thead><tbody>';
  rows.forEach((r) => {
    h += `<tr>${r.map((c) => `<td class="border border-slate-200 px-2 py-1">${c}</td>`).join('')}</tr>`;
  });
  h += '</tbody></table>';
  return h;
}

function loadDistExample() {
  state.distTaxa = [...DIST_EX_TAXA];
  state.distMat = DIST_EX_MAT.map((r) => [...r]);
  ['upgma', 'nj', 'fp', 'hc'].forEach((p) => mountDistGrid(`${p}-dist-grid`));
  updateMatrixTitles();
}

function loadCharExample() {
  state.charTaxa = [...CHAR_EX_TAXA];
  state.charRows = { ...CHAR_EX_ROWS };
  state.charMode = 'binary';
  document.querySelectorAll('input[name="char-mode"]').forEach((r) => {
    r.checked = r.value === 'binary';
  });
  remountCharGrids();
}

function remountCharGrids() {
  ['fitch-char-grid', 'sankoff-char-grid', 'pp-char-grid'].forEach(mountCharGrid);
}

function upgmaMergeTable(hist) {
  const rows = hist.map((m) => [m.step, m.merged.join(' + '), m.mergeHeight, m.size]);
  $('upgma-merge-table').innerHTML = htmlTable(['step', 'clusters merged', 'merge height', 'new cluster size'], rows);
}

function njMergeTable(mt) {
  const rows = mt
    .filter((r) => !r.final)
    .map((r) => [r.iteration, r.pair.join(', '), r.q, r.limbI, r.limbJ]);
  $('nj-merge-table').innerHTML = htmlTable(['iteration', 'pair (i,j)', 'Q', 'branch to i', 'branch to j'], rows);
}

function partialUpgmaTree(up, nMerges) {
  const taxa = state.lastUpgmaTaxa || state.distTaxa;
  const map = new Map();
  taxa.forEach((t) => map.set(t, { name: t, isLeaf: true, branchLength: 0, children: [] }));
  for (let s = 0; s < nMerges; s++) {
    const m = up.mergeHistory[s];
    const ca = map.get(m.merged[0]);
    const cb = map.get(m.merged[1]);
    if (!ca || !cb) continue;
    map.set(m.newCluster, {
      name: m.newCluster,
      isLeaf: false,
      branchLength: 0,
      mergeHeight: m.mergeHeight,
      children: [
        { ...ca, branchLength: m.branchLengths[m.merged[0]] },
        { ...cb, branchLength: m.branchLengths[m.merged[1]] },
      ],
    });
    map.delete(m.merged[0]);
    map.delete(m.merged[1]);
  }
  return [...map.values()][0];
}

function drawUpgmaStep() {
  const up = state.lastUpgma;
  if (!up) return;
  const snaps = up.stepSnapshots;
  const last = snaps.length;
  const idx = Math.min(state.upgmaStep, last);
  if (idx >= last) {
    renderDendrogram('#upgma-dendro', up.tree);
    $('upgma-matrix-step').innerHTML = '<p class="text-[15px] text-slate-500">Final tree.</p>';
    $('upgma-step-label').textContent = `Final (${last} merges)`;
    return;
  }
  const snap = snaps[idx];
  const lab = snap.labels || snap.matrixBefore.map((_, i) => String(i));
  renderMatrix('#upgma-matrix-step', snap.matrixBefore, lab, lab, { highlight: snap.selectedPair });
  renderDendrogram('#upgma-dendro', partialUpgmaTree(up, idx + 1));
  $('upgma-step-label').textContent = `Merge ${idx + 1} / ${last}: ${snap.selectedPair.join(' + ')} @ height ${snap.mergeHeight}`;
}

function drawNjStep() {
  const nj = state.lastNj;
  if (!nj || !nj.stepSnapshots) return;
  const snaps = nj.stepSnapshots;
  const last = snaps.length;
  const idx = Math.min(state.njStep, last - 1);
  const snap = snaps[idx];
  renderForceTree('#nj-force', nj.tree);
  if (snap.final || !snap.qMatrix) {
    $('nj-q-display').innerHTML = '<p class="text-[15px] text-slate-500">Q-matrix (final join only distances).</p>';
    if (snap.labels)
      renderMatrix('#nj-d-display', snap.matrixBefore, snap.labels, snap.labels, { highlight: snap.selectedPair });
    $('nj-step-label').textContent = 'Final join';
    return;
  }
  renderMatrix('#nj-q-display', snap.qMatrix, snap.labels, snap.labels, { highlight: snap.selectedPair });
  renderMatrix('#nj-d-display', snap.matrixBefore, snap.labels, snap.labels, { highlight: snap.selectedPair });
  $('nj-step-label').textContent = `Iteration ${snap.iteration} (${idx + 1}/${last})`;
}

function setNavActive() {
  const links = document.querySelectorAll('.algo-nav-link');
  const sections = [...document.querySelectorAll('details[id^="sec-"]')];
  let current = sections[0]?.id || 'sec-upgma';
  for (const sec of sections) {
    const top = sec.getBoundingClientRect().top;
    if (top <= 140) current = sec.id;
  }
  links.forEach((a) => {
    const on = a.getAttribute('href') === `#${current}`;
    a.classList.toggle('bg-blue-50', on);
    a.classList.toggle('text-blue-700', on);
    a.classList.toggle('font-semibold', on);
  });
}

function copySameMatrix() {
  readDistFromDom('upgma-dist-grid');
  syncAllDistanceGridsFromState();
}

function setStatusBadge(text) {
  const badge = $('algo-status-badge');
  if (badge) badge.textContent = text;
}

function getCsrfToken() {
  const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
  return input ? input.value : '';
}

async function persistRun(analysisType, title, inputPayload, resultPayload) {
  if (state.isHydratingSavedRun) return;
  try {
    const res = await fetch('/api/runs/save/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        analysis_type: analysisType,
        title,
        input_payload: inputPayload,
        result_payload: resultPayload,
      }),
    });
    if (!res.ok) return;
    setStatusBadge(`${analysisType} saved`);
  } catch (_) {
    // Keep UI usable even if autosave fails.
  }
}

function updateMatrixTitles() {
  const n = state.distTaxa.length;
  if ($('upgma-matrix-title')) $('upgma-matrix-title').textContent = `Distance Matrix (n=${n})`;
  if ($('nj-title')) $('nj-title').textContent = `02 Neighbor Joining (n=${n})`;
  if ($('fp-title')) $('fp-title').textContent = `03 Four-Point Condition (n=${n})`;
  if ($('hc-title')) $('hc-title').textContent = `04 Hierarchical Clustering (n=${n})`;
}

function openFilePicker() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.csv,.tsv,.json,.fasta,.fa,.phy';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const text = await file.text();
      resolve(text);
    };
    input.click();
  });
}

function parseDistanceUpload(text) {
  const raw = (text || '').trim();
  if (!raw) throw new Error('Uploaded file is empty.');

  // JSON support: { taxa: [...], matrix: [[...]] } or { taxa, data }
  try {
    const j = JSON.parse(raw);
    const taxa = j.taxa;
    const matrix = j.matrix || j.data;
    if (Array.isArray(taxa) && Array.isArray(matrix)) {
      const out = matrix.map((r) => r.map((v) => String(v)));
      return { taxa: taxa.map(String), matrix: out };
    }
  } catch (_) {}

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows = lines.map((line) => line.split(/[,\t ]+/).filter(Boolean));
  if (!rows.length) throw new Error('Could not read any rows from the file.');

  const isNum = (v) => Number.isFinite(Number(v));
  const firstRowHeader = rows[0].length > 1 && !isNum(rows[0][0]) && rows[0].slice(1).every((v) => !isNum(v));
  const rowLabelStyle = rows.every((r) => r.length > 1 && !isNum(r[0]) && r.slice(1).every(isNum));

  let taxa = [];
  let matrixRows = [];

  if (firstRowHeader) {
    taxa = rows[0].slice(1);
    matrixRows = rows.slice(1).map((r) => r.slice(1));
  } else if (rowLabelStyle) {
    taxa = rows.map((r) => r[0]);
    matrixRows = rows.map((r) => r.slice(1));
  } else {
    matrixRows = rows;
    taxa = rows[0].map((_, i) => `T${i + 1}`);
  }

  if (!matrixRows.length || matrixRows.some((r) => r.length !== matrixRows.length)) {
    throw new Error('Distance matrix must be square (same rows and columns).');
  }

  if (taxa.length !== matrixRows.length) {
    taxa = Array.from({ length: matrixRows.length }, (_, i) => `T${i + 1}`);
  }

  return { taxa: taxa.map(String), matrix: matrixRows.map((r) => r.map(String)) };
}

function parseCharacterUpload(text) {
  const raw = (text || '').trim();
  if (!raw) throw new Error('Uploaded file is empty.');

  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j.taxa) && j.rows && typeof j.rows === 'object') {
      const rows = {};
      j.taxa.forEach((t) => {
        rows[String(t)] = String(j.rows[t] ?? '');
      });
      return { taxa: j.taxa.map(String), rows };
    }
    if (Array.isArray(j.taxa) && Array.isArray(j.characters)) {
      const rows = {};
      j.taxa.forEach((t, i) => {
        rows[String(t)] = (j.characters[i] || []).map(String).join('');
      });
      return { taxa: j.taxa.map(String), rows };
    }
  } catch (_) {}

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // FASTA support
  if (lines.some((l) => l.startsWith('>'))) {
    const taxa = [];
    const rows = {};
    let current = null;
    for (const l of lines) {
      if (l.startsWith('>')) {
        current = l.slice(1).trim();
        if (!current) continue;
        taxa.push(current);
        rows[current] = '';
      } else if (current) {
        rows[current] += l.replace(/\s+/g, '');
      }
    }
    if (taxa.length) return { taxa, rows };
  }

  // "Taxon: SEQ" or "Taxon,SEQ"
  const pairs = lines
    .map((l) => {
      const m = l.match(/^([^:,]+)\s*[: ,]\s*([A-Za-z01]+)$/);
      return m ? [m[1].trim(), m[2].trim()] : null;
    })
    .filter(Boolean);
  if (pairs.length) {
    const taxa = pairs.map((p) => p[0]);
    const rows = {};
    pairs.forEach(([t, s]) => {
      rows[t] = s;
    });
    return { taxa, rows };
  }

  throw new Error('Unsupported character file format.');
}

function setCharModeFromRows(rowsObj) {
  const seq = Object.values(rowsObj).join('').toUpperCase();
  const binary = /^[01]*$/.test(seq);
  state.charMode = binary ? 'binary' : 'dna';
  document.querySelectorAll('input[name="char-mode"]').forEach((r) => {
    r.checked = r.value === state.charMode;
  });
}

async function uploadDistanceFromFile() {
  const text = await openFilePicker();
  if (!text) return;
  const parsed = parseDistanceUpload(text);
  state.distTaxa = parsed.taxa;
  state.distMat = parsed.matrix;
  ['upgma', 'nj', 'fp', 'hc'].forEach((p) => mountDistGrid(`${p}-dist-grid`));
  updateMatrixTitles();
}

async function uploadCharactersFromFile() {
  const text = await openFilePicker();
  if (!text) return;
  const parsed = parseCharacterUpload(text);
  state.charTaxa = parsed.taxa;
  state.charRows = parsed.rows;
  setCharModeFromRows(parsed.rows);
  remountCharGrids();
}

function expandPanel(elId, heightPx) {
  const el = $(elId);
  if (!el) return;
  el.style.minHeight = `${heightPx}px`;
}

function labelForSection(sectionId) {
  const map = {
    'sec-upgma': 'UPGMA Reconstruction',
    'sec-nj': 'Neighbor Joining Reconstruction',
    'sec-4pt': 'Four-Point Condition',
    'sec-hc': 'Hierarchical Clustering',
    'sec-fitch': 'Fitch Parsimony',
    'sec-sankoff': 'Sankoff Algorithm',
    'sec-pp': 'Perfect Phylogeny',
    'sec-mp': 'Maximum Parsimony',
    'sec-ml': 'Maximum Likelihood (JC69)',
  };
  return map[sectionId] || 'Algorithm lab';
}

function showOnlySection(sectionId) {
  const sections = [...document.querySelectorAll('.algo-section')];
  if (!sections.length) return;
  const prevSection = state.currentSection;
  const target = document.getElementById(sectionId) || document.getElementById('sec-upgma');
  const activeId = target?.id || 'sec-upgma';

  // Persist in-progress edits from the section we are leaving (each algorithm has its own DOM table).
  if (DIST_SECTION_IDS.includes(prevSection)) {
    readDistFromDom(distanceGridId(prevSection));
  }
  if (CHAR_SECTION_IDS.includes(prevSection)) {
    readCharFromDom(charGridId(prevSection));
  }

  state.currentSection = activeId;

  sections.forEach((sec) => sec.classList.add('hidden'));
  if (target) target.classList.remove('hidden');

  if (DIST_SECTION_IDS.includes(activeId)) {
    syncAllDistanceGridsFromState();
  }
  if (CHAR_SECTION_IDS.includes(activeId)) {
    remountCharGrids();
    if (activeId === 'sec-sankoff' && !document.querySelector('.cost-cell')) {
      mountCostEditor(state.charMode);
    }
  }

  const titleEl = document.querySelector('header h2');
  if (titleEl) titleEl.textContent = labelForSection(activeId);
  setStatusBadge('Ready');
  document.querySelectorAll('[data-algo-link]').forEach((a) => {
    const on = a.getAttribute('data-algo-link') === activeId;
    a.classList.toggle('bg-cyan-500/10', on);
    a.classList.toggle('text-cyan-400', on);
    a.classList.toggle('border-cyan-400', on);
    a.classList.toggle('text-slate-400', !on);
    a.classList.toggle('border-transparent', !on);
  });
}

function runCurrentAlgorithm() {
  const map = {
    'sec-upgma': 'upgma-run',
    'sec-nj': 'nj-run',
    'sec-4pt': 'fp-run',
    'sec-hc': 'hc-run',
    'sec-fitch': 'fitch-run',
    'sec-sankoff': 'sankoff-run',
    'sec-pp': 'pp-run',
    'sec-mp': 'mp-run',
    'sec-ml': 'ml-run',
  };
  $(map[state.currentSection] || 'upgma-run')?.click();
}

function mapAnalysisTypeToSection(analysisType) {
  const key = String(analysisType || '').toUpperCase();
  const map = {
    UPGMA: 'sec-upgma',
    NJ: 'sec-nj',
    NEIGHBOR_JOINING: 'sec-nj',
    FOUR_POINT: 'sec-4pt',
    HIERARCHICAL: 'sec-hc',
    FITCH: 'sec-fitch',
    PARSIMONY: 'sec-fitch',
    SANKOFF: 'sec-sankoff',
    PERFECT_PHYLOGENY: 'sec-pp',
    MP: 'sec-mp',
    MAXIMUM_PARSIMONY: 'sec-mp',
    ML: 'sec-ml',
    MAXIMUM_LIKELIHOOD: 'sec-ml',
  };
  return map[key] || 'sec-upgma';
}

function setDistanceStateFromInput(inputPayload) {
  const taxa = Array.isArray(inputPayload?.taxa) ? inputPayload.taxa.map(String) : null;
  const matrix = Array.isArray(inputPayload?.matrix)
    ? inputPayload.matrix.map((row) => (Array.isArray(row) ? row.map((v) => String(v)) : []))
    : null;
  if (!taxa || !matrix || !taxa.length || matrix.length !== taxa.length) return false;
  state.distTaxa = taxa;
  state.distMat = matrix;
  ['upgma', 'nj', 'fp', 'hc'].forEach((p) => mountDistGrid(`${p}-dist-grid`));
  updateMatrixTitles();
  return true;
}

function setCharacterStateFromInput(inputPayload) {
  const matrix = inputPayload?.matrix;
  if (!matrix || typeof matrix !== 'object') return false;
  const taxa = Object.keys(matrix);
  if (!taxa.length) return false;
  state.charTaxa = taxa;
  state.charRows = {};
  taxa.forEach((taxon) => {
    state.charRows[taxon] = String(matrix[taxon] || '');
  });
  const requestedMode = String(inputPayload?.mode || '').toLowerCase();
  state.charMode = requestedMode === 'dna' ? 'dna' : 'binary';
  document.querySelectorAll('input[name="char-mode"]').forEach((r) => {
    r.checked = r.value === state.charMode;
  });
  remountCharGrids();
  if (inputPayload?.newick && $('fitch-newick')) $('fitch-newick').value = String(inputPayload.newick);
  if (inputPayload?.newick && $('sankoff-newick')) $('sankoff-newick').value = String(inputPayload.newick);
  return true;
}

async function hydrateSavedRunFromQuery() {
  const params = new URLSearchParams(window.location.search || '');
  const runId = params.get('run_id');
  if (!runId) return;
  try {
    const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/`, {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Failed to load saved run.');
    const data = await res.json();
    const run = data?.run;
    if (!run) throw new Error('Saved run payload missing.');

    const sectionId = mapAnalysisTypeToSection(run.analysis_type);
    showOnlySection(sectionId);
    const newUrl = `${window.location.pathname}${window.location.search}#${sectionId}`;
    window.history.replaceState(null, '', newUrl);

    const input = run.input_payload || {};
    if (['sec-upgma', 'sec-nj', 'sec-4pt', 'sec-hc'].includes(sectionId)) {
      setDistanceStateFromInput(input);
    } else if (sectionId === 'sec-mp' && input.raw_sequences && $('mp-input')) {
      $('mp-input').value = String(input.raw_sequences);
    } else if (sectionId === 'sec-ml' && input.raw_sequences && $('ml-input')) {
      $('ml-input').value = String(input.raw_sequences);
    } else {
      setCharacterStateFromInput(input);
    }
    if (sectionId === 'sec-hc') {
      const linkage = String(input.linkage || 'average').toLowerCase();
      const radio = document.querySelector(`input[name="hc-link"][value="${linkage}"]`);
      if (radio) radio.checked = true;
    }

    state.isHydratingSavedRun = true;
    runCurrentAlgorithm();
    setStatusBadge(`Loaded saved run #${run.id}`);
  } catch (_) {
    setStatusBadge('Unable to load saved run');
  } finally {
    state.isHydratingSavedRun = false;
  }
}

function resetDistanceToDefault() {
  state.distTaxa = [...DIST_EX_TAXA];
  state.distMat = DIST_EX_MAT.map((r) => [...r]);
  ['upgma', 'nj', 'fp', 'hc'].forEach((p) => mountDistGrid(`${p}-dist-grid`));
  updateMatrixTitles();
}

function resetCharactersToDefault() {
  state.charTaxa = [...CHAR_EX_TAXA];
  state.charRows = { ...CHAR_EX_ROWS };
  state.charMode = 'binary';
  document.querySelectorAll('input[name="char-mode"]').forEach((r) => {
    r.checked = r.value === 'binary';
  });
  remountCharGrids();
}

function clearCurrentOutputs() {
  state.lastUpgma = null;
  state.lastNj = null;
  state.upgmaStep = 0;
  state.njStep = 0;

  const upgmaLabel = $('upgma-step-label');
  if (upgmaLabel) upgmaLabel.textContent = '';
  if ($('upgma-dendro')) $('upgma-dendro').innerHTML = '';
  if ($('upgma-merge-table')) $('upgma-merge-table').innerHTML = '';
  if ($('upgma-matrix-step')) $('upgma-matrix-step').innerHTML = '';
  if ($('upgma-viz-card')) $('upgma-viz-card').style.minHeight = '160px';
  if ($('upgma-dendro')) $('upgma-dendro').style.minHeight = '120px';

  [
    'nj-force',
    'nj-q-display',
    'nj-d-display',
    'nj-merge-table',
    'nj-step-controls',
    'fp-badge',
    'fp-table',
    'hc-dendro',
    'hc-merge-table',
    'fitch-card',
    'fitch-tree',
    'fitch-table',
    'sankoff-card',
    'sankoff-tree',
    'pp-banner',
    'pp-heatmap',
    'pp-bad-pairs',
    'mp-alignment-wrap',
    'mp-informative-wrap',
    'mp-triple-topo-row',
    'mp-score-wrap',
    'mp-best-wrap',
    'mp-tree-viz',
    'ml-score-wrap',
    'ml-best-wrap',
    'ml-tree-viz',
    'ml-best-model-panel',
  ].forEach((id) => {
    const el = $(id);
    if (!el) return;
    if (id === 'nj-step-controls') el.classList.add('hidden');
    else el.classList.add('hidden');
    if (
      [
        'nj-q-display',
        'nj-d-display',
        'nj-merge-table',
        'fp-badge',
        'fp-table',
        'hc-merge-table',
        'fitch-card',
        'fitch-table',
        'sankoff-card',
        'pp-banner',
        'pp-heatmap',
        'pp-bad-pairs',
        'mp-alignment-matrix',
        'mp-informative-table',
        'mp-score-table',
        'ml-score-table',
        'ml-mat-jc69',
        'ml-mat-k80',
        'ml-mat-hky',
        'ml-mat-best',
      ].includes(id)
    ) {
      el.innerHTML = '';
    }
  });
  if ($('nj-force')) {
    $('nj-force').style.minHeight = '120px';
    $('nj-force').innerHTML = '';
  }
  if ($('hc-dendro')) {
    $('hc-dendro').style.minHeight = '120px';
    $('hc-dendro').innerHTML = '';
  }
  if ($('fitch-tree')) {
    $('fitch-tree').style.minHeight = '120px';
    $('fitch-tree').innerHTML = '';
  }
  if ($('sankoff-tree')) {
    $('sankoff-tree').style.minHeight = '120px';
    $('sankoff-tree').innerHTML = '';
  }
  showErr('mp-err', '');
  showErr('ml-err', '');
  ['mp-note', 'ml-note'].forEach((nid) => {
    const n = $(nid);
    if (n) {
      n.classList.add('hidden');
      n.textContent = '';
    }
  });
  if ($('mp-tree-viz')) {
    $('mp-tree-viz').style.minHeight = '120px';
    $('mp-tree-viz').innerHTML = '';
  }
  if ($('ml-tree-viz')) {
    $('ml-tree-viz').style.minHeight = '120px';
    $('ml-tree-viz').innerHTML = '';
  }
  [
    'mp-alignment-matrix',
    'mp-informative-table',
    'mp-score-table',
    'ml-score-table',
    'mp-topo-0',
    'mp-topo-1',
    'mp-topo-2',
    'ml-cand-0',
    'ml-cand-1',
    'ml-cand-2',
    'ml-mat-jc69',
    'ml-mat-k80',
    'ml-mat-hky',
    'ml-mat-best',
  ].forEach((tid) => {
    const t = $(tid);
    if (t) t.innerHTML = '';
  });
  ['ml-stat-jc69', 'ml-stat-k80', 'ml-stat-hky'].forEach((sid) => {
    const s = $(sid);
    if (s) s.textContent = '';
  });
  if ($('ml-best-model-text')) $('ml-best-model-text').innerHTML = '';
  [0, 1, 2].forEach((i) => {
    const c = $(`ml-cand-${i}`);
    if (c) {
      c.classList.remove('ring-2', 'ring-sky-500', 'ring-emerald-500', 'ring-emerald-600');
    }
    const w = document.querySelector(`#mp-topo-${i}`)?.parentElement;
    if (w) w.classList.remove('ring-2', 'ring-emerald-500');
  });
  ['mp-best-newick', 'mp-best-score', 'ml-best-newick', 'ml-best-ll'].forEach((pid) => {
    const p = $(pid);
    if (p) p.textContent = '';
  });
}

function resetMpMlTextareas() {
  if ($('mp-input')) $('mp-input').value = MP_DEFAULT_TEXT;
  if ($('ml-input')) $('ml-input').value = ML_DEFAULT_TEXT;
}

function resetCurrentAlgorithm() {
  const active = state.currentSection || 'sec-upgma';
  if (['sec-upgma', 'sec-nj', 'sec-4pt', 'sec-hc'].includes(state.currentSection)) {
    resetDistanceToDefault();
  } else if (STANDALONE_SEQ_SECTION_IDS.includes(state.currentSection)) {
    resetMpMlTextareas();
  } else {
    resetCharactersToDefault();
  }
  clearCurrentOutputs();
  // Re-apply the active section shell so stale rendered output cannot persist.
  showOnlySection(active);
  setStatusBadge('Reset complete');
}

function wireUpgma() {
  if (!$('upgma-run')) return;
  $('upgma-run').onclick = () => {
    try {
      showErr('upgma-err', '');
      prepareDistanceRun();
      const { taxa, mat } = { taxa: state.distTaxa, mat: state.distMat };
      const v = validateDistanceMatrix(mat, taxa);
      if (!v.ok) throw new Error(v.error);
      if (taxa.length < 3) showErr('upgma-err', 'Note: use at least 3 taxa for meaningful clustering.');
      const num = matrixToNumeric(mat, taxa);
      state.lastUpgmaTaxa = [...taxa];
      state.lastUpgma = runUPGMA(num, taxa);
      state.upgmaStep = 0;
      setStatusBadge('UPGMA complete');
      expandPanel('upgma-viz-card', 460);
      expandPanel('upgma-dendro', 420);
      upgmaMergeTable(state.lastUpgma.mergeHistory);
      drawUpgmaStep();
      persistRun(
        'UPGMA',
        `UPGMA (${taxa.length} taxa)`,
        { taxa, matrix: mat },
        { method: 'UPGMA', newick: state.lastUpgma.newick, detailed_steps: state.lastUpgma.stepSnapshots || [] },
      );
    } catch (e) {
      showErr('upgma-err', e.message || String(e));
    }
  };
  $('upgma-step-prev').onclick = () => {
    state.upgmaStep = Math.max(0, state.upgmaStep - 1);
    drawUpgmaStep();
  };
  $('upgma-step-next').onclick = () => {
    if (!state.lastUpgma) return;
    state.upgmaStep = Math.min(state.lastUpgma.stepSnapshots.length, state.upgmaStep + 1);
    drawUpgmaStep();
  };
  $('upgma-step-all').onclick = () => {
    if (!state.lastUpgma) return;
    state.upgmaStep = state.lastUpgma.stepSnapshots.length;
    drawUpgmaStep();
  };
}

function wireNj() {
  if (!$('nj-run')) return;
  $('nj-same-matrix').onclick = copySameMatrix;
  $('nj-example').onclick = async () => {
    try {
      await uploadDistanceFromFile();
      showErr('nj-err', '');
    } catch (e) {
      showErr('nj-err', e.message || String(e));
    }
  };
  $('nj-run').onclick = () => {
    try {
      showErr('nj-err', '');
      prepareDistanceRun();
      const { taxa, mat } = { taxa: state.distTaxa, mat: state.distMat };
      const v = validateDistanceMatrix(mat, taxa);
      if (!v.ok) throw new Error(v.error);
      const num = matrixToNumeric(mat, taxa);
      state.lastNj = runNJ(num, taxa);
      state.njStep = 0;
      setStatusBadge('NJ complete');
      const forceEl = $('nj-force');
      const stepControls = $('nj-step-controls');
      if (forceEl) {
        forceEl.classList.remove('hidden');
        forceEl.style.minHeight = '420px';
      }
      if (stepControls) stepControls.classList.remove('hidden');
      $('nj-q-display')?.classList.remove('hidden');
      $('nj-d-display')?.classList.remove('hidden');
      $('nj-merge-table')?.classList.remove('hidden');
      njMergeTable(state.lastNj.mergeTable);
      drawNjStep();
      persistRun(
        'NJ',
        `Neighbor Joining (${taxa.length} taxa)`,
        { taxa, matrix: mat },
        { method: 'Neighbor Joining', newick: state.lastNj.newick || '', detailed_steps: state.lastNj.stepSnapshots || [] },
      );
    } catch (e) {
      showErr('nj-err', e.message || String(e));
    }
  };
  $('nj-step-prev').onclick = () => {
    state.njStep = Math.max(0, state.njStep - 1);
    drawNjStep();
  };
  $('nj-step-next').onclick = () => {
    if (!state.lastNj) return;
    state.njStep = Math.min(state.lastNj.stepSnapshots.length - 1, state.njStep + 1);
    drawNjStep();
  };
  $('nj-step-all').onclick = () => {
    if (!state.lastNj) return;
    state.njStep = state.lastNj.stepSnapshots.length - 1;
    drawNjStep();
  };
}

function wireFp() {
  if (!$('fp-run')) return;
  $('fp-same-matrix').onclick = copySameMatrix;
  $('fp-example').onclick = async () => {
    try {
      await uploadDistanceFromFile();
      showErr('fp-err', '');
    } catch (e) {
      showErr('fp-err', e.message || String(e));
    }
  };
  $('fp-run').onclick = () => {
    try {
      showErr('fp-err', '');
      prepareDistanceRun();
      const { taxa, mat } = { taxa: state.distTaxa, mat: state.distMat };
      const v = validateDistanceMatrix(mat, taxa);
      if (!v.ok) throw new Error(v.error);
      const r = checkFourPoint(matrixToNumeric(mat, taxa), taxa);
      setStatusBadge('Four-point complete');
      $('fp-badge')?.classList.remove('hidden');
      $('fp-table')?.classList.remove('hidden');
      $('fp-badge').innerHTML = r.additive
        ? '<span class="inline-block rounded-full bg-emerald-100 px-4 py-2 font-semibold text-emerald-800">Matrix IS additive</span>'
        : '<span class="inline-block rounded-full bg-red-100 px-4 py-2 font-semibold text-red-800">Matrix is NOT additive</span>';
      $('fp-table').innerHTML = htmlTable(
        ['quadruple', 'S1', 'S2', 'S3', 'pass'],
        r.rows.map((x) => [x.quadruple, x.s1, x.s2, x.s3, x.pass ? 'yes' : 'no']),
      );
      persistRun(
        'FOUR_POINT',
        `Four-point (${taxa.length} taxa)`,
        { taxa, matrix: mat },
        { additive: r.additive, rows: r.rows, summary: r.summary || '' },
      );
    } catch (e) {
      showErr('fp-err', e.message || String(e));
    }
  };
}

function wireHc() {
  if (!$('hc-run')) return;
  $('hc-same-matrix').onclick = copySameMatrix;
  $('hc-example').onclick = async () => {
    try {
      await uploadDistanceFromFile();
      showErr('hc-err', '');
    } catch (e) {
      showErr('hc-err', e.message || String(e));
    }
  };
  const run = () => {
    try {
      showErr('hc-err', '');
      prepareDistanceRun();
      const link = document.querySelector('input[name="hc-link"]:checked')?.value || 'average';
      const { taxa, mat } = { taxa: state.distTaxa, mat: state.distMat };
      const v = validateDistanceMatrix(mat, taxa);
      if (!v.ok) throw new Error(v.error);
      const r = runHierarchical(matrixToNumeric(mat, taxa), taxa, link);
      setStatusBadge('Hierarchical complete');
      $('hc-dendro')?.classList.remove('hidden');
      expandPanel('hc-dendro', 400);
      $('hc-merge-table')?.classList.remove('hidden');
      renderDendrogram('#hc-dendro', r.tree);
      $('hc-merge-table').innerHTML = htmlTable(
        ['step', 'merged', 'distance'],
        r.mergeHistory.map((m) => [m.step, m.merged.join(' + '), m.distance]),
      );
      persistRun(
        'HIERARCHICAL',
        `Hierarchical ${link} (${taxa.length} taxa)`,
        { taxa, matrix: mat, linkage: link },
        { method: `Hierarchical-${link}`, newick: r.newick || '', detailed_steps: r.stepSnapshots || [], merge_history: r.mergeHistory || [] },
      );
    } catch (e) {
      showErr('hc-err', e.message || String(e));
    }
  };
  $('hc-run').onclick = run;
  document.querySelectorAll('input[name="hc-link"]').forEach((r) => {
    r.onchange = run;
  });
}

function wireFitch() {
  if (!$('fitch-run')) return;
  document.querySelectorAll('input[name="char-mode"]').forEach((r) => {
    r.onchange = () => {
      state.charMode = r.value === 'dna' ? 'dna' : 'binary';
    };
  });
  $('fitch-example').onclick = () => {
    uploadCharactersFromFile().catch((e) => showErr('fitch-err', e.message || String(e)));
  };
  $('fitch-run').onclick = () => {
    try {
      showErr('fitch-err', '');
      const mode = document.querySelector('input[name="char-mode"]:checked')?.value === 'dna' ? 'dna' : 'binary';
      state.charMode = mode;
      prepareCharacterRun();
      const err = validateChars(mode === 'binary' ? 'binary' : 'dna');
      if (err) throw new Error(err);
      const tree = JSON.parse(JSON.stringify(parseNewick($('fitch-newick').value)));
      const r = runFitch(tree, charMatrixObject(), mode);
      setStatusBadge('Fitch complete');
      $('fitch-tree')?.classList.remove('hidden');
      expandPanel('fitch-tree', 360);
      $('fitch-card')?.classList.remove('hidden');
      $('fitch-table')?.classList.remove('hidden');
      $('fitch-card').textContent = `Total parsimony score = ${r.totalScore}`;
      const colors = { '0': '#3b82f6', '1': '#fb7185', A: '#22c55e', C: '#3b82f6', G: '#f59e0b', T: '#ef4444' };
      const lastChar = r.byCharacter[r.byCharacter.length - 1];
      const assignMap = new Map(lastChar.rows.map((row) => [row.node, row.assigned]));
      renderRootedTree('#fitch-tree', tree, {
        nodeFill: (d) => {
          if (!d.data.isLeaf) return '#cbd5e1';
          const st = assignMap.get(d.data.name) || d.data.name;
          return colors[st] || '#14b8a6';
        },
        internalLabel: (d) => {
          const row = r.byCharacter[0]?.rows?.find((x) => x.node === d.data.name);
          return row && !d.data.isLeaf ? `{${row.set}}` : '';
        },
      });
      const rows = r.byCharacter.map((c) => [`c${c.index + 1}`, c.score, c.rows.map((x) => `${x.node}:${x.assigned}`).join('; ')]);
      $('fitch-table').innerHTML = htmlTable(['character', 'score', 'assignments'], rows);
      persistRun(
        'FITCH',
        `Fitch (${mode.toUpperCase()})`,
        { mode, newick: $('fitch-newick').value, matrix: charMatrixObject() },
        { total_score: r.totalScore, by_character: r.byCharacter || [] },
      );
    } catch (e) {
      showErr('fitch-err', e.message || String(e));
    }
  };
}

function mountCostEditor(mode) {
  const wrap = $('sankoff-cost');
  if (!wrap) return;
  const st = mode === 'binary' ? ['0', '1'] : ['A', 'C', 'G', 'T'];
  const costs = defaultCostMatrix(mode);
  let html = '<p class="mb-2 text-[14px] font-medium text-slate-700">Substitution costs (edit cells)</p><table class="border-collapse text-[13px]">';
  html += '<thead><tr><th class="border px-1"></th>';
  st.forEach((s) => {
    html += `<th class="border border-slate-200 bg-slate-50 px-2">${s}</th>`;
  });
  html += '</tr></thead><tbody>';
  st.forEach((a) => {
    html += `<tr><th class="border border-slate-200 bg-slate-50 px-2">${a}</th>`;
    st.forEach((b) => {
      const v = costs[a][b];
      html += `<td class="border p-0"><input type="text" class="cost-cell w-12 px-1 py-1 text-center" data-a="${a}" data-b="${b}" value="${v}" /></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function readCostMatrix(mode) {
  const st = mode === 'binary' ? ['0', '1'] : ['A', 'C', 'G', 'T'];
  const m = {};
  st.forEach((a) => {
    m[a] = {};
    st.forEach((b) => {
      const inp = document.querySelector(`.cost-cell[data-a="${a}"][data-b="${b}"]`);
      const v = parseFloat(inp?.value ?? '1');
      m[a][b] = Number.isFinite(v) ? v : 1;
    });
  });
  return m;
}

function wireSankoff() {
  if (!$('sankoff-run')) return;
  $('sankoff-same-char').onclick = remountCharGrids;
  $('sankoff-example').onclick = () => {
    uploadCharactersFromFile()
      .then(() => mountCostEditor(state.charMode))
      .catch((e) => showErr('sankoff-err', e.message || String(e)));
  };
  $('sankoff-run').onclick = () => {
    try {
      showErr('sankoff-err', '');
      const mode =
        document.querySelector('input[name="char-mode"]:checked')?.value === 'dna' ? 'dna' : 'binary';
      state.charMode = mode;
      prepareCharacterRun();
      const err = validateChars(mode);
      if (err) throw new Error(err);
      if (!document.querySelector('.cost-cell')) mountCostEditor(mode);
      const tree = JSON.parse(JSON.stringify(parseNewick($('sankoff-newick').value)));
      const costs = readCostMatrix(mode);
      const r = runSankoff(tree, charMatrixObject(), costs, mode);
      setStatusBadge('Sankoff complete');
      $('sankoff-tree')?.classList.remove('hidden');
      expandPanel('sankoff-tree', 360);
      $('sankoff-card')?.classList.remove('hidden');
      $('sankoff-card').textContent = `Total Sankoff cost = ${r.totalCost}`;
      renderSankoffTree('#sankoff-tree', r.sankoffTree, r.states);
      persistRun(
        'SANKOFF',
        `Sankoff (${mode.toUpperCase()})`,
        { mode, newick: $('sankoff-newick').value, matrix: charMatrixObject(), cost_matrix: costs },
        { total_cost: r.totalCost, tables: r.tables || [] },
      );
    } catch (e) {
      showErr('sankoff-err', e.message || String(e));
    }
  };
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ties(scored, best) {
  return scored.filter((x) => x.score === best.score).length > 1;
}

/** Balanced root on the quartet edge between the two pairs; six branches, all length L. */
function newickWithUniformBranches(newickBare, len = 0.1) {
  const L = len;
  const t = String(newickBare).trim().replace(/;+$/, '');
  const m = t.match(/^\(\(([^,]+),([^)]+)\),\(([^,]+),([^)]+)\)\)\)$/);
  if (!m) return `${t};`;
  const [, a, b, c, d] = m.map((x) => String(x).trim());
  return `((${a}:${L},${b}:${L}):${L},(${c}:${L},${d}:${L}):${L});`;
}

/** Rooted three-taxon tree with four branches of equal length. */
function newickWithUniformBranches3(newickBare, len = 0.1) {
  const L = len;
  const t = String(newickBare).trim().replace(/;+$/, '');
  const m = t.match(/^\(\(([^,]+),([^)]+)\),([^)]+)\)\)$/);
  if (!m) return `${t};`;
  const [, a, b, c] = m.map((x) => String(x).trim());
  return `((${a}:${L},${b}:${L}):${L},${c}:${L});`;
}

function buildAlignmentMatrixHtml(rows, taxa, infoRows) {
  const L = rows[taxa[0]].length;
  const informativeSet = new Set(infoRows.filter((r) => r.informative).map((r) => r.site - 1));
  let h =
    '<table class="border-collapse text-center text-[13px] font-mono"><thead><tr><th class="border border-slate-200 bg-slate-100 px-2 py-1 text-left font-sans text-slate-600"></th>';
  for (let j = 0; j < L; j++) {
    const hi = informativeSet.has(j);
    h += `<th class="border border-slate-200 px-1.5 py-1 font-sans ${hi ? 'bg-sky-100 text-sky-900' : 'bg-slate-50 text-slate-600'}">${j + 1}</th>`;
  }
  h += '</tr></thead><tbody>';
  taxa.forEach((t) => {
    h += `<tr><th class="border border-slate-200 bg-slate-50 px-2 py-1 text-right font-sans font-semibold text-slate-700">${escHtml(t)}</th>`;
    for (let j = 0; j < L; j++) {
      const ch = rows[t][j];
      const hi = informativeSet.has(j);
      h += `<td class="border border-slate-200 px-1.5 py-0.5 ${hi ? 'bg-sky-50 font-semibold text-sky-950' : ''}">${escHtml(ch)}</td>`;
    }
    h += '</tr>';
  });
  h += '</tbody></table>';
  return h;
}

function wireMp() {
  if (!$('mp-run')) return;
  $('mp-run').onclick = () => {
    try {
      showErr('mp-err', '');
      const raw = $('mp-input')?.value || '';
      const { taxa, rows } = parseSequenceBlock(raw);
      validateAligned(rows, taxa);
      const mode = alphabetFromRows(rows, taxa) === 'dna' ? 'dna' : 'binary';
      const infoRows = informativeSitesTable(rows, taxa);

      if ($('mp-alignment-matrix')) $('mp-alignment-matrix').innerHTML = buildAlignmentMatrixHtml(rows, taxa, infoRows);
      $('mp-alignment-wrap')?.classList.remove('hidden');

      let tbl =
        '<table class="w-full border-collapse text-left"><thead><tr><th class="border border-slate-200 bg-slate-50 px-2 py-1">Site</th><th class="border border-slate-200 bg-slate-50 px-2 py-1">Informative?</th><th class="border border-slate-200 bg-slate-50 px-2 py-1">Reason</th></tr></thead><tbody>';
      const cap = 64;
      const slice = infoRows.length > cap ? infoRows.slice(0, cap) : infoRows;
      slice.forEach((r) => {
        tbl += `<tr><td class="border border-slate-200 px-2 py-0.5">${r.site}</td><td class="border border-slate-200 px-2 py-0.5">${r.informative ? 'Yes' : 'No'}</td><td class="border border-slate-200 px-2 py-0.5 text-slate-600">${escHtml(r.reason)}</td></tr>`;
      });
      tbl += '</tbody></table>';
      if (infoRows.length > cap) tbl += `<p class="mt-2 text-slate-500">Showing first ${cap} of ${infoRows.length} sites.</p>`;
      if ($('mp-informative-table')) $('mp-informative-table').innerHTML = tbl;
      $('mp-informative-wrap')?.classList.remove('hidden');

      if (taxa.length !== 4) {
        $('mp-triple-topo-row')?.classList.add('hidden');
        $('mp-score-wrap')?.classList.add('hidden');
        $('mp-best-wrap')?.classList.add('hidden');
        $('mp-tree-viz')?.classList.add('hidden');
        const n = $('mp-note');
        if (n) {
          n.textContent = `Quartet search runs only for exactly four taxa (you have ${taxa.length}). Alignment and site table above still apply.`;
          n.classList.remove('hidden');
        }
        setStatusBadge('MP: alignment');
        persistRun('MP', `MP sites (${taxa.length} taxa)`, { raw_sequences: raw, taxa, mode }, { informative_sites: infoRows });
        return;
      }

      const infIdx = infoRows.filter((r) => r.informative).map((r) => r.site - 1);
      const tops = fourTaxonTopologyNewicks(taxa);
      const scored = tops.map((top) => {
        const tree = JSON.parse(JSON.stringify(parseNewick(top.newick)));
        const r = runFitch(tree, rows, mode);
        const informativeTotal = infIdx.reduce((s, i) => s + (r.byCharacter[i]?.score ?? 0), 0);
        const perInformative = infIdx.map((i) => ({
          site: i + 1,
          score: r.byCharacter[i]?.score ?? 0,
        }));
        return { ...top, score: informativeTotal, detail: r, perInformative };
      });
      const best = scored.reduce((a, b) => (a.score <= b.score ? a : b));
      const byTreeId = [...scored].sort((a, b) => a.id - b.id);
      const winTopoIdx = tops.findIndex((t) => t.id === best.id);

      let scoreHtml =
        '<table class="w-full border-collapse text-left"><thead><tr><th class="border border-slate-200 bg-slate-50 px-2 py-1">Site</th><th class="border border-slate-200 bg-slate-50 px-2 py-1">Pattern</th>';
      byTreeId.forEach((row) => {
        scoreHtml += `<th class="border border-slate-200 bg-slate-50 px-2 py-1">Tree ${row.id}<br/><span class="font-mono text-[10px] font-normal text-slate-500">${escHtml(row.label)}</span></th>`;
      });
      scoreHtml += '</tr></thead><tbody>';
      infIdx.forEach((idx) => {
        const pat = taxa.map((t) => rows[t][idx]).join(' ');
        scoreHtml += `<tr><td class="border border-slate-200 px-2 py-0.5 font-semibold">${idx + 1}</td><td class="border border-slate-200 px-2 py-0.5 font-mono">${escHtml(pat)}</td>`;
        byTreeId.forEach((row) => {
          const cell = row.perInformative.find((p) => p.site === idx + 1);
          scoreHtml += `<td class="border border-slate-200 px-2 py-0.5 text-center font-mono">${cell?.score ?? ''}</td>`;
        });
        scoreHtml += '</tr>';
      });
      scoreHtml += '<tr class="bg-slate-100 font-bold"><td class="border border-slate-200 px-2 py-1" colspan="2">Total (informative sites only)</td>';
      byTreeId.forEach((row) => {
        scoreHtml += `<td class="border border-slate-200 px-2 py-1 text-center">${row.score}</td>`;
      });
      scoreHtml += '</tr></tbody></table>';
      if ($('mp-score-table')) $('mp-score-table').innerHTML = scoreHtml;
      $('mp-score-wrap')?.classList.remove('hidden');

      [0, 1, 2].forEach((k) => {
        const el = $(`mp-topo-${k}`);
        if (el) {
          el.innerHTML = '';
          renderUnrootedQuartet(`#mp-topo-${k}`, k, taxa);
        }
        const wrap = document.querySelector(`#mp-topo-${k}`)?.parentElement;
        if (wrap) wrap.classList.toggle('ring-2', k === winTopoIdx);
        if (wrap) wrap.classList.toggle('ring-emerald-500', k === winTopoIdx);
      });
      $('mp-triple-topo-row')?.classList.remove('hidden');

      const note = $('mp-note');
      if (note) {
        note.textContent =
          infIdx.length === 0
            ? 'No parsimony-informative sites: every quartet has total informative cost 0.'
            : ties(scored, best)
              ? `Trees ${scored.filter((x) => x.score === best.score).map((x) => x.id).join(', ')} tie at ${best.score} steps on informative sites.`
              : `Tree ${best.id} minimizes steps on informative sites (total = ${best.score}), matching textbook MP tables.`;
        note.classList.remove('hidden');
      }
      if ($('mp-best-newick')) $('mp-best-newick').textContent = best.newick.trim();
      if ($('mp-best-score'))
        $('mp-best-score').textContent = `Sum of Fitch steps over informative sites only = ${best.score} · ${mode.toUpperCase()} · unrooted quartet ${best.label}`;
      $('mp-best-wrap')?.classList.remove('hidden');
      const viz = $('mp-tree-viz');
      if (viz) {
        viz.classList.remove('hidden');
        viz.style.minHeight = '220px';
        viz.innerHTML = '';
        renderUnrootedQuartet('#mp-tree-viz', winTopoIdx, taxa);
      }
      setStatusBadge('MP complete');
      persistRun(
        'MP',
        `Maximum parsimony (${taxa.length} taxa)`,
        { raw_sequences: raw, taxa, mode },
        {
          best_newick: best.newick,
          informative_site_total: best.score,
          tree_scores: scored.map((s) => ({ id: s.id, informative_total: s.score, newick: s.newick })),
          informative_sites: infoRows,
        },
      );
    } catch (e) {
      showErr('mp-err', e.message || String(e));
    }
  };
}

/** Same D3 force simulation as Neighbor Joining; tuned for narrow ML candidate cards. */
const ML_FORCE_CAND_OPTS = {
  width: 200,
  height: 196,
  chargeStrength: -90,
  linkDistance: (l) => 20 + (l.len || 0) * 12,
  labelFontSize: 10,
  leafRadius: 5,
  internalRadius: 3,
};

function wireMl() {
  if (!$('ml-run')) return;
  $('ml-run').onclick = () => {
    try {
      showErr('ml-err', '');
      const raw = $('ml-input')?.value || '';
      const { taxa, rows } = parseSequenceBlock(raw);
      validateAligned(rows, taxa);
      if (alphabetFromRows(rows, taxa) !== 'dna') {
        throw new Error('Likelihood lab expects DNA (A, C, G, T) only.');
      }
      const n = taxa.length;
      if (n !== 3 && n !== 4) {
        throw new Error('Use exactly three taxa (Figure 5) or four taxa (quartet fallback).');
      }

      if (n === 3) {
        const fig = runMlFigure5(rows, taxa);
        const jc = fig.modelComparison.find((x) => x.id === 'JC69');
        const k80 = fig.modelComparison.find((x) => x.id === 'K80');
        const hky = fig.modelComparison.find((x) => x.id === 'HKY85');

        renderSubstitutionMatrixSvg($('ml-mat-jc69'), jc.pi, jc.kappa);
        if ($('ml-stat-jc69'))
          $('ml-stat-jc69').textContent = `Star log L = ${jc.logL.toFixed(2)} · AIC = ${jc.aic.toFixed(2)} · κ = 1 · π = ¼ each`;

        renderSubstitutionMatrixSvg($('ml-mat-k80'), k80.pi, k80.kappa);
        if ($('ml-stat-k80'))
          $('ml-stat-k80').textContent = `Star log L = ${k80.logL.toFixed(2)} · AIC = ${k80.aic.toFixed(2)} · κ̂ = ${k80.kappa.toFixed(3)}`;

        renderSubstitutionMatrixSvg($('ml-mat-hky'), hky.pi, hky.kappa);
        if ($('ml-stat-hky'))
          $('ml-stat-hky').textContent = `Star log L = ${hky.logL.toFixed(2)} · AIC = ${hky.aic.toFixed(2)} · κ̂ = ${hky.kappa.toFixed(3)} · π̂ from data`;

        const bm = fig.bestModel;
        $('ml-best-model-panel')?.classList.remove('hidden');
        renderSubstitutionMatrixSvg($('ml-mat-best'), bm.pi, bm.kappa);
        const piNote = bm.id === 'HKY85' ? 'empirical π from your alignment' : 'uniform π (JC69 / K80)';
        if ($('ml-best-model-text'))
          $('ml-best-model-text').innerHTML = `<strong>${escHtml(bm.label)}</strong> minimizes AIC on the three-taxon star (optimized branch lengths per model). Tree search uses that model with <strong>κ = ${bm.kappa.toFixed(4)}</strong> and ${piNote}.`;

        const tops = threeTaxonRootedNewicks(taxa);
        const newicks = tops.map((t) => t.newick);
        const scored = scoreThreeBinaryTopologies(rows, taxa, bm.pi, bm.kappa, newicks);
        const sorted = [...scored].sort((a, b) => b.logL - a.logL);
        const best = sorted[0];
        const winIdx = best.id - 1;
        const byId = [...scored].sort((a, b) => a.id - b.id);

        [0, 1, 2].forEach((i) => {
          const el = $(`ml-cand-${i}`);
          if (!el) return;
          el.innerHTML = '';
          const row = byId[i];
          if (row?.tree) {
            el.style.minHeight = '200px';
            renderForceTree(`#ml-cand-${i}`, JSON.parse(JSON.stringify(row.tree)), ML_FORCE_CAND_OPTS);
          }
          el.classList.toggle('ring-2', i === winIdx);
          el.classList.toggle('ring-emerald-600', i === winIdx);
        });

        let st =
          '<table class="w-full border-collapse text-left"><thead><tr><th class="border border-slate-200 bg-slate-50 px-2 py-1">Tree</th><th class="border border-slate-200 bg-slate-50 px-2 py-1">Topology</th><th class="border border-slate-200 bg-slate-50 px-2 py-1">Log L (optimized)</th></tr></thead><tbody>';
        sorted.forEach((row) => {
          const top = tops.find((t) => t.id === row.id);
          st += `<tr><td class="border border-slate-200 px-2 py-0.5">${row.id}</td><td class="border border-slate-200 px-2 py-0.5 font-mono text-[12px]">${escHtml(top?.label || '')}</td><td class="border border-slate-200 px-2 py-0.5 font-mono">${row.logL.toFixed(4)}</td></tr>`;
        });
        st += '</tbody></table>';
        if ($('ml-score-table')) $('ml-score-table').innerHTML = st;
        $('ml-score-wrap')?.classList.remove('hidden');
        const note = $('ml-note');
        if (note) {
          note.textContent = `Branch lengths re-optimized per topology with Nelder–Mead under ${bm.label}. Orange = transition rates, blue = transversion rates in the Q-matrix plots.`;
          note.classList.remove('hidden');
        }
        const topMeta = tops.find((t) => t.id === best.id);
        if ($('ml-best-newick')) $('ml-best-newick').textContent = topMeta?.newick?.trim() || '';
        if ($('ml-best-ll'))
          $('ml-best-ll').textContent = `Best log L = ${best.logL.toFixed(6)} · model = ${bm.label} · topology ${best.id}`;
        $('ml-best-wrap')?.classList.remove('hidden');
        const viz = $('ml-tree-viz');
        if (viz) {
          viz.classList.remove('hidden');
          viz.style.minHeight = '420px';
          viz.innerHTML = '';
          renderForceTree('#ml-tree-viz', JSON.parse(JSON.stringify(best.tree)));
        }
        setStatusBadge('ML complete');
        persistRun(
          'ML',
          `ML ${bm.label} (${n} taxa)`,
          { raw_sequences: raw, taxa, best_model: bm.id },
          {
            model_comparison: fig.modelComparison.map((c) => ({
              id: c.id,
              logL: c.logL,
              aic: c.aic,
              kappa: c.kappa,
            })),
            best_topology_logL: best.logL,
            tree_scores: scored.map((s) => ({ id: s.id, log_likelihood: s.logL })),
          },
        );
        return;
      }

      const bl = 0.1;
      const tops = fourTaxonTopologyNewicks(taxa);
      const scored = tops.map((top) => {
        const nw = newickWithUniformBranches(top.newick, bl);
        const tree = JSON.parse(JSON.stringify(parseNewick(nw)));
        const logL = logLikelihoodJC69(tree, rows, taxa);
        return { ...top, newickScored: nw, logL };
      });
      scored.sort((a, b) => b.logL - a.logL);
      const best = scored[0];
      const winIdx = best.id - 1;
      const byId = [...scored].sort((a, b) => a.id - b.id);

      $('ml-best-model-panel')?.classList.add('hidden');

      [0, 1, 2].forEach((i) => {
        const el = $(`ml-cand-${i}`);
        if (!el) return;
        el.innerHTML = '';
        const nw = byId[i]?.newickScored;
        if (nw) {
          el.style.minHeight = '200px';
          renderForceTree(`#ml-cand-${i}`, JSON.parse(JSON.stringify(parseNewick(nw))), ML_FORCE_CAND_OPTS);
        }
        el.classList.toggle('ring-2', i === winIdx);
        el.classList.toggle('ring-emerald-600', i === winIdx);
      });

      let st =
        '<table class="w-full border-collapse text-left"><thead><tr><th class="border border-slate-200 bg-slate-50 px-2 py-1">Tree</th><th class="border border-slate-200 bg-slate-50 px-2 py-1">Topology</th><th class="border border-slate-200 bg-slate-50 px-2 py-1">Log L (JC69, fixed 0.1)</th></tr></thead><tbody>';
      scored.forEach((row) => {
        st += `<tr><td class="border border-slate-200 px-2 py-0.5">${row.id}</td><td class="border border-slate-200 px-2 py-0.5 font-mono text-[12px]">${escHtml(row.label)}</td><td class="border border-slate-200 px-2 py-0.5 font-mono">${row.logL.toFixed(4)}</td></tr>`;
      });
      st += '</tbody></table>';
      if ($('ml-score-table')) $('ml-score-table').innerHTML = st;
      $('ml-score-wrap')?.classList.remove('hidden');
      const note = $('ml-note');
      if (note) {
        note.textContent =
          'Four-taxon mode: JC69 only, equal branch lengths 0.1 (no star model test). Use three taxa for the full Figure 5 pipeline.';
        note.classList.remove('hidden');
      }
      if ($('ml-best-newick')) $('ml-best-newick').textContent = best.newickScored.trim();
      if ($('ml-best-ll')) $('ml-best-ll').textContent = `Best log L = ${best.logL.toFixed(6)} (JC69 quartet)`;
      $('ml-best-wrap')?.classList.remove('hidden');
      const viz = $('ml-tree-viz');
      if (viz) {
        viz.classList.remove('hidden');
        viz.style.minHeight = '420px';
        viz.innerHTML = '';
        renderForceTree('#ml-tree-viz', JSON.parse(JSON.stringify(parseNewick(best.newickScored))));
      }
      setStatusBadge('ML quartet');
      persistRun(
        'ML',
        `ML JC69 quartet (${n} taxa)`,
        { raw_sequences: raw, taxa },
        {
          best_newick: best.newickScored,
          log_likelihood: best.logL,
          tree_scores: scored.map((s) => ({ id: s.id, log_likelihood: s.logL, newick: s.newickScored })),
        },
      );
    } catch (e) {
      showErr('ml-err', e.message || String(e));
    }
  };
}

function wirePp() {
  if (!$('pp-run')) return;
  $('pp-same-char').onclick = () => mountCharGrid('pp-char-grid');
  $('pp-example').onclick = () => {
    uploadCharactersFromFile().catch((e) => showErr('pp-err', e.message || String(e)));
  };
  $('pp-run').onclick = () => {
    try {
      showErr('pp-err', '');
      state.charMode = 'binary';
      prepareCharacterRun();
      const err = validateChars('binary');
      if (err) throw new Error(err);
      const r = checkPerfectPhylogeny(charMatrixObject(), state.charTaxa);
      setStatusBadge('Perfect phylogeny complete');
      $('pp-banner')?.classList.remove('hidden');
      $('pp-heatmap')?.classList.remove('hidden');
      $('pp-bad-pairs')?.classList.remove('hidden');
      $('pp-banner').innerHTML = r.perfect
        ? '<div class="rounded-lg bg-emerald-100 px-4 py-3 font-semibold text-emerald-900">Perfect phylogeny EXISTS</div>'
        : '<div class="rounded-lg bg-amber-100 px-4 py-3 font-semibold text-amber-900">Perfect phylogeny does NOT exist.</div>';
      const L = state.charRows[state.charTaxa[0]].length;
      let heat = '<table class="mx-auto border-collapse text-center text-[12px]"><thead><tr><th class="border border-slate-200 bg-slate-50 px-1"></th>';
      for (let b = 0; b < L; b++) heat += `<th class="border border-slate-200 bg-slate-50 px-1">${b + 1}</th>`;
      heat += '</tr></thead><tbody>';
      for (let a = 0; a < L; a++) {
        heat += `<tr><th class="border border-slate-200 bg-slate-50 px-1">${a + 1}</th>`;
        for (let b = 0; b < L; b++) {
          const cell = r.pairs.find((p) => (p.c1 === a && p.c2 === b) || (p.c1 === b && p.c2 === a));
          const ok = a === b || (cell && cell.pass);
          heat += `<td class="border border-slate-200 px-1 py-0.5 ${ok ? 'bg-emerald-200' : 'bg-red-200'}">${a === b ? '' : ok ? '✓' : '✗'}</td>`;
        }
        heat += '</tr>';
      }
      heat += '</tbody></table>';
      $('pp-heatmap').innerHTML = `<p class="mb-2 text-[15px]">${r.summary}</p>${heat}`;
      const bad = r.pairs.filter((p) => !p.pass);
      $('pp-bad-pairs').innerHTML =
        bad.length === 0
          ? ''
          : '<p class="font-semibold">Incompatible pairs</p><ul class="list-disc pl-5">' +
            bad.map((p) => `<li>Characters ${p.c1 + 1} and ${p.c2 + 1} — gametes: ${p.gametes.join(', ')}</li>`).join('') +
            '</ul>';
      persistRun(
        'PERFECT_PHYLOGENY',
        'Perfect phylogeny',
        { matrix: charMatrixObject() },
        { perfect: r.perfect, summary: r.summary, pairs: r.pairs || [] },
      );
    } catch (e) {
      showErr('pp-err', e.message || String(e));
    }
  };
}

function init() {
  loadDistExample();
  loadCharExample();
  updateMatrixTitles();
  mountCostEditor('binary');
  wireUpgma();
  wireNj();
  wireFp();
  wireHc();
  wireFitch();
  wireSankoff();
  wirePp();
  wireMp();
  wireMl();
  $('algo-run')?.addEventListener('click', runCurrentAlgorithm);
  $('algo-reset')?.addEventListener('click', resetCurrentAlgorithm);
  const applySectionFromHash = () => {
    const raw = (window.location.hash || '').replace('#', '');
    const id = raw.startsWith('sec-') ? raw : raw ? `sec-${raw}` : 'sec-upgma';
    showOnlySection(id);
  };
  applySectionFromHash();
  hydrateSavedRunFromQuery();
  window.addEventListener('hashchange', applySectionFromHash);
}

init();
