import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, FileDown, Loader2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import ImportPreviewTable from '@/components/lokalvard/ImportPreviewTable';

export default function LokalvardInköpImport() {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState(null); // null = ej laddat
  const [previewFileName, setPreviewFileName] = useState('');
  const [results, setResults] = useState(null);
  const [importLogs, setImportLogs] = useState([]);
  const [logHistory, setLogHistory] = useState([]);
  const [expandedLogIdx, setExpandedLogIdx] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('importLogHistory');
    if (saved) setLogHistory(JSON.parse(saved));
  }, []);

  const { data: artiklar = [] } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => []),
  });

  const handleDownloadTemplate = () => {
    const headers = ['streckkod', 'benamning', 'artikelnummer', 'datum', 'antal', 'pris'];
    const exampleRow = ['5701092107145', 'Handduk vit 50x70', 'ART-001', '2026-04-15', '50', '99.99'];
    const csv = [headers, exampleRow, ...Array(19).fill(Array(6).fill(''))].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lokalvard_inkop_mall.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCSV = (text) => {
    // Ta bort BOM och normalisera radbrytningar
    const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Splittar en rad på given separator, hanterar RFC-4180 citerade fält
    const splitLine = (line, sep) => {
      const fields = [];
      let i = 0;
      while (i <= line.length) {
        if (line[i] === '"') {
          // Citerat fält
          let field = '';
          i++; // hoppa över öppningscitattecken
          while (i < line.length) {
            if (line[i] === '"' && line[i + 1] === '"') {
              field += '"'; i += 2; // escaped quote
            } else if (line[i] === '"') {
              i++; break; // stängningscitattecken
            } else {
              field += line[i++];
            }
          }
          fields.push(field.trim());
          // hoppa över separator om den finns
          if (line[i] === sep) i++;
        } else {
          // Ociterat fält — läs till nästa separator
          const end = line.indexOf(sep, i);
          if (end === -1) {
            fields.push(line.slice(i).trim());
            break;
          } else {
            fields.push(line.slice(i, end).trim());
            i = end + 1;
          }
        }
      }
      return fields;
    };

    // Detektera separator: välj den som ger flest fält i rubrikraden
    const headerLine = lines[0];
    const candidates = [';', ',', '\t'];
    const sep = candidates.reduce((best, c) =>
      splitLine(headerLine, c).length > splitLine(headerLine, best).length ? c : best
    , candidates[0]);

    const headers = splitLine(headerLine, sep).map(h => h.toLowerCase().trim());
    console.log('Detected sep:', JSON.stringify(sep), '| Headers:', headers);

    return lines.slice(1).map(line => {
      const cols = splitLine(line, sep);
      const row = {};
      headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
      return row;
    }).filter(row => (row.streckkod || '').trim() || (row.datum || '').trim());
  };

  // Auto-match rows against existing articles
  const matchRows = (rawRows) => {
    return rawRows.map(r => {
      const streckkod = String(r.streckkod || '').trim();
      const matched = artiklar.find(a =>
        a.streckkod === streckkod || a.old_streckkod === streckkod
      );
      return {
        streckkod,
        benamning: r.benamning || '',
        artikelnummer: r.artikelnummer || '',
        datum: String(r.datum || '').trim(),
        antal: parseFloat(r.antal) || 0,
        pris: parseFloat(r.pris) || 0,
        matchedArtikel: matched || null,
        artikelNamn: matched?.benamning || r.benamning || '',
        action: matched ? 'link' : undefined,
      };
    }).filter(r => r.streckkod && r.datum && r.antal > 0);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let rows = [];
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        rows = parseCSV(text);
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              streckkod: { type: 'string' },
              benamning: { type: 'string' },
              artikelnummer: { type: 'string' },
              datum: { type: 'string', description: 'Date YYYY-MM-DD' },
              antal: { type: 'number' },
              pris: { type: 'number' }
            }
          }
        });
        if (result.status === 'success' && Array.isArray(result.output)) {
          rows = result.output;
        } else {
          toast.error('Importfel: ' + (result.details || 'Okänt fel'));
          return;
        }
      }

      const matched = matchRows(rows);
      console.log('Parsed rows:', rows);
      console.log('Matched rows:', matched);
      if (rows.length === 0) {
        toast.error('Filen verkar vara tom eller har fel format.');
        return;
      }
      if (matched.length === 0) {
        toast.error(`Inga giltiga rader hittades. ${rows.length} rader lästes men filtrerades bort (saknar streckkod, datum eller antal > 0).`);
        return;
      }
      setPreviewRows(matched);
      setPreviewFileName(file.name);
    } catch (err) {
      toast.error('Importfel: ' + (err.message || 'Okänt fel'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!previewRows) return;
    const rowsToSend = previewRows.filter(r => r.action !== 'ignore' && (r.matchedArtikel || r.action === 'create'));
    if (rowsToSend.length === 0) {
      toast.error('Inga rader redo att importera.');
      return;
    }
    setPreviewRows(null);
    setImporting(true);
    setImportLogs([`Startar import av ${rowsToSend.length} rader från ${previewFileName}...`]);
    try {
      const res = await base44.functions.invoke('processLokalvardInkopImport', { rows: rowsToSend });
      const { results: processedResults } = res.data;
      setResults(processedResults);
      const successCount = processedResults.filter(r => r.status === 'success').length;
      const skippedCount = processedResults.filter(r => r.status === 'skipped').length;
      const errorCount = processedResults.filter(r => r.status === 'error').length;
      setImportLogs([
        `Import slutförd!`,
        `✓ ${successCount} inköp tillagda`,
        `⊘ ${skippedCount} hoppade över`,
        `✕ ${errorCount} fel`
      ]);
      const timestamp = new Date().toLocaleString('sv-SE');
      const historyEntry = { timestamp, fileName: previewFileName, successCount, skippedCount, errorCount, totalRows: rowsToSend.length, rows: processedResults };
      const currentHistory = JSON.parse(localStorage.getItem('importLogHistory') || '[]');
      currentHistory.unshift(historyEntry);
      localStorage.setItem('importLogHistory', JSON.stringify(currentHistory.slice(0, 50)));
      setLogHistory(currentHistory.slice(0, 50));
    } catch (err) {
      toast.error('Import misslyckades: ' + (err.message || 'Okänt fel'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">📥 Importera inköp</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-blue-900">Instruktioner:</h2>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Ladda ned mallen och fyll i: streckkod, benamning (valfritt), datum (YYYY-MM-DD), antal och pris</li>
          <li>Systemet matchar automatiskt streckkoder mot befintliga artiklar (inkl. gamla streckkoder)</li>
          <li>Rader utan matchning kan kopplas till befintlig artikel, skapa ny, eller ignoreras</li>
          <li>Antal och pris kan justeras direkt i förhandsgranskningen (klicka på värdet)</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="hidden lg:flex gap-3">
          <Button onClick={handleDownloadTemplate} className="bg-purple-600 hover:bg-purple-700">
            <FileDown className="w-4 h-4 mr-2" /> Ladda ned mall
          </Button>
          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors ${(uploading || importing || !!previewRows) ? 'opacity-50 pointer-events-none' : ''}`}>
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Upload className="w-4 h-4" />
            {uploading ? 'Läser fil...' : 'Välj Excel/CSV-fil'}
            <input type="file" accept=".csv,.xlsx,.xls" onClick={e => { e.target.value = ''; }} onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
        {uploading && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700">Läser och tolkar filen...</span>
          </div>
        )}
        {importing && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-green-600" />
            <span className="text-sm text-green-700">Importerar inköp till databasen...</span>
          </div>
        )}
      </div>

      {/* Förhandsgranskning med interaktiv tabell */}
      {previewRows && (
        <ImportPreviewTable
          rows={previewRows}
          artiklar={artiklar}
          onRowsChange={setPreviewRows}
          onConfirm={handleConfirmImport}
          onCancel={() => setPreviewRows(null)}
        />
      )}

      {/* Importloggar */}
      {importLogs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="bg-white rounded p-3 font-mono text-sm space-y-1 max-h-40 overflow-y-auto">
            {importLogs.map((log, idx) => (
              <div key={idx} className="text-gray-700">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Importresultat */}
      {results && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Importresultat</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">{results.filter(r => r.status === 'success').length}</div>
              <div className="text-sm text-green-600">Tillagda</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{results.filter(r => r.status === 'skipped').length}</div>
              <div className="text-sm text-yellow-600">Hoppade över</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{results.filter(r => r.status === 'error').length}</div>
              <div className="text-sm text-red-600">Fel</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                  <th className="px-4 py-2 text-left font-semibold">Streckkod</th>
                  <th className="px-4 py-2 text-left font-semibold">Artikel</th>
                  <th className="px-4 py-2 text-left font-semibold">Datum</th>
                  <th className="px-4 py-2 text-right font-semibold">Antal</th>
                  <th className="px-4 py-2 text-right font-semibold">Pris</th>
                  <th className="px-4 py-2 text-left font-semibold">Meddelande</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((row, idx) => (
                  <tr key={idx} className={row.status === 'success' ? 'bg-green-50' : row.status === 'skipped' ? 'bg-yellow-50' : 'bg-red-50'}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        {row.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {row.status === 'skipped' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                        {row.status === 'error' && <X className="w-4 h-4 text-red-600" />}
                        <span className="text-xs font-medium capitalize">{row.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{row.streckkod}</td>
                    <td className="px-4 py-2 text-xs">{row.artikelNamn || '–'}</td>
                    <td className="px-4 py-2 text-xs">{row.datum}</td>
                    <td className="px-4 py-2 text-right text-xs">{row.antal}</td>
                    <td className="px-4 py-2 text-right text-xs">{row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button onClick={() => setResults(null)} variant="outline" className="w-full">Rensa resultat</Button>
        </div>
      )}

      {/* Importhistorik */}
      {logHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Importhistorik</h2>
            <button
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              onClick={() => { localStorage.removeItem('importLogHistory'); setLogHistory([]); }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Rensa historik
            </button>
          </div>
          <div className="divide-y border rounded-lg overflow-hidden">
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
                  {!entry.rows && (
                    <p className="text-xs text-gray-400 italic py-2">Detaljerad logg ej tillgänglig för äldre importer.</p>
                  )}
                  {entry.rows && (
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
                          <tr key={rIdx} className={row.status === 'success' ? 'text-green-800' : row.status === 'skipped' ? 'text-yellow-700' : 'text-red-700'}>
                            <td className="py-1.5 pr-3 font-medium">
                              {row.status === 'success' && '✓'}
                              {row.status === 'skipped' && '⊘'}
                              {row.status === 'error' && '✕'}
                              {' '}{row.status}
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-gray-600">{row.streckkod}</td>
                            <td className="py-1.5 pr-3 text-gray-800">{row.artikelNamn || '–'}</td>
                            <td className="py-1.5 pr-3 text-gray-600">{row.datum}</td>
                            <td className="py-1.5 pr-3 text-right text-gray-800">{row.antal}</td>
                            <td className="py-1.5 pr-3 text-right text-gray-800">{row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
        </div>
      )}
    </div>
  );
}