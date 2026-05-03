import React from 'react';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Zap,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const data = [
  { name: '450k', value: 400 },
  { name: '400k', value: 300 },
  { name: '350k', value: 600 },
  { name: '300k', value: 800 },
  { name: '250k', value: 500 },
  { name: '200k', value: 900 },
  { name: '150k', value: 700 },
  { name: '100k', value: 1100 },
  { name: 'Present', value: 1300 },
];

export const StatsGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Taxa Count', value: '128', icon: Zap, trend: '+12.4%' },
        { label: 'Sites', value: '4,821', icon: Activity, trend: 'Optimal' },
        { label: 'Confidence', value: '94%', icon: BarChart3, trend: 'High' },
        { label: 'Process', value: '1.2s', icon: Clock, trend: 'Cached' },
      ].map((stat, i) => (
        <div key={i} className="minimal-card p-5 hover:border-blue-200 group">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold tracking-tight text-slate-900 mono-value">{stat.value}</span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{stat.trend}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export const ConvergenceChart = () => (
  <div className="minimal-card p-6 h-[250px]">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-tight italic">Lineage Reconstruction</h3>
      <div className="flex gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
        <div className="w-2 h-2 rounded-full bg-slate-200" />
      </div>
    </div>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fill: '#64748b' }} 
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
          itemStyle={{ color: '#2563eb' }}
        />
        <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

