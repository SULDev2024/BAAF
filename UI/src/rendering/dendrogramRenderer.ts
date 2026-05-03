import * as d3 from 'd3';
import { BioTreeNode } from '../types';

export function renderDendrogram(
  container: HTMLElement, 
  tree: BioTreeNode, 
  options: { 
    showAxis?: boolean,
    color?: string
  } = {}
) {
  const { showAxis = true, color = '#3b82f6' } = options;
  d3.select(container).selectAll('*').remove();

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 500;
  const padding = 60;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const g = svg.append('g').attr('transform', `translate(${padding}, ${padding / 2})`);

  const root = d3.hierarchy(tree);
  const n = root.leaves().length;
  
  const xPerLeaf = (width - 2 * padding) / (n - 1 || 1);
  const leafMap = new Map<string, number>();
  root.leaves().forEach((leaf, i) => {
    leafMap.set(leaf.data.name, i * xPerLeaf);
  });

  const maxHeight = tree.mergeHeight || 0;
  const yScale = d3.scaleLinear()
    .domain([0, maxHeight])
    .range([height - padding, 0]);

  if (showAxis) {
    const yAxis = d3.axisLeft(yScale);
    g.append('g').call(yAxis);
  }

  function drawNode(node: d3.HierarchyNode<BioTreeNode>): number {
    const h = node.data.mergeHeight || 0;
    const y = yScale(h);
    let x: number;

    if (node.children) {
      const childX = node.children.map(drawNode);
      x = (childX[0] + childX[1]) / 2;

      g.append('line')
        .attr('x1', childX[0])
        .attr('x2', childX[1])
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 2);

      node.children.forEach((child, i) => {
        g.append('line')
            .attr('x1', childX[i])
            .attr('x2', childX[i])
            .attr('y1', y)
            .attr('y2', yScale(child.data.mergeHeight || 0))
            .attr('stroke', '#94a3b8')
            .attr('stroke-width', 2);
      });
    } else {
      x = leafMap.get(node.data.name)!;
      g.append('text')
        .attr('x', x)
        .attr('y', yScale(0) + 20)
        .attr('text-anchor', 'middle')
        .text(node.data.name)
        .attr('class', 'text-xs font-bold fill-slate-700');
    }

    if (!node.children) {
        g.append('circle')
            .attr('cx', x)
            .attr('cy', yScale(0))
            .attr('r', 4)
            .attr('fill', color);
    } else {
        g.append('circle')
            .attr('cx', x)
            .attr('cy', y)
            .attr('r', 3)
            .attr('fill', '#94a3b8');
    }

    return x;
  }

  drawNode(root);
}
