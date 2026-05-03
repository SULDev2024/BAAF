/**
 * Force layout for NJ / FM / ML style trees (D3 v7).
 * @param {string} containerSelector
 * @param {{ name: string, isLeaf: boolean, branchLength?: number, children?: any[] }} tree
 * @param {{
 *   width?: number,
 *   height?: number,
 *   background?: string,
 *   chargeStrength?: number,
 *   linkStrength?: number,
 *   linkDistance?: (l: { len: number }) => number,
 *   labelFontSize?: number,
 *   leafRadius?: number,
 *   internalRadius?: number,
 *   character?: boolean,
 * }=} opts
 */
export function renderForceTree(containerSelector, tree, opts = {}) {
  const d3 = window.d3;
  const el = document.querySelector(containerSelector);
  if (!el || !d3 || !tree) return;
  el.innerHTML = '';
  const defaultW = Math.max(el.clientWidth || 640, 400);
  const W = opts.width != null ? opts.width : defaultW;
  const H = opts.height != null ? opts.height : 420;
  const linkDist =
    typeof opts.linkDistance === 'function' ? opts.linkDistance : (l) => 36 + (l.len || 0) * 10;
  const charge = opts.chargeStrength != null ? opts.chargeStrength : -160;
  const linkStrength = opts.linkStrength != null ? opts.linkStrength : 0.9;
  const bg = opts.background != null ? opts.background : '#0b1220';
  const fontSize = opts.labelFontSize != null ? opts.labelFontSize : 12;
  const leafR = opts.leafRadius != null ? opts.leafRadius : 6;
  const internalR = opts.internalRadius != null ? opts.internalRadius : 4;

  const nodes = [];
  const links = [];
  function walk(v, parentNode = null) {
    const n = { name: v.name, isLeaf: !!v.isLeaf };
    nodes.push(n);
    if (parentNode) links.push({ source: parentNode, target: n, len: v.branchLength || 0 });
    (v.children || []).forEach((c) => walk(c, n));
  }
  walk(tree);

  const sim = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3.forceLink(links).distance(linkDist).strength(linkStrength),
    )
    .force('charge', d3.forceManyBody().strength(charge))
    .force('center', d3.forceCenter(W / 2, H / 2));

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('background', bg);
  const rootG = svg.append('g');

  const link = rootG
    .append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', '#64748b')
    .attr('stroke-width', 2);

  const node = rootG
    .append('g')
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', (d) => (d.isLeaf ? leafR : internalR))
    .attr('fill', (d) => (d.isLeaf ? (opts.character ? '#2dd4bf' : '#3b82f6') : 'none'))
    .attr('stroke', (d) => (d.isLeaf ? 'none' : '#94a3b8'));

  const lbl = rootG
    .append('g')
    .selectAll('text')
    .data(nodes.filter((d) => d.isLeaf))
    .join('text')
    .attr('font-size', fontSize)
    .attr('fill', '#e2e8f0')
    .text((d) => d.name);

  sim.on('tick', () => {
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);
    node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    lbl.attr('x', (d) => d.x + 8).attr('y', (d) => d.y + 4);
  });

  svg.call(
    d3.zoom().on('zoom', (ev) => {
      rootG.attr('transform', ev.transform);
    }),
  );
}

/**
 * Unrooted quartet (Figure 4 style): terminal branches blue, internal quartet edge gold.
 * topologyId 0: ((0,1),(2,3)), 1: ((0,2),(1,3)), 2: ((0,3),(1,2)) — taxa ordered [t0,t1,t2,t3].
 */
export function renderUnrootedQuartet(containerSelector, topologyId, taxa, opts = {}) {
  const d3 = window.d3;
  const el = document.querySelector(containerSelector);
  if (!el || !d3 || !Array.isArray(taxa) || taxa.length !== 4) return;
  el.innerHTML = '';
  const W = Math.max(el.clientWidth || 360, 280);
  const H = 200;
  const blue = opts.terminalStroke || '#2563eb';
  const gold = opts.internalStroke || '#ca8a04';

  const [t0, t1, t2, t3] = taxa.map(String);
  /** I1 left, I2 right; each [x,y] for two leaves [upper, lower] */
  const layouts = [
    {
      i1: [100, 100],
      i2: [220, 100],
      l1: [
        [40, 55, t0],
        [40, 145, t1],
      ],
      l2: [
        [280, 55, t2],
        [280, 145, t3],
      ],
    },
    {
      i1: [100, 100],
      i2: [220, 100],
      l1: [
        [40, 55, t0],
        [40, 145, t2],
      ],
      l2: [
        [280, 55, t1],
        [280, 145, t3],
      ],
    },
    {
      i1: [100, 100],
      i2: [220, 100],
      l1: [
        [40, 55, t0],
        [40, 145, t3],
      ],
      l2: [
        [280, 55, t1],
        [280, 145, t2],
      ],
    },
  ];
  const geo = layouts[topologyId % 3];
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('background', '#f8fafc');

  const g = svg.append('g').attr('transform', `translate(${(W - 320) / 2},0)`);

  function line(x1, y1, x2, y2, stroke, sw = 3) {
    g.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2).attr('stroke', stroke).attr('stroke-width', sw).attr('stroke-linecap', 'round');
  }

  const [ix1, iy1] = geo.i1;
  const [ix2, iy2] = geo.i2;
  geo.l1.forEach(([lx, ly]) => line(lx, ly, ix1, iy1, blue, 3.5));
  geo.l2.forEach(([lx, ly]) => line(lx, ly, ix2, iy2, blue, 3.5));
  line(ix1, iy1, ix2, iy2, gold, 4);

  [...geo.l1, ...geo.l2].forEach(([lx, ly, name]) => {
    g.append('text')
      .attr('x', lx + (lx < ix1 ? -6 : 6))
      .attr('y', ly + 4)
      .attr('text-anchor', lx < ix1 ? 'end' : 'start')
      .attr('font-size', 14)
      .attr('font-weight', 700)
      .attr('fill', '#0f172a')
      .text(name);
  });
}

/** Top-down rooted tree (Fitch / Sankoff / NNI / perfect phylogeny). */
export function renderRootedTree(containerSelector, tree, opts = {}) {
  const d3 = window.d3;
  const el = document.querySelector(containerSelector);
  if (!el || !d3) return;
  el.innerHTML = '';
  const W = Math.max(el.clientWidth || 640, 400);
  const H = Math.max(360, (countLeaves(tree) + 1) * 28);
  const margin = { top: 24, right: 24, bottom: 24, left: 24 };

  const data = toHierarchy(tree);
  const root = d3.hierarchy(data, (d) => d.children);
  const layout = d3.tree().size([H - margin.top - margin.bottom, W - margin.left - margin.right]);
  layout(root);

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('background', '#fafafa');
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  g.selectAll('path.link')
    .data(root.links())
    .join('path')
    .attr('fill', 'none')
    .attr('stroke', (d) => (opts.edgeClass && opts.edgeClass(d) ? '#ef4444' : '#94a3b8'))
    .attr('stroke-dasharray', (d) => (opts.edgeClass && opts.edgeClass(d) ? '6 4' : 'none'))
    .attr('stroke-width', 2)
    .attr('d', d3.linkHorizontal().x((d) => d.y).y((d) => d.x));

  const nodeG = g
    .selectAll('g.node')
    .data(root.descendants())
    .join('g')
    .attr('transform', (d) => `translate(${d.y},${d.x})`);

  nodeG
    .append('circle')
    .attr('r', (d) => (d.data.isLeaf ? 6 : 4))
    .attr('fill', (d) => opts.nodeFill?.(d) || (d.data.isLeaf ? '#14b8a6' : '#cbd5e1'))
    .attr('stroke', '#475569')
    .attr('stroke-width', 1);

  nodeG
    .append('text')
    .attr('dx', (d) => (d.data.isLeaf ? 10 : -10))
    .attr('dy', 4)
    .attr('text-anchor', (d) => (d.data.isLeaf ? 'start' : 'end'))
    .attr('font-size', 11)
    .attr('fill', '#0f172a')
    .text((d) => {
      if (d.data.isLeaf) return d.data.name;
      return opts.internalLabel?.(d) ?? '';
    });

  svg.call(d3.zoom().on('zoom', (ev) => g.attr('transform', `translate(${margin.left + ev.transform.x},${margin.top + ev.transform.y}) scale(${ev.transform.k})`)));
}

/** Sankoff-specific tree with per-node cost-vector boxes. */
export function renderSankoffTree(containerSelector, tree, states = ['A', 'C', 'G', 'T']) {
  const d3 = window.d3;
  const el = document.querySelector(containerSelector);
  if (!el || !d3 || !tree) return;
  el.innerHTML = '';

  const W = Math.max(el.clientWidth || 700, 520);
  const H = Math.max(380, (countLeaves(tree) + 1) * 64);
  const margin = { top: 30, right: 24, bottom: 36, left: 24 };

  const root = d3.hierarchy(tree, (d) => d.children);
  const layout = d3.tree().size([H - margin.top - margin.bottom, W - margin.left - margin.right]);
  layout(root);

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('background', '#ffffff');
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  g.selectAll('path.sankoff-link')
    .data(root.links())
    .join('path')
    .attr('class', 'sankoff-link')
    .attr('fill', 'none')
    .attr('stroke', '#111827')
    .attr('stroke-width', 2)
    .attr('d', (d) => {
      const sx = d.source.y;
      const sy = d.source.x;
      const tx = d.target.y;
      const ty = d.target.x;
      return `M ${sx},${sy} L ${tx},${ty}`;
    });

  const nodes = g
    .selectAll('g.sankoff-node')
    .data(root.descendants())
    .join('g')
    .attr('class', 'sankoff-node')
    .attr('transform', (d) => `translate(${d.y},${d.x})`);

  nodes
    .append('circle')
    .attr('r', 4.5)
    .attr('fill', '#ffffff')
    .attr('stroke', '#111827')
    .attr('stroke-width', 1.2);

  nodes
    .append('text')
    .attr('dx', (d) => (d.data.isLeaf ? 0 : 0))
    .attr('dy', 20)
    .attr('text-anchor', 'middle')
    .attr('font-size', 12)
    .attr('fill', '#111827')
    .text((d) => (d.data.isLeaf ? d.data.name : ''));

  // state labels above vectors for readability
  const cellW = 18;
  const cellH = 18;
  const rowW = states.length * cellW;

  nodes.each(function (d) {
    const n = d3.select(this);
    const yOff = -30;
    const xOff = -rowW / 2;
    const vec = d.data.costVector || {};

    n.selectAll('text.state-header')
      .data(states)
      .join('text')
      .attr('class', 'state-header')
      .attr('x', (_, i) => xOff + i * cellW + cellW / 2)
      .attr('y', yOff - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#111827')
      .text((s) => String(s).toLowerCase());

    n.selectAll('rect.cost-cell')
      .data(states)
      .join('rect')
      .attr('class', 'cost-cell')
      .attr('x', (_, i) => xOff + i * cellW)
      .attr('y', yOff)
      .attr('width', cellW)
      .attr('height', cellH)
      .attr('fill', '#ffffff')
      .attr('stroke', '#374151')
      .attr('stroke-width', 1);

    n.selectAll('text.cost-text')
      .data(states)
      .join('text')
      .attr('class', 'cost-text')
      .attr('x', (_, i) => xOff + i * cellW + cellW / 2)
      .attr('y', yOff + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', '#111827')
      .text((s) => {
        const v = vec[s];
        if (v === undefined) return '';
        if (!Number.isFinite(v) || v >= 1e10) return '∞';
        return String(Math.round(v));
      });
  });
}

function countLeaves(v) {
  if (!v.children || !v.children.length) return 1;
  return v.children.reduce((s, c) => s + countLeaves(c), 0);
}

export function toHierarchy(node) {
  if (node.isLeaf) return { name: node.name, isLeaf: true };
  return {
    name: node.name || '',
    isLeaf: false,
    children: (node.children || []).map(toHierarchy),
  };
}
