import React from 'react';
import { 
  GitBranch, 
  Database,
  Dna,
  Share2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const navItems = [
  { id: 'import', label: 'Sequence Input', icon: Database },
  { id: 'align', label: 'Alignment', icon: Dna },
  { id: 'construct', label: 'Tree Visualizer', icon: GitBranch },
  { id: 'results', label: 'Batch Jobs', icon: Share2 },
];

export const Sidebar: React.FC<{ activeTab: string, setActiveTab: (id: string) => void }> = ({ activeTab, setActiveTab }) => {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-full shrink-0">
      <div className="p-6 flex items-center gap-2 border-b border-slate-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold tracking-tight text-lg text-slate-900">BioPhylo v4</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">Navigation</p>
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-all duration-200 text-left ${
                activeTab === item.id 
                ? 'bg-slate-100 text-blue-600' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {activeTab === item.id && <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-6 border-t border-slate-100 mt-auto">
        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-3">Session Stats</div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-600 font-medium">Active Jobs</span>
          <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">03</span>
        </div>
      </div>
    </aside>
  );
};

