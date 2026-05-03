import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  RefreshCw, 
  ArrowUpRight, 
  Download, 
  Filter,
  BrainCircuit,
  Terminal,
  Cpu
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { PhyloTree } from './components/PhyloTree';
import { StatsGrid, ConvergenceChart } from './components/StatsGrid';
import { getTreeAnalysis } from './lib/gemini';

// Sample Phylogenetic Tree Data
const INITIAL_TREE = {
  name: "LUCA (Last Universal Common Ancestor)",
  children: [
    {
      name: "Archaea",
      children: [
        { name: "Euryarchaeota" },
        { name: "TACK Group" }
      ]
    },
    {
      name: "Bacteria",
      children: [
        { name: "Proteobacteria" },
        { name: "Firmicutes" },
        { name: "Cyanobacteria" }
      ]
    },
    {
      name: "Eukaryota",
      children: [
        {
          name: "Amorphea",
          children: [
            { name: "Metazoa (Animals)" },
            { name: "Fungi" }
          ]
        },
        {
          name: "Archaeplastida",
          children: [
            { name: "Viridiplantae" },
            { name: "Rhodophyta" }
          ]
        }
      ]
    }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('construct');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await getTreeAnalysis(JSON.stringify(INITIAL_TREE));
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    // Initial analysis on load
    runAnalysis();
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">Sequence Lineage Reconstruction</h1>
            <span className="minimal-badge">Analysis Complete</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="minimal-button-secondary">Export Newick</button>
            <button 
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="minimal-button-primary flex items-center gap-2"
            >
              {isAnalyzing && <RefreshCw className="w-4 h-4 animate-spin" />}
              Run Analysis
            </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="p-8 flex-1 flex flex-col overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl w-full mx-auto"
            >
              {/* Stats & Charts Grid */}
              <StatsGrid />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                {/* Primary Visualization Area */}
                <section className="lg:col-span-8 flex flex-col gap-6">
                  <div className="minimal-card flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-500">Cladogram View</span>
                      <div className="flex gap-2">
                        <button className="p-1 text-slate-400 hover:text-slate-600">⟳</button>
                        <button className="p-1 text-slate-400 hover:text-slate-600">⋮</button>
                      </div>
                    </div>
                    <PhyloTree data={INITIAL_TREE} />
                  </div>
                  
                  <ConvergenceChart />
                </section>

                {/* Side Panel Analytics */}
                <section className="lg:col-span-4 space-y-6">
                  {/* AI Insights Card */}
                  <div className="minimal-card p-6 bg-white group relative overflow-hidden">
                    <h3 className="text-sm font-semibold mb-4 text-slate-400 uppercase tracking-tight italic">AI Evolutionary Insights</h3>
                    
                    <div className="space-y-4">
                      {isAnalyzing ? (
                        <div className="space-y-3 animate-pulse">
                          <div className="h-4 bg-slate-100 rounded w-full" />
                          <div className="h-4 bg-slate-100 rounded w-3/4" />
                          <div className="h-4 bg-slate-100 rounded w-5/6" />
                        </div>
                      ) : (
                        <p className="text-sm font-medium leading-relaxed text-slate-600">
                          {analysis || "Select a clade to begin mapping."}
                        </p>
                      )}
                      
                      <button className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-all uppercase tracking-widest mt-4">
                        Details <ArrowUpRight className="w-3 h-3 text-blue-600" />
                      </button>
                    </div>
                  </div>

                  {/* System Health Card (Dark) */}
                  <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg border border-slate-800">
                    <h3 className="text-sm font-semibold mb-6 text-slate-400 italic font-sans">System Health</h3>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-300">CPU Visualization Engine</span>
                          <span className="text-xs font-mono text-blue-400 font-bold">42%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-400 h-full rounded-full transition-all duration-500" style={{ width: '42%' }}></div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-300">Active RAM Allocation</span>
                          <span className="text-xs font-mono text-emerald-400 font-bold">8.2GB</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-[10px] leading-relaxed text-slate-400 font-mono">
                      Likelihood score reached stable convergence after 420 iterations. Variance within 0.0001 threshold.
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}


