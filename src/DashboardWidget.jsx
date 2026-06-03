import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Info, X } from 'lucide-react';

export default function ToolImportPreviewTable({
  filtered,
  selectedRows,
  setSelectedRows,
  expandedRowIdx,
  setExpandedRowIdx,
  previewRows,
  setPreviewRows,
  setEditingRowIdx,
  setEditFormData,
  availableCategories,
  locations,
  selectedUpdates,
  setSelectedUpdates,
  tools = [],
}) {
  const [infoModalIdx, setInfoModalIdx] = useState(null);
  const [linkSearchIdx, setLinkSearchIdx] = useState(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const allFields = ['name', 'manufacturer', 'category', 'status', 'condition', 'location_name', 'purchase_date', 'purchase_price'];

  const actionOptions = (row) => [
    ...(row.matchedTool 
      ? [{ value: 'update', label: 'Uppdatera' }] 
      : [{ value: 'create', label: 'Skapa ny' }]),
    { value: 'link', label: 'Länka befintlig' },
    { value: 'ignore', label: 'Ignorera' },
  ];

  return (
    <div className="space-y-2">
      {filtered.map(({ row, idx }) => {
        const emptyFields = row.action !== 'ignore' 
          ? allFields.filter(f => !row[f] || row[f] === '' || row[f] === 0)
          : [];
        
        return (
          <div key={idx}>
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${row.matchedTool ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <div className="h-11 w-11 flex-shrink-0 flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={selectedRows.has(idx)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedRows);
                    if (e.target.checked) newSelected.add(idx);
                    else newSelected.delete(idx);
                    setSelectedRows(newSelected);
                  }}
                  className="w-5 h-5 rounded cursor-pointer accent-blue-600"
                />
              </div>
              <div className="w-28 flex-shrink-0">
                <select
                  value={row.action || 'create'}
                  onChange={(e) => {
                    const newRows = [...previewRows];
                    newRows[idx].action = e.target.value;
                    if (e.target.value === 'link') {
                      setLinkSearchIdx(idx);
                      setLinkSearchQuery('');
                    }
                    setPreviewRows(newRows);
                  }}
                  className="h-11 border border-gray-300 rounded px-3 py-2 text-sm w-full bg-white"
                >
                  {row.matchedTool ? <option value="update">Uppdatera</option> : <option value="create">Skapa ny</option>}
                  <option value="link">Länka befintlig</option>
                  <option value="ignore">Ignorera</option>
                </select>
              </div>
              <span className="font-mono text-sm text-gray-600 flex-1">{row.barcode}</span>
              <span className="text-sm font-medium flex-1">{row.name}</span>
              <div className="w-20 flex-shrink-0">
                <span className="text-sm text-gray-500">{row.category}</span>
              </div>
              <button
                onClick={() => setExpandedRowIdx(expandedRowIdx === idx ? null : idx)}
                className="h-11 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium text-nowrap ml-2 rounded hover:bg-blue-50"
              >
                {expandedRowIdx === idx ? '▼' : '▶'} 
                {row.matchedTool && row.changes && Object.keys(row.changes).length > 0 
                  ? ` ${Object.keys(row.changes).length} änd.`
                  : !row.matchedTool && emptyFields.length > 0
                  ? ` ${emptyFields.length} tomma`
                  : ' Visa'}
              </button>
              <button
                onClick={() => setInfoModalIdx(idx)}
                className="h-11 w-11 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded ml-1"
              >
                <Info className="w-5 h-5" />
              </button>
              {row.matchedTool && (
                <button
                  onClick={() => {
                    setEditingRowIdx(idx);
                    setEditFormData({ ...row });
                  }}
                  className="h-11 px-3 py-2 text-sm text-green-600 hover:text-green-800 font-medium ml-1 rounded hover:bg-green-50"
                >
                  ✏️
                </button>
              )}
              <button
                onClick={() => {
                  const newRows = previewRows.filter((_, i) => i !== idx);
                  setPreviewRows(newRows);
                }}
                className="h-11 w-11 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-50 rounded ml-1"
                title="Ta bort denna rad"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {expandedRowIdx === idx && (
              <div className="bg-gray-50 border border-gray-200 border-t-0 rounded-b-lg p-4 space-y-2">
                {row.matchedTool && row.changes && Object.keys(row.changes).length > 0 ? (
                  Object.entries(row.changes).map(([field, change]) => (
                    <div key={field} className="text-sm">
                      <div className="font-semibold text-gray-700">{field}</div>
                      <div className="flex gap-4 mt-1">
                        <div>
                          <div className="text-xs text-gray-500">Innan:</div>
                          <div className="text-sm bg-red-50 text-red-800 px-2 py-1 rounded font-mono">{change.old}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Nytt:</div>
                          <div className="text-sm bg-green-50 text-green-800 px-2 py-1 rounded font-mono">{change.new}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : !row.matchedTool ? (
                  <div>
                    {emptyFields.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-gray-700">Tomma fält som kan fyllas i:</p>
                        {emptyFields.map(field => {
                          const fieldLabel = field === 'location_name' ? 'plats' : field === 'purchase_date' ? 'inköpsdatum' : field === 'purchase_price' ? 'inköpspris' : field;
                          const suggestions = field === 'category' 
                            ? availableCategories 
                            : field === 'status'
                            ? ['available', 'in_use', 'maintenance', 'missing', 'retired', 'sålda']
                            : field === 'condition'
                            ? ['new', 'good', 'fair', 'poor']
                            : field === 'location_name'
                            ? locations.map(l => l.name)
                            : [];

                          return (
                            <div key={field} className="text-sm">
                              <label className="block text-xs font-medium text-gray-600 mb-1">{fieldLabel}</label>
                              {suggestions.length > 0 ? (
                                <div className="space-y-1">
                                  <select
                                    value={row[field] || ''}
                                    onChange={(e) => {
                                      const newRows = [...previewRows];
                                      newRows[idx][field] = e.target.value;
                                      setPreviewRows(newRows);
                                    }}
                                    className="h-11 w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                                  >
                                    <option value="">- Välj {fieldLabel} -</option>
                                    {suggestions.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  {row[field] === '' && <p className="text-sm text-gray-500 italic">eller ange manuellt nedan</p>}
                                </div>
                              ) : null}
                              <input
                                type={field === 'purchase_price' ? 'number' : field === 'purchase_date' ? 'date' : 'text'}
                                value={row[field] || ''}
                                onChange={(e) => {
                                  const newRows = [...previewRows];
                                  newRows[idx][field] = e.target.value;
                                  setPreviewRows(newRows);
                                }}
                                placeholder={`Ange ${fieldLabel}`}
                                className="h-11 w-full border border-gray-300 rounded px-3 py-2 text-sm mt-1"
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Alla fält är ifyllda!</p>
                    )}
                  </div>
                ) : row.matchedTool ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Välj vilka fält som ska uppdateras:</p>
                    {allFields.map(field => {
                      const key = `${idx}-${field}`;
                      const isSelected = selectedUpdates[key] !== false && row.changes?.[field];
                      const hasChange = row.changes?.[field];
                      
                      if (!hasChange) return null;
                      
                      return (
                        <div key={field} className="flex items-start gap-3 p-2 border border-gray-200 rounded bg-white">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedUpdates(prev => ({
                                ...prev,
                                [key]: e.target.checked
                              }));
                            }}
                            className="mt-2 w-5 h-5 rounded border-gray-300 cursor-pointer accent-blue-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-xs text-gray-700 mb-1">{field}</div>
                            <div className="flex gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Innan: </span>
                                <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-mono">{row.changes[field].old}</span>
                              </div>
                              <span className="text-gray-400">→</span>
                              <div>
                                <span className="text-gray-500">Efter: </span>
                                <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-mono">{row.changes[field].new}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Ingen information att visa</p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {infoModalIdx !== null && previewRows && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Maskindata</h3>
              <button onClick={() => setInfoModalIdx(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {allFields.map(field => (
                  <div key={field} className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">{field}</div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                      {previewRows[infoModalIdx]?.[field] || '(tom)'}
                    </div>
                  </div>
                ))}
              </div>

              {previewRows[infoModalIdx]?.matchedTool && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Befintlig maskin (matchad)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {allFields.map(field => (
                      <div key={field} className="border border-gray-200 rounded-lg p-3 bg-yellow-50">
                        <div className="text-xs font-medium text-gray-500 uppercase mb-1">{field}</div>
                        <div className="text-sm font-medium text-gray-900 break-words">
                          {previewRows[infoModalIdx].matchedTool?.[field] || '(tom)'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {linkSearchIdx !== null && previewRows && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Länka befintlig maskin</h3>
              <button onClick={() => setLinkSearchIdx(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sök efter maskin</label>
                <input
                  type="text"
                  placeholder="Sök på namn, streckkod eller tillverkare..."
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value.toLowerCase())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tools
                  .filter(tool =>
                    (tool.name?.toLowerCase() || '').includes(linkSearchQuery) ||
                    (tool.barcode?.toLowerCase() || '').includes(linkSearchQuery) ||
                    (tool.manufacturer?.toLowerCase() || '').includes(linkSearchQuery)
                  )
                  .map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => {
                        const newRows = [...previewRows];
                        newRows[linkSearchIdx] = {
                          ...newRows[linkSearchIdx],
                          matchedTool: tool,
                          action: 'update',
                        };
                        setPreviewRows(newRows);
                        setLinkSearchIdx(null);
                        setLinkSearchQuery('');
                      }}
                      className="w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-900">{tool.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {tool.barcode && <span>Streckkod: {tool.barcode} • </span>}
                        {tool.manufacturer && <span>Tillverkare: {tool.manufacturer}</span>}
                      </div>
                    </button>
                  ))}
                {linkSearchQuery && tools.filter(tool =>
                  (tool.name?.toLowerCase() || '').includes(linkSearchQuery) ||
                  (tool.barcode?.toLowerCase() || '').includes(linkSearchQuery) ||
                  (tool.manufacturer?.toLowerCase() || '').includes(linkSearchQuery)
                ).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Ingen maskin hittad</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}