import React from 'react';

interface MatrixInputProps {
  taxa: string[];
  data: number[][];
  onChange: (taxa: string[], data: number[][]) => void;
}

export const MatrixInput: React.FC<MatrixInputProps> = ({ taxa, data, onChange }) => {
  const n = taxa.length;

  const handleDataChange = (i: number, j: number, val: string) => {
    const newData = data.map(row => [...row]);
    const num = parseFloat(val) || 0;
    newData[i][j] = num;
    newData[j][i] = num;
    onChange(taxa, newData);
  };

  const handleTaxaChange = (i: number, val: string) => {
    const newTaxa = [...taxa];
    newTaxa[i] = val;
    onChange(newTaxa, data);
  };

  const addTaxon = () => {
    const newTaxa = [...taxa, String.fromCharCode(65 + n)];
    const newData = data.map(row => [...row, 0]);
    newData.push(new Array(n + 1).fill(0));
    onChange(newTaxa, newData);
  };

  const removeTaxon = () => {
    if (n <= 3) return;
    const newTaxa = taxa.slice(0, -1);
    const newData = data.slice(0, -1).map(row => row.slice(0, -1));
    onChange(newTaxa, newData);
  };

  return (
    <div className="overflow-x-auto p-1">
      <div className="flex gap-2 mb-4 justify-end">
        <button onClick={addTaxon} className="px-3 py-1 bg-cyan-600 text-white rounded text-[10px] font-bold hover:bg-cyan-700 transition-colors uppercase tracking-wider shadow-sm">+ Taxon</button>
        <button onClick={removeTaxon} className="px-3 py-1 bg-slate-100 text-slate-400 rounded text-[10px] font-bold hover:bg-red-50 hover:text-red-500 transition-all uppercase tracking-wider">- Remove</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-1"></th>
            {taxa.map((name, i) => (
              <th key={i} className="p-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleTaxaChange(i, e.target.value)}
                  className="w-10 text-center text-[11px] font-mono font-bold text-slate-400 border-b border-transparent hover:border-slate-300 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td className="p-1">
                <span className="text-[11px] font-mono font-bold w-10 block text-center bg-slate-50 border border-slate-100 rounded py-1">{taxa[i]}</span>
              </td>
              {row.map((val, j) => (
                <td key={j} className="p-0.5">
                  <input
                    type="number"
                    value={val}
                    disabled={i === j}
                    onChange={(e) => handleDataChange(i, j, e.target.value)}
                    className={`w-10 text-center text-[10px] p-1 border rounded transition-all font-mono outline-none ${
                        i === j 
                        ? 'bg-slate-100/50 border-slate-100 text-slate-300' 
                        : 'bg-white border-slate-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20'
                    }`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
