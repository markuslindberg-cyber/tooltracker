import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, FileDown, Loader2, CheckCircle2, AlertCircle, X, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import UttagImportPreviewTable from '@/components/lokalvard/UttagImportPreviewTable';

export default function LokalvardUttagImport() {
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [results, setResults] = useState(null);
  const [importLogs, setImportLogs] = useState([]);
  const [logHistory, setLogHistory] = useState([]);
  const [expandedLogIdx, setExpandedLogIdx] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('uttagImportLogHistory');
    if (saved) setLogHistory(JSON.parse(saved));
  }, []);

  const { data: artiklar = [] } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => []),
  });

  const { data: personal = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(null, 10000).catch(() => []),
  });

  const { data: kunder = [] } = useQuery({
    queryKey: ['kunder'],
    queryFn: () => base44.entities.Kund.list(null, 10000).catch(() => []),
  });

  const handleDownloadTemplate = () => {
    const headers = ['datum', 'personal', 'kund', 'ordernummer', 'streckkod', 'antal', 'pris'];
    const exampleRow = ['2026-04-15', 'Anna Andersson', 'Företag AB', 'ORD-001', '71617', '5', '49.99'];
    const csv = [headers, exampleRow].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lokalvard_uttag_mall.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const parseCSV = (text) => {
    const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    const splitLine = (line, sep) => {
      const fields = [];
      let i = 0;
      while (i <= line.length) {
        if (line[i] === '"') {
          let field = '';
          i++;
          while (i < line.length) {
            if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
            else if (line[i] === '"') { i++; break; }
            else { field += line[i++]; }
          }
          fields.push(field.trim());
          if (line[i] === sep) i++;
        } else {
          const end = line.indexOf(sep, i);
          if (end === -1) { fields.push(line.slice(i).trim()); break; }
          else { fields.push(line.slice(i, end).trim()); i = end + 1; }
        }
      }
      return fields;
    };

    const headerLine = lines[0];
    const candidates = [';', ',', '\t'];
    const sep = candidates.reduce((best, c) =>
      splitLine(headerLine, c).length > splitLine(headerLine, best).length ? c : best
    , candidates[0]);

    const headers = splitLine(headerLine, sep).map(h => h.toLowerCase().trim()
      .replace('å', 'a').replace('ä', 'a').replace('ö', 'o'));

    return lines.slice(1).map(line => {
      const cols = splitLine(line, sep);
      const row = {};
      headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
      return row;
    }).filter(row => (row.datum || '').trim() && (row.streckkod || '').trim());
  };

  const matchRows = (rawRows) => {
    return rawRows.map(r => {
      const streckkod = String(r.streckkod || '').trim();
      const personalNamn = String(r.personal || '').trim();
      const kundNamn = String(r.kund || '').trim();

      const matchedArtikel = artiklar.find(a =>
        a.streckkod === streckkod || a.old_streckkod === streckkod || a.artikelnummer === streckkod
      );

      const matchedPersonal = personal.find(p =>
        p.name?.toLowerCase() === personalNamn.toLowerCase()
      );

      const matchedKund = kunder.find(k =>
        k.namn?.toLowerCase() === kundNamn.toLowerCase()
      );

      return {
        datum: String(r.datum || '').trim(),
        personal_namn: personalNamn,
        kund_namn: kundNamn,
        streckkod,
        antal: parseFloat(r.antal) || 0,
        pris: parseFloat(r.pris) || 0,
        ordernummer: r.ordernummer || '',
        matchedArtikel: matchedArtikel || null,
        matchedPersonal: matchedPersonal || null,
        matchedKund: matchedKund || null,
      };
    }).filter(r => r.datum && r.streckkod && r.antal > 0);
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
              datum: { type: 'string' },
              personal: { type: 'string' },
              kund: { type: 'string' },
              ordernummer: { type: 'string' },
              streckkod: { type: 'string' },
              antal: { type: 'number' },
              pris: { type: 'number' },
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
      if (rows.length === 0) { toast.error('Filen verkar vara tom eller har fel format.'); return; }
      if (matched.length === 0) { toast.error(`Inga giltiga rader hittades. ${rows.length} rader lästes men filtrerades bort.`); return; }
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
    const rowsToSend = previewRows.filter(r => r.action !== 'ignore');
    if (rowsToSend.length === 0) { toast.error('Inga rader redo att importera.'); return; }
    setPreviewRows(null);
    setImporting(true);
    setImportLogs([`Startar import av ${rowsToSend.length} rader från ${previewFileName}...`]);
    try {
      const res = await base44.functions.invoke('processUttagImport', { rows: rowsToSend });
      const { results: processedResults } = res.data;
      setResults(processedResults);
      const successCount = processedResults.filter(r => r.status === 'success').length;
      const skippedCount = processedResults.filter(r => r.status === 'skipped').length;
      const errorCount = processedResults.filter(r => r.status === 'error').length;
      setImportLogs([`Import slutförd!`, `✓ ${successCount} uttag tillagda`, `⊘ ${skippedCount} hoppade över`, `✕ ${errorCount} fel`]);

      const timestamp = new Date().toLocaleString('sv-SE');
      const historyEntry = { timestamp, fileName: previewFileName, successCount, skippedCount, errorCount, totalRows: rowsToSend.length, rows: processedResults };
      const currentHistory = JSON.parse(localStorage.getItem('uttagImportLogHistory') || '[]');
      currentHistory.unshift(historyEntry);
      localStorage.setItem('uttagImportLogHistory', JSON.stringify(currentHistory.slice(0, 50)));
      setLogHistory(currentHistory.slice(0, 50));
    } catch (err) {
      toast.error('Import misslyckades: ' + (err.message || 'Okänt fel'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">📊 Importera uttag</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h2 className="font-semibold text-blue-900">Instruktioner:</h2>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Ladda ned mallen och fyll i: datum (YYYY-MM-DD), personal, kund, streckkod, antal och pris</li>
          <li>Systemet matchar automatiskt personal, kunder och streckkoder mot befintliga poster</li>
          <li>Rader som inte matchas importeras ändå — du kan justera manuellt i förhandsgranskningen</li>
          <li>Antal och pris kan redigeras direkt i förhandsgranskningen</li>
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
            <span className="text-sm text-green-700">Importerar uttag till databasen...</span>
          </div>
        )}
      </div>

      {previewRows && (
        <UttagImportPreviewTable
          rows={previewRows}
          personal={personal}
          kunder={kunder}
          onRowsChange={setPreviewRows}
          onConfirm={handleConfirmImport}
          onCancel={() => setPreviewRows(null)}
        />
      )}

      {importLogs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="bg-white rounded p-3 font-mono text-sm space-y-1 max-h-40 overflow-y-auto">
            {importLogs.map((log, idx) => <div key={idx} className="text-gray-700">{log}</div>)}
          </div>
        </div>
      )}

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
                  <th className="px-4 py-2 text-left font-semibold">Datum</th>
                  <th className="px-4 py-2 text-left font-semibold">Personal</th>
                  <th className="px-4 py-2 text-left font-semibold">Kund</th>
                  <th className="px-4 py-2 text-left font-semibold">Streckkod</th>
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
                    <td className="px-4 py-2 text-xs">{row.datum}</td>
                    <td className="px-4 py-2 text-xs">{row.personal_namn || '–'}</td>
                    <td className="px-4 py-2 text-xs">{row.kund_namn || '–'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.streckkod}</td>
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

      {logHistory.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Importhistorik</h2>
            <button
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              onClick={() => { localStorage.removeItem('uttagImportLogHistory'); setLogHistory([]); }}
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
                {expandedLogIdx === idx && entry.rows && (
                  <div className="border-t bg-gray-50 px-4 py-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="pb-2 text-left font-semibold">Status</th>
                          <th className="pb-2 text-left font-semibold">Datum</th>
                          <th className="pb-2 text-left font-semibold">Personal</th>
                          <th className="pb-2 text-left font-semibold">Kund</th>
                          <th className="pb-2 text-left font-semibold">Streckkod</th>
                          <th className="pb-2 text-right font-semibold">Antal</th>
                          <th className="pb-2 text-right font-semibold">Pris</th>
                          <th className="pb-2 text-left font-semibold">Meddelande</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {entry.rows.map((row, rIdx) => (
                          <tr key={rIdx} className={row.status === 'success' ? 'text-green-800' : row.status === 'skipped' ? 'text-yellow-700' : 'text-red-700'}>
                            <td className="py-1.5 pr-3 font-medium">
                              {row.status === 'success' && '✓'}{row.status === 'skipped' && '⊘'}{row.status === 'error' && '✕'} {row.status}
                            </td>
                            <td className="py-1.5 pr-3 text-gray-600">{row.datum}</td>
                            <td className="py-1.5 pr-3 text-gray-800">{row.personal_namn || '–'}</td>
                            <td className="py-1.5 pr-3 text-gray-800">{row.kund_namn || '–'}</td>
                            <td className="py-1.5 pr-3 font-mono text-gray-600">{row.streckkod}</td>
                            <td className="py-1.5 pr-3 text-right text-gray-800">{row.antal}</td>
                            <td className="py-1.5 pr-3 text-right text-gray-800">{row.pris?.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1.5 text-gray-500">{row.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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