import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Brain, TestTube, TableProperties, Network, GitGraph, Search, Binary, Menu, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DistanceMatrix, CharacterMatrix, BioTreeNode } from './types';
import { MatrixInput } from './components/MatrixInput';
import { runUPGMA } from './algorithms/upgma';
import { runNJ } from './algorithms/neighborJoining';
import { runHierarchical, LinkageMethod } from './algorithms/hierarchical';
import { checkFourPoint } from './algorithms/fourPoint';
import { runFitch } from './algorithms/fitch';
import { renderTree } from './rendering/treeRenderer';
import { renderDendrogram } from './rendering/dendrogramRenderer';
import { validateMatrix } from './utils/matrixUtils';

const SAMPLE_MATRIX: DistanceMatrix = {
    taxa: ['A', 'B', 'C', 'D', 'E'],
    data: [
        [0, 5, 9, 9, 8],
        [5, 0, 10, 10, 9],
        [9, 10, 0, 8, 7],
        [9, 10, 8, 0, 3],
        [8, 9, 7, 3, 0]
    ]
};

import { CharacterMatrixInput } from './components/CharacterMatrixInput';
import { runSankoff } from './algorithms/sankoff';
import { checkPerfectPhylogeny } from './algorithms/perfectPhylogeny';
import { runNNI } from './algorithms/largeParsimony';

const SAMPLE_CHARACTER_MATRIX: CharacterMatrix = {
    taxa: ['A', 'B', 'C', 'D', 'E'],
    characters: [
        ['0', '0', '1', '1'],
        ['0', '0', '1', '0'],
        ['1', '1', '0', '0'],
        ['1', '0', '0', '0'],
        ['0', '1', '1', '1']
    ],
    type: 'binary'
};

const ALGORITHMS = [
  { id: 'upgma', name: 'UPGMA', icon: GitGraph, desc: 'Unweighted Pair Group Method with Arithmetic Mean' },
  { id: 'nj', name: 'Neighbor Joining', icon: Network, desc: 'Distance-based method for unrooted phylogenetic trees' },
  { id: 'hierarchical', name: 'Hierarchical Clustering', icon: Brain, desc: 'Single, Complete, and Average linkage methods' },
  { id: 'fourpoint', name: 'Four-Point Condition', icon: TableProperties, desc: 'Check if a distance matrix represents an additive tree' },
  { id: 'fitch', name: 'Fitch Parsimony', icon: Binary, desc: 'Small parsimony algorithm for fixed topologies' },
  { id: 'sankoff', name: 'Sankoff Algorithm', icon: Search, desc: 'Weighted parsimony with substitution costs' },
  { id: 'perfect', name: 'Perfect Phylogeny', icon: TestTube, desc: 'Compatibility-based tree reconstruction' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('upgma');
  const [matrix, setMatrix] = useState<DistanceMatrix>(SAMPLE_MATRIX);
  const [charMatrix, setCharMatrix] = useState<CharacterMatrix>(SAMPLE_CHARACTER_MATRIX);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const vizRef = useRef<HTMLDivElement>(null);
  const [linkage, setLinkage] = useState<LinkageMethod>('average');

  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    handleRun();
  }, [activeTab, matrix, charMatrix, linkage, step]);

  const handleRun = () => {
    let res: any = null;
    const isDistanceAlgo = ['upgma', 'nj', 'hierarchical', 'fourpoint'].includes(activeTab);

    if (isDistanceAlgo) {
        const err = validateMatrix(matrix);
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        if (activeTab === 'upgma') res = runUPGMA(matrix);
        else if (activeTab === 'nj') res = runNJ(matrix);
        else if (activeTab === 'hierarchical') res = runHierarchical(matrix, linkage);
        else if (activeTab === 'fourpoint') res = checkFourPoint(matrix);
    } else {
        setError(null);
        const distanceMat = {
          taxa: charMatrix.taxa,
          data: Array.from({ length: charMatrix.taxa.length }, (_, i) => 
            Array.from({ length: charMatrix.taxa.length }, (_, j) => {
              if (i === j) return 0;
              let diff = 0;
              for (let k = 0; k < charMatrix.characters[0].length; k++) {
                if (charMatrix.characters[i][k] !== charMatrix.characters[j][k]) diff++;
              }
              return diff;
            })
          )
        };
        const { tree: defaultTree } = runNJ(distanceMat);

        if (activeTab === 'fitch') res = runFitch(defaultTree, charMatrix);
        else if (activeTab === 'sankoff') {
            const states = charMatrix.type === 'binary' ? 2 : 4;
            const costMatrix = Array.from({ length: states }, (_, i) => 
                Array.from({ length: states }, (_, j) => i === j ? 0 : 1)
            );
            res = runSankoff(defaultTree, charMatrix, costMatrix);
        }
        else if (activeTab === 'perfect') res = checkPerfectPhylogeny(charMatrix);
    }
    
    // Step filtering
    if (step !== null && res?.history) {
        // Implement step logic here if needed by modifying the tree render
    }
    
    setResult(res);

    if (vizRef.current) {
      if (activeTab === 'upgma' || activeTab === 'hierarchical') {
        if (res?.tree) renderDendrogram(vizRef.current, res.tree, { color: '#3b82f6' });
      } else if (activeTab === 'nj') {
        if (res?.tree) renderTree(vizRef.current, res.tree, { isUnrooted: true, nodeColor: '#3b82f6' });
      } else if (res?.tree) {
        renderTree(vizRef.current, res.tree, { nodeColor: '#10b981' });
      }
    }
  };

  const isCharacterAlgo = ['fitch', 'sankoff', 'perfect'].includes(activeTab);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-white font-bold text-lg flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
            PhyloCore <span className="text-slate-400 font-normal">v1.0</span>
          </h1>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <div className="px-6 mb-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Distance Based</div>
          {ALGORITHMS.slice(0, 4).map((algo, i) => (
            <button
              key={algo.id}
              onClick={() => { setActiveTab(algo.id); setStep(null); }}
              className={`w-full flex items-center gap-3 px-6 py-2 transition-all text-left text-sm ${
                activeTab === algo.id 
                ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="text-[10px] font-mono opacity-50">0{i+1}</span>
              {algo.name}
            </button>
          ))}

          <div className="px-6 mt-6 mb-2 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Character Based</div>
          {ALGORITHMS.slice(4).map((algo, i) => (
            <button
              key={algo.id}
              onClick={() => { setActiveTab(algo.id); setStep(null); }}
              className={`w-full flex items-center gap-3 px-6 py-2 transition-all text-left text-sm ${
                activeTab === algo.id 
                ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-400' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="text-[10px] font-mono opacity-50">0{i+5}</span>
              {algo.name}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <button 
            onClick={() => {
              if (isCharacterAlgo) setCharMatrix(SAMPLE_CHARACTER_MATRIX);
              else setMatrix(SAMPLE_MATRIX);
              setStep(null);
            }}
            className="w-full py-2 px-4 bg-slate-800 text-slate-300 text-xs font-bold rounded border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            Load Example Data
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-slate-800">{ALGORITHMS.find(a => a.id === activeTab)?.name} Reconstruction</h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wide">
              {error ? 'Input Error' : 'Matrix Valid'}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (isCharacterAlgo) setCharMatrix({ ...SAMPLE_CHARACTER_MATRIX, characters: SAMPLE_CHARACTER_MATRIX.characters.map(r => r.map(() => '')) });
                else setMatrix({ ...SAMPLE_MATRIX, data: SAMPLE_MATRIX.data.map(r => r.map(() => 0)) });
                setError(null);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded hover:bg-slate-200"
            >
              Reset Data
            </button>
            <button 
              onClick={handleRun}
              className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded hover:bg-cyan-700 shadow-sm transition-colors"
            >
              Run Algorithm
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-12 gap-6 max-w-[1400px] mx-auto h-full">
            
            {/* Left Column: Matrix Input & Controls */}
            <div className="col-span-4 flex flex-col gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4 flex items-center gap-2">
                    {isCharacterAlgo ? <Network className="w-3.5 h-3.5 text-cyan-500" /> : <TableProperties className="w-3.5 h-3.5 text-cyan-500" />}
                    {isCharacterAlgo ? 'Character Matrix' : `Distance Matrix (n=${matrix.taxa.length})`}
                </h3>
                {isCharacterAlgo ? (
                  <CharacterMatrixInput 
                    taxa={charMatrix.taxa} 
                    characters={charMatrix.characters} 
                    type={charMatrix.type} 
                    onChange={(taxa, characters, type) => setCharMatrix({ taxa, characters, type })} 
                  />
                ) : (
                  <MatrixInput 
                      taxa={matrix.taxa} 
                      data={matrix.data} 
                      onChange={(taxa, data) => setMatrix({ taxa, data })} 
                  />
                )}
                {error && <p className="mt-2 text-[10px] text-red-500 font-bold uppercase tracking-tight">{error}</p>}
                
                {activeTab === 'hierarchical' && (
                    <div className="mt-4 flex flex-col gap-3 border-t border-slate-50 pt-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Linkage Method</span>
                        <div className="flex flex-wrap gap-2">
                            {['single', 'complete', 'average'].map(m => (
                                <button 
                                    key={m}
                                    onClick={() => setLinkage(m as any)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${linkage === m ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-400'}`}
                                >
                                    {m === 'average' ? 'Average' : m.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
              </div>

              {(activeTab === 'upgma' || activeTab === 'nj') && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">Step-by-Step Visualization</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-semibold uppercase tracking-tight">Current Step</span>
                      <span className="font-mono font-bold text-cyan-600">
                        {step === null ? result?.history?.length || 0 : step + 1} / {result?.history?.length || 0}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((step === null ? result?.history?.length || 0 : step + 1) / (result?.history?.length || 1)) * 100}%` }}
                        className="bg-cyan-500 h-full"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => setStep(prev => prev === null ? (result?.history?.length ? result.history.length - 2 : 0) : Math.max(0, prev - 1))}
                        disabled={step === 0}
                        className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"
                      >
                        Previous
                      </button>
                      <button 
                        onClick={() => setStep(prev => {
                          const max = result?.history?.length || 0;
                          if (prev === null) return 0;
                          if (prev + 1 >= max) return null;
                          return prev + 1;
                        })}
                        className="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors"
                      >
                        {step === null ? 'Restart' : (step + 1 === result?.history?.length ? 'Finish' : 'Next Step')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Visualization & History */}
            <div className="col-span-8 flex flex-col gap-6 overflow-hidden">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex-1 flex flex-col relative min-h-[450px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    {activeTab === 'upgma' || activeTab === 'hierarchical' ? 'Dendrogram (Cladogram)' : 'Phylogenetic Tree'}
                  </h3>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Taxa</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Merge</span>
                    </div>
                  </div>
                </div>
                
                <div ref={vizRef} className="flex-1 border border-slate-50 rounded-lg bg-slate-50/50 cursor-grab active:cursor-grabbing"></div>
              </div>

              {/* Result Summary / History */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm min-h-[200px]">
                {result?.history ? (
                  <>
                    <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">
                        {activeTab === 'nj' ? 'Iteration Log' : 'Merge History'}
                    </h3>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-100">
                            <th className="pb-2 font-medium">Step</th>
                            <th className="pb-2 font-medium">Nodes</th>
                            <th className="pb-2 font-medium">Metric</th>
                            <th className="pb-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-600">
                          {activeTab === 'nj' ? (
                            result.history.map((h: any) => (
                              <tr key={h.iteration} className="border-b border-slate-50">
                                <td className="py-2 px-1 font-mono">{h.iteration}</td>
                                <td className="py-2 px-1 font-semibold">{h.pair[0]} + {h.pair[1]}</td>
                                <td className="py-2 px-1">Q: {h.qValue.toFixed(2)}</td>
                                <td className="py-2 px-1 text-green-500 font-bold uppercase text-[9px]">Calculated</td>
                              </tr>
                            ))
                          ) : (
                            result.history.map((h: any) => (
                              <tr key={h.step} className="border-b border-slate-50">
                                <td className="py-2 px-1 font-mono">{h.step}</td>
                                <td className="py-2 px-1 font-semibold">{h.clusters[0]} + {h.clusters[1]}</td>
                                <td className="py-2 px-1">H: {h.height.toFixed(2)}</td>
                                <td className="py-2 px-1">
                                  {step !== null && h.step <= step + 1 ? (
                                    <span className="text-cyan-500 font-bold uppercase text-[9px] animate-pulse">Visualizing</span>
                                  ) : (
                                    <span className="text-green-500 font-bold uppercase text-[9px]">Complete</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : result?.totalScore !== undefined ? (
                  <div className="flex flex-col h-full justify-center">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Parsimony Results</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold">TOTAL SCORE:</span>
                        <span className="text-lg font-mono font-bold text-cyan-600 bg-cyan-50 px-3 py-1 rounded-lg">
                          {result.totalScore}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Character Breakdown</span>
                        <div className="flex flex-wrap gap-1.5">
                          {result.charScores?.map((s: number, i: number) => (
                            <div key={i} className="flex flex-col items-center bg-slate-50 rounded border border-slate-100 p-1.5 min-w-[32px]">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">C{i+1}</span>
                              <span className="text-xs font-mono font-bold text-slate-700">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {activeTab === 'sankoff' && (
                        <div className="p-3 bg-cyan-50/50 rounded-xl border border-cyan-100/50">
                          <p className="text-[10px] text-cyan-700 leading-relaxed italic">
                            Weighted Sankoff considers custom substitution costs while minimizing the total tree distance.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeTab === 'perfect' && result ? (
                   <div className="flex flex-col h-full">
                      <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">Compatibility Analysis</h3>
                      <div className={`p-4 rounded-xl border mb-4 flex items-center justify-between ${result.exists ? 'bg-green-50 border-green-100 text-green-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${result.exists ? 'bg-green-100' : 'bg-amber-100'}`}>
                            {result.exists ? <GitGraph className="w-4 h-4" /> : <Network className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{result.exists ? 'PERFECT PHYLOGENY EXISTS' : 'INCOMPATIBLE DATA'}</p>
                            <p className="text-[10px] opacity-70">Four-gamete test results for binary characters</p>
                          </div>
                        </div>
                        {result.exists && <button className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700">Export Tree</button>}
                      </div>
                      {!result.exists && (
                        <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar pr-2">
                           {result.incompatiblePairs.map((p: any, i: number) => (
                              <div key={i} className="text-[10px] text-red-600/70 py-1 border-b border-red-50 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                Character C{p[0]+1} and C{p[1]+1} are incompatible
                              </div>
                           ))}
                        </div>
                      )}
                   </div>
                ) : activeTab === 'fourpoint' && result ? (
                   <div className="flex flex-col h-full">
                      <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">Additive Test Log</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto max-h-[140px] custom-scrollbar pr-2">
                        {result.results.map((r: any, i: number) => (
                           <div key={i} className={`p-2 rounded border text-[10px] flex flex-col gap-1 ${r.pass ? 'border-slate-100 bg-slate-50' : 'border-red-100 bg-red-50'}`}>
                              <span className="font-bold text-slate-400">[{r.quadruple.join(',')}]</span>
                              <div className="flex justify-between font-mono font-bold">
                                <span>{r.s1}</span>
                                <span>{r.s2}</span>
                                <span>{r.s3}</span>
                              </div>
                           </div>
                        ))}
                      </div>
                   </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300 italic text-sm">
                    Run the algorithm to see results here
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
