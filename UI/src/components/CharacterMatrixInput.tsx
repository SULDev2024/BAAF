import React from 'react';

interface CharacterMatrixInputProps {
  taxa: string[];
  characters: string[][];
  type: 'binary' | 'dna';
  onChange: (taxa: string[], characters: string[][], type: 'binary' | 'dna') => void;
}

export const CharacterMatrixInput: React.FC<CharacterMatrixInputProps> = ({ taxa, characters, type, onChange }) => {
  const numTaxa = taxa.length;
  const numChars = characters[0]?.length || 0;

  const handleCharChange = (taxonIdx: number, charIdx: number, val: string) => {
    const newChars = characters.map(row => [...row]);
    newChars[taxonIdx][charIdx] = val.toUpperCase().trim();
    onChange(taxa, newChars, type);
  };

  const setType = (newType: 'binary' | 'dna') => {
    onChange(taxa, characters, newType);
  };

  const addCharacter = () => {
    const newChars = characters.map(row => [...row, type === 'binary' ? '0' : 'A']);
    onChange(taxa, newChars, type);
  };

  const removeCharacter = () => {
    if (numChars <= 1) return;
    const newChars = characters.map(row => row.slice(0, -1));
    onChange(taxa, newChars, type);
  };

  return (
    <div className="overflow-x-auto p-1">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
            <button onClick={addCharacter} className="px-3 py-1 bg-cyan-600 text-white rounded text-[10px] font-bold hover:bg-cyan-700 transition-colors uppercase tracking-wider shadow-sm">+ Char</button>
            <button onClick={removeCharacter} className="px-3 py-1 bg-slate-100 text-slate-400 rounded text-[10px] font-bold hover:bg-red-50 hover:text-red-500 transition-all uppercase tracking-wider">- Char</button>
        </div>
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-inner">
            {['binary', 'dna'].map(t => (
                <button
                    key={t}
                    onClick={() => setType(t as any)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest ${type === t ? 'bg-white shadow-sm text-cyan-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    {t}
                </button>
            ))}
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-1"></th>
            {Array.from({ length: numChars }).map((_, i) => (
              <th key={i} className="p-1 text-[9px] text-slate-300 font-mono uppercase tracking-tighter">C{i+1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {taxa.map((name, i) => (
            <tr key={i}>
              <td className="p-1">
                <span className="text-[11px] font-mono font-bold w-10 block text-center bg-slate-50 border border-slate-100 rounded py-1">{name}</span>
              </td>
              {characters[i].map((char, j) => (
                <td key={j} className="p-0.5">
                  <input
                    type="text"
                    value={char}
                    maxLength={1}
                    onChange={(e) => handleCharChange(i, j, e.target.value)}
                    className="w-10 text-center text-[10px] p-1 border border-slate-200 rounded focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 outline-none uppercase font-mono transition-all"
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
