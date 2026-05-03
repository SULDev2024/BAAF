import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface TreeData {
  name: string;
  children?: TreeData[];
}

export const PhyloTree: React.FC<{ data: TreeData }> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 500;
    const margin = { top: 20, right: 120, bottom: 30, left: 60 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const tree = d3.tree<TreeData>().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    const root = d3.hierarchy(data);
    tree(root);

    // Links
    g.selectAll(".link")
      .data(root.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#cbd5e1") // slate-300
      .attr("stroke-width", 2)
      .attr("d", d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any);

    // Nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter().append("g")
      .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
      .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
      .attr("r", 5)
      .attr("fill", d => d.children ? "#f1f5f9" : "#3b82f6") // slate-100 or blue-500
      .attr("stroke", d => d.children ? "#cbd5e1" : "#2563eb") // slate-300 or blue-600
      .attr("stroke-width", 1.5);

    node.append("text")
      .attr("dy", ".35em")
      .attr("x", d => d.children ? -12 : 12)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("font-family", "Inter, sans-serif")
      .style("fill", "#334155") // slate-700
      .text(d => d.data.name);

  }, [data]);

  return (
    <div ref={containerRef} className="minimal-card flex-1 relative flex items-center justify-center p-8 bg-white min-h-[500px]">
      <svg ref={svgRef} width="100%" height="500" className="mx-auto"></svg>
      <div className="absolute bottom-4 left-4 flex gap-4 text-[11px] text-slate-400 font-mono">
        <span>Scale: 0.05</span>
        <span>Bootstraps: 1000</span>
      </div>
    </div>
  );
};

