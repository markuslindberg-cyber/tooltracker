import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, X, Upload, Filter, ToggleLeft, ToggleRight, Square, CheckSquare } from 'lucide-react';

const statusLabels = {
  available: 'Tillgänglig',
  in_use: 'I bruk',
  i_lager: 'I lager',
  maintenance: 'Underhåll',
  missing: 'Saknas',
  retired: 'Kasserad',
  sålda: 'Såld',
};

const FIELD_LABELS = {
  name: 'Namn',
  manufacturer: 'Tillverkare',
  model_number: 'Modell',
  category: 'Kategori',
  subcategory: 'Underkategori',
  status: 'Status',
  condition: 'Skick',
  location_name: 'Plats',
  purchase_price: 'Pris',
  purchase_date: 'Inköpsdatum',
  purchase_location: 'Köpt från',
  invoice_number: 'Faktura',
  barcode: 'Streckkod',
  notes: 'Anteckningar',
};

// Maps both directions: english key ↔ swedish label
const STATUS_EQUIVALENTS = {
  available: 'tillgänglig',
  in_use: 'i bruk',
  i_lager: 'i lager',
  maintenance: 'underhåll',
  missing: 'saknas',
  retired: 'kasserad',
  sålda: 'såld',
};

function normalizeValue(field, val) {
  const v = (val ?? '').toString().trim().toLowerCase();
  if (field === 'status') {
    // Normalize both english keys and swedish labels to the english key
    for (const [key, label] of Object.entries(STATUS_EQUIVALENTS)) {
      if (v === key || v === label) return key;
    }
  }
  return v;
}

function getChangedFields(row, existing) {
  if (!existing) return [];
  return Object.keys(FIELD_LABELS).filter(field => {
    const newVal = normalizeValue(field, row[field]);
    const oldVal = normalizeValue(field, existing[field]);
    return newVal !== oldVal && newVal !== '';
  });
}

export default function ToolImportPreviewModal({ rows, existingTools, fileName, onConfirm, onCancel }) {
  const [importing, setImporting] = useState(false);
  const [actionFilter, setActionFilter] = useState('all');
  const [previewField, setPreviewField] = useState('all');
  const [excludedIds, setExcludedIds] = useState(new Set()); // row indexes excluded from import

  // Classify each row
  const enriched = useMemo(() => rows.map((tool, idx) => {
    const existing = existingTools.find(t =>
      (tool.tool_number && t.tool_number === tool.tool_number) ||
      (tool.barcode && t.barcode === tool.barcode)
    );
    const changedFields = existing ? getChangedFields(tool, existing) : [];
    return { ...tool, _rowIdx: idx, _action: existing ? 'update' : 'create', _existingId: existing?.id, _existing: existing, _changedFields: changedFields };
  }), [rows, existingTools]);

  const newCount = enriched.filter(r => r._action === 'create').length;
  const updateCount = enriched.filter(r => r._action === 'update').length;

  // All fields that actually change across update rows
  const allChangedFields = useMemo(() => {
    const fields = new Set();
    enriched.filter(r => r._action === 'update').forEach(r => r._changedFields.forEach(f => fields.add(f)));
    return [...fields].sort();
  }, [enriched]);

  // Which fields are enabled for update (toggled on)
  const [enabledFields, setEnabledFields] = useState(() => new Set(Object.keys(FIELD_LABELS)));

  const toggleField = (field) => {
    setEnabledFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field); else next.add(field);
      return next;
    });
  };

  const enableAllFields = () => setEnabledFields(new Set(Object.keys(FIELD_LABELS)));
  const disableAllFields = () => setEnabledFields(new Set());

  // Filtered rows for table display
  const filtered = useMemo(() => {
    return enriched.filter(row => {
      if (actionFilter === 'create' && row._action !== 'create') return false;
      if (actionFilter === 'update' && row._action !== 'update') return false;
      if (previewField !== 'all' && row._action === 'update') {
        if (!row._changedFields.includes(previewField)) return false;
      }
      return true;
    });
  }, [enriched, actionFilter, previewField]);

  // Toggle a single row in/out
  const toggleRow = (idx) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Toggle all currently filtered rows
  const filteredIndexes = useMemo(() => filtered.map(row => row._rowIdx), [filtered]);
  const allFilteredSelected = filteredIndexes.length > 0 && filteredIndexes.every(i => !excludedIds.has(i));
  const toggleAllFiltered = () => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredIndexes.forEach(i => next.add(i));
      } else {
        filteredIndexes.forEach(i => next.delete(i));
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    setImporting(true);
    const finalRows = enriched
      .filter(row => !excludedIds.has(row._rowIdx))
      .map(row => ({
        ...row,
        _enabledFields: row._action === 'update' ? [...enabledFields] : null,
      }));
    await onConfirm(finalRows);
    setImporting(false);
  };

  const showChangedCol = true;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Förhandsgranskning av import</h2>
            <p className="text-sm text-gray-500 mt-0.5">{fileName} — {enriched.length} rader</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary */}
        <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">{newCount} nya verktyg skapas</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">{updateCount} befintliga uppdateras</span>
          </div>
        </div>

        {/* Field toggle section — only shown when there are updates */}
        {updateCount > 0 && allChangedFields.length > 0 && (
          <div className="px-6 py-3 border-b border-gray-200 bg-amber-50/60">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                Välj vilka fält som ska uppdateras på befintliga maskiner
              </p>
              <div className="flex gap-2">
                <button onClick={enableAllFields} className="text-xs text-blue-600 hover:underline">Aktivera alla</button>
                <span className="text-gray-300">|</span>
                <button onClick={disableAllFields} className="text-xs text-gray-500 hover:underline">Inaktivera alla</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allChangedFields.map(field => {
                const enabled = enabledFields.has(field);
                return (
                  <button
                    key={field}
                    onClick={() => toggleField(field)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      enabled
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-400 border-gray-300 line-through'
                    }`}
                  >
                    {enabled
                      ? <ToggleRight className="w-3.5 h-3.5" />
                      : <ToggleLeft className="w-3.5 h-3.5" />
                    }
                    {FIELD_LABELS[field] || field}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-amber-700 mt-2">
              {enabledFields.size === 0
                ? '⚠️ Inga fält är aktiverade — befintliga maskiner uppdateras inte alls.'
                : `${[...enabledFields].filter(f => allChangedFields.includes(f)).length} av ${allChangedFields.length} ändrade fält kommer uppdateras.`
              }
            </p>
          </div>
        )}

        {/* Row filter bar */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex items-center gap-1">
            {[
              { value: 'all', label: 'Alla' },
              { value: 'create', label: 'Nya' },
              { value: 'update', label: 'Uppdateras' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setActionFilter(opt.value); if (opt.value !== 'update') setPreviewField('all'); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  actionFilter === opt.value
                    ? 'bg-[#8B1E1E] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(actionFilter === 'update' || actionFilter === 'all') && allChangedFields.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-gray-400 mr-1">Visa rader med ändrat:</span>
              <button
                onClick={() => setPreviewField('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  previewField === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Alla
              </button>
              {allChangedFields.map(field => (
                <button
                  key={field}
                  onClick={() => { setPreviewField(field); setActionFilter('update'); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    previewField === field ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {FIELD_LABELS[field] || field}
                </button>
              ))}
            </div>
          )}

          <span className="ml-auto text-xs text-gray-400">{filtered.length} rader visas</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 w-8 text-center">
                  <button onClick={toggleAllFiltered}>
                    {allFilteredSelected
                      ? <CheckSquare className="w-4 h-4 text-[#8B1E1E]" />
                      : <Square className="w-4 h-4 text-gray-400" />}
                  </button>
                </th>
                <th className="px-3 py-2 text-left font-semibold w-24">Åtgärd</th>
                <th className="px-3 py-2 text-left font-semibold min-w-[120px]">Namn</th>
                <th className="px-3 py-2 text-left font-semibold min-w-[100px]">Tillverkare</th>
                <th className="px-3 py-2 text-left font-semibold min-w-[100px]">Modell</th>
                <th className="px-3 py-2 text-left font-semibold min-w-[100px]">Kategori</th>
                <th className="px-3 py-2 text-left font-semibold w-24">Status</th>
                <th className="px-3 py-2 text-left font-semibold min-w-[100px]">Plats</th>
                <th className="px-3 py-2 text-right font-semibold w-24">Pris</th>
                {showChangedCol && <th className="px-3 py-2 text-left font-semibold min-w-[140px]">Ändrade fält</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row, idx) => {
                const excluded = excludedIds.has(row._rowIdx);
                return (
                <tr key={idx} className={`${excluded ? 'opacity-40' : ''} ${row._action === 'update' ? 'bg-blue-50/40' : 'bg-white'}`}>
                  <td className="px-3 py-2 w-8 text-center">
                    <button onClick={() => toggleRow(row._rowIdx)}>
                      {excluded
                        ? <Square className="w-4 h-4 text-gray-400" />
                        : <CheckSquare className="w-4 h-4 text-[#8B1E1E]" />}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    {row._action === 'create' ? (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs">Ny</Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Uppdatera</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate">{row.name}</td>
                  <td className="px-3 py-2 text-gray-600">{row.manufacturer || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{row.model_number || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{row.category || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{statusLabels[row.status] || row.status || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{row.location_name || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {row.purchase_price ? `${Number(row.purchase_price).toLocaleString('sv-SE')} kr` : '—'}
                  </td>
                  {showChangedCol && (
                    <td className="px-3 py-2">
                      {row._action === 'update' && row._changedFields.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row._changedFields.map(f => (
                            <span
                              key={f}
                              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                !enabledFields.has(f)
                                  ? 'bg-gray-100 text-gray-400 line-through'
                                  : previewField === f
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {FIELD_LABELS[f] || f}
                            </span>
                          ))}
                        </div>
                      ) : row._action === 'update' ? (
                        <span className="text-xs text-gray-400">Inga ändringar</span>
                      ) : null}
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onCancel} disabled={importing}>Avbryt</Button>
          <Button
            onClick={handleConfirm}
            disabled={importing}
            className="bg-[#8B1E1E] hover:bg-[#7a1a1a] gap-2"
          >
            {importing ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Importerar...</>
            ) : (
              <><Upload className="w-4 h-4" />Godkänn och importera ({enriched.length - excludedIds.size})</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}