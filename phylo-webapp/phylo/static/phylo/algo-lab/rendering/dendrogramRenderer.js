/** Rectangular dendrogram (cladogram-like) with merge heights. */
export function renderDendrogram(containerSelector, tree) {
  const d3 = window.d3;
  const el = document.querySelector(containerSelector);
  if (!el || !d3) return;
  el.innerHTML = '';
  const W = Math.max(el.clientWidth || 760, 520);
  const H = Math.max(el.clientHeight || 420, 340);
  const margin = { top: 20, right: 22, bottom: 40, left: 46 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const leaves = [];
  collectLeaves(tree, leaves);
  if (!leaves.length) return;
  const maxH = Math.max(nodeHeight(tree), 1);
  const x = d3.scalePoint().domain(leaves).range([0, innerW]).padding(0.5);
  const y = d3.scaleLinear().domain([0, maxH]).range([innerH, 0]).nice();

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Left axis for merge heights
  g.append('g')
    .call(d3.axisLeft(y).ticks(8).tickSizeOuter(0))
    .call((axis) => axis.selectAll('text').attr('fill', '#475569').style('font-size', '12px'))
    .call((axis) => axis.selectAll('line').attr('stroke', '#1f2937').attr('stroke-width', 1))
    .call((axis) => axis.select('.domain').attr('stroke', '#1f2937').attr('stroke-width', 1));

  const segments = [];
  const mergeDots = [];
  const leafDots = [];
  const labels = [];
  layoutSegments(tree, x, y, segments, mergeDots, leafDots, labels);

  g.selectAll('line.dendrogram-segment')
    .data(segments)
    .join('line')
    .attr('class', 'dendrogram-segment')
    .attr('x1', (d) => d.x1)
    .attr('y1', (d) => d.y1)
    .attr('x2', (d) => d.x2)
    .attr('y2', (d) => d.y2)
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 3)
    .attr('stroke-linecap', 'round');

  g.selectAll('circle.merge-dot')
    .data(mergeDots)
    .join('circle')
    .attr('class', 'merge-dot')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', 4)
    .attr('fill', '#94a3b8');

  g.selectAll('circle.leaf-dot')
    .data(leafDots)
    .join('circle')
    .attr('class', 'leaf-dot')
    .attr('cx', (d) => d.x)
    .attr('cy', (d) => d.y)
    .attr('r', 5)
    .attr('fill', '#3b82f6');

  g.selectAll('text.leaf-label')
    .data(labels)
    .join('text')
    .attr('class', 'leaf-label')
    .attr('x', (d) => d.x)
    .attr('y', innerH + 24)
    .attr('text-anchor', 'middle')
    .attr('fill', '#1f2937')
    .style('font-size', '12px')
    .style('font-weight', 700)
    .text((d) => d.label);
}

function nodeHeight(node) {
  if (!node || node.isLeaf) return 0;
  return Number.isFinite(node.mergeHeight) ? node.mergeHeight : 0;
}

function collectLeaves(node, out) {
  if (!node) return;
  if (node.isLeaf) {
    out.push(node.name);
    return;
  }
  (node.children || []).forEach((c) => collectLeaves(c, out));
}

function nodeX(node, xScale) {
  if (node.isLeaf) return xScale(node.name);
  const xs = (node.children || []).map((c) => nodeX(c, xScale));
  return d3Mean(xs);
}

function d3Mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function layoutSegments(node, xScale, yScale, segments, mergeDots, leafDots, labels) {
  if (!node) return;
  if (node.isLeaf) {
    const x = xScale(node.name);
    const y = yScale(0);
    leafDots.push({ x, y });
    labels.push({ x, label: node.name });
    return;
  }

  const h = nodeHeight(node);
  const yParent = yScale(h);
  const children = node.children || [];
  const xs = children.map((c) => nodeX(c, xScale));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  segments.push({ x1: xMin, y1: yParent, x2: xMax, y2: yParent });
  mergeDots.push({ x: d3Mean(xs), y: yParent });

  children.forEach((child) => {
    const xChild = nodeX(child, xScale);
    const yChild = yScale(nodeHeight(child));
    segments.push({ x1: xChild, y1: yChild, x2: xChild, y2: yParent });
    layoutSegments(child, xScale, yScale, segments, mergeDots, leafDots, labels);
  });
}
