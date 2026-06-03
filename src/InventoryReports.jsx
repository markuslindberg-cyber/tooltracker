import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, CheckCircle2, AlertCircle, X, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ImportHistorik() {
  const [logHistory, setLogHistory] = useState([]);
  const [expandedLogIdx, setExpandedLogIdx] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('importLogHistory');
    if (saved) setLogHistory(JSON.parse(saved));
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('importLogHistory');
    setLogHistory([]);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📋 Importhistorik</h1>
        {logHistory.length > 0 && (
          <button
            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
            onClick={clearHistory}
          >
            <Trash2 className="w-4 h-4" /> Rensa all historik
          </button>
        )}
      </div>

      {logHistory.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Ingen importhistorik hittad.</p>
          <p className="text-sm text-gray-400 mt-1">Historik sparas automatiskt efter varje genomförd import.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y overflow-hidden">
          {logHistory.map((entry, idx) => (
            <div key={idx}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                onClick={() => setExpandedLogIdx(expandedLogIdx === idx ? null : idx)}
              >
                {expandedLogIdx === idx
                  ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <span className="font-mono text-xs text-gray-500 w-36 flex-shrink-0">{entry.timestamp}</span>
                <span className="text-sm text-gray-800 flex-1 truncate">{entry.fileName}</span>
                <div className="flex gap-3 text-xs flex-shrink-0">
                  <span className="text-green-600 font-semibold">✓ {entry.successCount}</span>
                  <span className="text-yellow-600 font-semibold">⊘ {entry.skippedCount}</span>
                  <span className="text-red-600 font-semibold">✕ {entry.errorCount}</span>
                  <span className="text-gray-400">/ {entry.totalRows} rader</span>
                </div>
              </button>
              {expandedLogIdx === idx && (
                <div className="border-t bg-gray-50 px-4 py-3 overflow-x-auto">
                  {!entry.rows ? (
                    <p className="text-xs text-gray-400 italic py-2">Detaljerad logg ej tillgänglig för äldre importer.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="pb-2 text-left font-semibold">Status</th>
                          <th className="pb-2 text-left font-semibold">Streckkod</th>
                          <th className="pb-2 text-left font-semibold">Artikel</th>
                          <th className="pb-2 text-left font-semibold">Datum</th>
                          <th className="pb-2 text-right font-semibold">Antal</th>
                          <th className="pb-2 text-right font-semibold">Pris</th>
                          <th className="pb-2 text-left font-semibold">Meddelande</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {entry.rows.map((row, rIdx) => (
                          <tr key={rIdx} className={
                            row.status === 'success' ? 'text-green-800' :
                            row.status === 'skipped' ? 'text-yellow-700' : 'text-red-700'
                          }>
                            <td className="py-1.5 pr-3">
                              <div className="flex items-center gap-1">
                                {row.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                                {row.status === 'skipped' && <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />}
                                {row.status === 'error' && <X className="w-3.5 h-3.5 text-red-600" />}
                                <span className="font-medium">{row.status}</span>
                              </div>
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-gray-600">{row.streckkod}</td>
                            <td className="py-1.5 pr-3 text-gray-800">{row.artikelNamn || '–'}</td>
                            <td className="py-1.5 pr-3 text-gray-600">{row.datum}</td>
                            <td className="py-1.5 pr-3 text-right text-gray-800">{row.antal}</td>
                            <td className="py-1.5 pr-3 text-right text-gray-800">
                              {row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1.5 text-gray-500">{row.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}