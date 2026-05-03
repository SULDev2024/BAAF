import * as d3 from 'd3';
import { BioTreeNode } from '../types';

export function renderTree(
  container: HTMLElement, 
  tree: BioTreeNode, 
  options: { 
    isUnrooted?: boolean, 
    showBranchLengths?: boolean,
    nodeColor?: string
  } = {}
) {
  const { isUnrooted = false, showBranchLengths = true, nodeColor = '#3b82f6' } = options;
  
  d3.select(container).selectAll('*').remove();
  
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const g = svg.append('g');

  svg.call(d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
    g.attr('transform', event.transform);
  }));

  if (isUnrooted) {
    renderUnrooted(g, tree, width, height, nodeColor, showBranchLengths);
  } else {
    renderRooted(g, tree, width, height, nodeColor, showBranchLengths);
  }
}

function renderRooted(g: d3.Selection<SVGGElement, unknown, null, undefined>, tree: BioTreeNode, width: number, height: number, color: string, showLen: boolean) {
  const root = d3.hierarchy(tree);
  const treeLayout = d3.tree<BioTreeNode>().size([width - 100, height - 100]);
  treeLayout(root);

  const links = g.selectAll('.link')
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 2)
    .attr('d', d3.linkVertical<d3.HierarchyLink<BioTreeNode>, d3.HierarchyPointNode<BioTreeNode>>()
        .x(d => d.x + 50)
        .y(d => d.y + 50)
    );

  const nodes = g.selectAll('.node')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x + 50},${d.y + 50})`);

  nodes.append('circle')
    .attr('r', d => d.data.isLeaf ? 6 : 4)
    .attr('fill', d => d.data.isLeaf ? color : '#64748b');

  nodes.append('text')
    .attr('dy', '.35em')
    .attr('x', d => d.data.isLeaf ? 10 : -10)
    .style('text-anchor', d => d.data.isLeaf ? 'start' : 'end')
    .text(d => d.data.isLeaf ? d.data.name : '')
    .attr('class', 'text-xs font-medium fill-slate-700');

  if (showLen) {
    g.selectAll('.branch-label')
      .data(root.links())
      .enter()
      .append('text')
      .attr('x', d => (d.source.x + d.target.x) / 2 + 55)
      .attr('y', d => (d.source.y + d.target.y) / 2 + 50)
      .text(d => d.target.data.branchLength.toFixed(2))
      .attr('class', 'text-[10px] fill-slate-400');
  }
}

function renderUnrooted(g: d3.Selection<SVGGElement, unknown, null, undefined>, tree: BioTreeNode, width: number, height: number, color: string, showLen: boolean) {
  const nodes: any[] = [];
  const links: any[] = [];

  function flatten(node: BioTreeNode, parent?: any) {
    const n = { id: node.name, data: node };
    nodes.push(n);
    if (parent) {
      links.push({ source: parent.id, target: n.id, length: node.branchLength });
    }
    node.children.forEach(c => flatten(c, n));
  }
  flatten(tree);

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d: any) => d.id).distance((d: any) => d.length * 50 || 100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2));

  const link = g.selectAll('.link')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', '#94a3b8')
    .attr('stroke-width', 2);

  const node = g.selectAll('.node')
    .data(nodes)
    .enter()
    .append('g');

  node.append('circle')
    .attr('r', d => d.data.isLeaf ? 6 : 4)
    .attr('fill', d => d.data.isLeaf ? color : '#64748b');

  node.append('text')
    .attr('dy', '.35em')
    .attr('x', 10)
    .text(d => d.data.isLeaf ? d.data.name : '')
    .attr('class', 'text-xs font-medium fill-slate-700');

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}
