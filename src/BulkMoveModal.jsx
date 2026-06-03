import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, X, Link, PlusCircle, Search, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Inline editable cell
function EditableCell({ value, onChange, type = 'text', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const commit = () => {
    setEditing(false);
    const parsed = type === 'number' ? parseFloat(val) : val;
    if (!isNaN(parsed) || type === 'text') onChange(parsed);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type={type === 'number' ? 'number' : 'text'}
        step="any"
        className={`border border-blue-400 rounded px-1 py-0.5 text-xs w-20 focus:outline-none ${className}`}
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
      {type === 'number' ? Number(value).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
    </span>
  );
}

// Article picker dialog
function ArticlePickerDialog({ artiklar, onSelect, onClose }) {
  const [q, setQ] = useState('');
  const filtered = artiklar.filter(a =>
    a.benamning?.toLowerCase().includes(q.toLowerCase()) ||
    a.streckkod?.includes(q) ||
    a.old_streckkod?.includes(q) ||
    a.artikelnummer?.includes(q)
  ).slice(0, 50);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Koppla till befintlig artikel</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            autoFocus
            className="flex-1 text-sm outline-none"
            placeholder="Sök benämning, streckkod, artikelnummer..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <div className="max-h-72 overflow-y-auto divide-y">
          {filtered.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Inga träffar</p>}
          {filtered.map(a => (
            <button
              key={a.id}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
              onClick={() => { onSelect(a); onClose(); }}
            >
              <span className="font-medium text-gray-900">{a.benamning}</span>
              <span className="ml-2 text-gray-400 text-xs font-mono">{a.streckkod}</span>
              {a.artikelnummer && <span className="ml-2 text-gray-400 text-xs">#{a.artikelnummer}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// New article inline form
function NewArticleForm({ row, onSave, onCancel }) {
  const [form, setForm] = useState({
    benamning: row.benamning || '',
    artikelnummer: row.artikelnummer || '',
    streckkod: row.streckkod || '',
    pris: row.pris || 0,
    inkopsdatum: row.datum || '',
    antal_inkopta: row.antal || 0,
    lagertroskelvarde: 10,
  });

  return (
    <div className="bg-green-50 border border-green-300 rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-green-800">Ny artikel att skapas</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ['benamning', 'Benämning *'],
          ['artikelnummer', 'Artikelnummer'],
          ['streckkod', 'Streckkod *'],
          ['pris', 'Pris per enhet *'],
          ['antal_inkopta', 'Antal inköpta *'],
          ['lagertroskelvarde', 'Lagertröskel'],
        ].map(([field, label]) => (
          <div key={field}>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            <input
              type={['pris', 'antal_inkopta', 'lagertroskelvarde'].includes(field) ? 'number' : 'text'}
              step="any"
              className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:border-green-400"
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel}>Avbryt</Button>
        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onSave(form)} disabled={!form.benamning || !form.streckkod}>
          Spara ny artikel
        </Button>
      </div>
    </div>
  );
}

export default function ImportPreviewTable({ rows, artiklar, onRowsChange, onConfirm, onCancel }) {
  const [pickerRowIdx, setPickerRowIdx] = useState(null);
  const [newArticleRowIdx, setNewArticleRowIdx] = useState(null);

  const updateRow = (idx, changes) => {
    onRowsChange(prev => prev.map((r, i) => i === idx ? { ...r, ...changes } : r));
  };

  const handleLinkArticle = (idx, artikel) => {
    updateRow(idx, {
      matchedArtikel: artikel,
      action: 'link',
      artikelNamn: artikel.benamning,
    });
  };

  const handleSetNewArticle = (idx, form) => {
    updateRow(idx, {
      action: 'create',
      newArtikelData: form,
      artikelNamn: form.benamning,
    });
    setNewArticleRowIdx(null);
  };

  const readyCount = rows.filter(r => r.action !== 'ignore' && (r.matchedArtikel || r.action === 'create')).length;
  const ignoreCount = rows.filter(r => r.action === 'ignore').length;
  const needsActionCount = rows.filter(r => !r.matchedArtikel && r.action !== 'ignore' && r.action !== 'create').length;

  return (
    <div className="bg-white rounded-lg border border-amber-300 p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-amber-800">Förhandsgranskning</h2>
          <div className="flex gap-3 mt-1 flex-wrap text-sm">
            <span className="text-green-700">✓ {readyCount} redo</span>
            {needsActionCount > 0 && <span className="text-orange-600">⚠ {needsActionCount} kräver åtgärd</span>}
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

      {needsActionCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
          <strong>{needsActionCount} rader</strong> kunde inte matchas automatiskt. Välj åtgärd per rad nedan (koppla till befintlig, skapa ny, eller ignorera).
        </div>
      )}

      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-amber-50 border-b sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-8">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Streckkod</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Artikel</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Datum</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Antal</th>
              <th className="px-3 py-2 text-right text-xs font-semibold">Pris/enhet</th>
              <th className="px-3 py-2 text-left text-xs font-semibold">Status / Åtgärd</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, idx) => {
              const isIgnored = row.action === 'ignore';
              const isMatched = !!row.matchedArtikel;
              const isCreate = row.action === 'create';
              const needsAction = !isMatched && !isIgnored && !isCreate;

              let rowBg = 'hover:bg-gray-50';
              if (isIgnored) rowBg = 'bg-gray-50 opacity-50';
              else if (isMatched) rowBg = 'bg-green-50';
              else if (isCreate) rowBg = 'bg-blue-50';
              else if (needsAction) rowBg = 'bg-orange-50';

              return [
              <tr key={`row-${idx}`} className={rowBg}>
                    <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{row.streckkod}</td>
                    <td className="px-3 py-2 text-xs max-w-[180px]">
                      {isMatched && <span className="text-green-800 font-medium">{row.matchedArtikel.benamning}</span>}
                      {isCreate && <span className="text-blue-800 font-medium">{row.artikelNamn} <span className="text-blue-500 font-normal">(ny)</span></span>}
                      {needsAction && <span className="text-gray-400 italic">Ej matchad</span>}
                      {isIgnored && <span className="text-gray-400 line-through">{row.artikelNamn || row.streckkod}</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{row.datum}</td>
                    <td className="px-3 py-2 text-right text-xs">
                      {!isIgnored ? (
                        <EditableCell
                          value={row.antal}
                          type="number"
                          onChange={v => updateRow(idx, { antal: v })}
                          className="text-right"
                        />
                      ) : row.antal}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      {!isIgnored ? (
                        <EditableCell
                          value={row.pris}
                          type="number"
                          onChange={v => updateRow(idx, { pris: v })}
                          className="text-right"
                        />
                      ) : row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {isMatched && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          <span className="text-green-700">Matchad</span>
                          <button className="ml-1 text-gray-400 hover:text-gray-600 text-xs underline" onClick={() => setPickerRowIdx(idx)}>ändra</button>
                        </div>
                      )}
                      {isCreate && (
                        <div className="flex items-center gap-1">
                          <PlusCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <span className="text-blue-700">Skapar ny</span>
                          <button className="ml-1 text-gray-400 hover:text-gray-600 text-xs underline" onClick={() => setNewArticleRowIdx(idx)}>redigera</button>
                        </div>
                      )}
                      {needsAction && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-orange-300 text-orange-700 hover:bg-orange-100">
                              Välj åtgärd <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem onClick={() => setPickerRowIdx(idx)}>
                              <Link className="w-4 h-4 mr-2 text-blue-500" /> Koppla till befintlig
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setNewArticleRowIdx(idx); }}>
                              <PlusCircle className="w-4 h-4 mr-2 text-green-500" /> Skapa ny artikel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateRow(idx, { action: 'ignore' })}>
                              <X className="w-4 h-4 mr-2 text-gray-400" /> Ignorera rad
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      {isIgnored && (
                        <button className="text-gray-400 hover:text-gray-600 text-xs underline" onClick={() => updateRow(idx, { action: undefined })}>
                          ångra
                        </button>
                      )}
                    </td>
                  </tr>,
                  newArticleRowIdx === idx ? (
                    <tr key={`form-${idx}`}>
                      <td colSpan={7} className="px-3 py-3">
                        <NewArticleForm
                          row={row}
                          onSave={form => handleSetNewArticle(idx, form)}
                          onCancel={() => setNewArticleRowIdx(null)}
                        />
                      </td>
                    </tr>
                  ) : null,
            ];
            })}
          </tbody>
        </table>
      </div>

      {pickerRowIdx !== null && (
        <ArticlePickerDialog
          artiklar={artiklar}
          onSelect={a => handleLinkArticle(pickerRowIdx, a)}
          onClose={() => setPickerRowIdx(null)}
        />
      )}
    </div>
  );
}