import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, X, Search, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function EditableCell({ value, onChange, type = 'text', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const commit = () => {
    setEditing(false);
    const parsed = type === 'number' ? parseFloat(val) : val;
    onChange(isNaN(parsed) && type === 'number' ? 0 : parsed);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type={type === 'number' ? 'number' : 'text'}
        step="any"
        className={`border border-blue-400 rounded px-1 py-0.5 text-xs w-24 focus:outline-none ${className}`}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:underline hover:text-blue-700 ${className}`}
      title="Klicka för att redigera"
      onClick={() => { setVal(value); setEditing(true); }}
    >
      {type === 'number' ? Number(value).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (value || '–')}
    </span>
  );
}

function PersonPickerDialog({ personal, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const filtered = personal.filter(p => p.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Välj personal</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input autoFocus className="flex-1 text-sm outline-none" placeholder="Sök namn..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="max-h-60 overflow-y-auto divide-y">
          {filtered.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Inga träffar</p>}
          {filtered.map(p => (
            <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm" onClick={() => { onSelect(p); onClose(); }}>
              <span className="font-medium text-gray-900">{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function KundPickerDialog({ kunder, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const filtered = kunder.filter(k => k.namn?.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Välj kund</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input autoFocus className="flex-1 text-sm outline-none" placeholder="Sök kundnamn..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="max-h-60 overflow-y-auto divide-y">
          {filtered.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Inga träffar</p>}
          {filtered.map(k => (
            <button key={k.id} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm" onClick={() => { onSelect(k); onClose(); }}>
              <span className="font-medium text-gray-900">{k.namn}</span>
              <span className="ml-2 text-gray-400 text-xs">{k.typ}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UttagImportPreviewTable({ rows, personal, kunder, onRowsChange, onConfirm, onCancel }) {
  const [personPickerIdx, setPersonPickerIdx] = useState(null);
  const [kundPickerIdx, setKundPickerIdx] = useState(null);

  const updateRow = (idx, changes) => {
    onRowsChange(prev => prev.map((r, i) => i === idx ? { ...r, ...changes } : r));
  };

  const readyCount = rows.filter(r => r.action !== 'ignore').length;
  const ignoreCount = rows.filter(r => r.action === 'ignore').length;
  const noPersonCount = rows.filter(r => r.action !== 'ignore' && !r.matchedPersonal).length;
  const noKundCount = rows.filter(r => r.action !== 'ignore' && !r.matchedKund).length;
  const warningCount = noPersonCount + noKundCount;

  return (
    <div className="bg-white rounded-lg border border-amber-300 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-amber-800">Förhandsgranskning</h2>
          <div className="flex gap-3 mt-1 flex-wrap text-sm">
            <span className="text-green-700">✓ {readyCount} redo</span>
            {warningCount > 0 && <span className="text-orange-600">⚠ {warningCount} saknar matchning (importeras ändå)</span>}
            {ignoreCount > 0 && <span className="text-gray-500">○ {ignoreCount} ignoreras</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onCancel}>Avbryt</Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={onConfirm}
            disabled={readyCount === 0}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Importera {readyCount} rader
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-amber-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Datum</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Personal</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Kund</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Streckkod / Artikel</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Antal</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Pris/enhet</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Åtgärd</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => {
              const isIgnored = row.action === 'ignore';
              let rowBg = 'hover:bg-gray-50';
              if (isIgnored) rowBg = 'bg-gray-50 opacity-50';

              return (
                <tr key={idx} className={rowBg}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{row.datum}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.matchedPersonal
                      ? <span className="text-green-800 font-medium">{row.matchedPersonal.name}</span>
                      : <span className="text-orange-600">{row.personal_namn || '–'} <span className="text-orange-400">(ej matchad)</span></span>
                    }
                    {!isIgnored && (
                      <button className="ml-1 text-gray-400 hover:text-gray-600 text-xs underline" onClick={() => setPersonPickerIdx(idx)}>ändra</button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.matchedKund
                      ? <span className="text-green-800 font-medium">{row.matchedKund.namn}</span>
                      : <span className="text-orange-600">{row.kund_namn || '–'} <span className="text-orange-400">(ej matchad)</span></span>
                    }
                    {!isIgnored && (
                      <button className="ml-1 text-gray-400 hover:text-gray-600 text-xs underline" onClick={() => setKundPickerIdx(idx)}>ändra</button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {row.matchedArtikel
                      ? <span className="text-green-800 font-medium">{row.matchedArtikel.benamning}</span>
                      : <span className="text-gray-500 font-mono">{row.streckkod}</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {!isIgnored
                      ? <EditableCell value={row.antal} type="number" onChange={v => updateRow(idx, { antal: v })} className="text-right" />
                      : row.antal}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {!isIgnored
                      ? <EditableCell value={row.pris} type="number" onChange={v => updateRow(idx, { pris: v })} className="text-right" />
                      : row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {isIgnored
                      ? <button className="text-gray-400 hover:text-gray-600 text-xs underline" onClick={() => updateRow(idx, { action: undefined })}>ångra</button>
                      : <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-gray-400 hover:text-gray-700">
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => updateRow(idx, { action: 'ignore' })}>
                              <X className="w-4 h-4 mr-2 text-gray-400" /> Ignorera rad
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {personPickerIdx !== null && (
        <PersonPickerDialog
          personal={personal}
          onSelect={p => updateRow(personPickerIdx, { matchedPersonal: p, personal_namn: p.name })}
          onClose={() => setPersonPickerIdx(null)}
        />
      )}
      {kundPickerIdx !== null && (
        <KundPickerDialog
          kunder={kunder}
          onSelect={k => updateRow(kundPickerIdx, { matchedKund: k, kund_namn: k.namn })}
          onClose={() => setKundPickerIdx(null)}
        />
      )}
    </div>
  );
}