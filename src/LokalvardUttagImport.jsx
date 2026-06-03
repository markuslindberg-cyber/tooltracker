import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { base44 } from '@/api/base44Client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Edit2, Upload, FileDown, ArrowUp, ArrowDown, AlertCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddArtikelDialog from '@/components/dialogs/AddArtikelDialog';
import { calculateUttagMatching } from '@/lib/calculateUttagUtils';

export default function LokalvardLager() {
   useScrollRestore();
   const navigate = useNavigate();
   const queryClient = useQueryClient();

   const { data: artiklar = [], isLoading: artiklarLoading } = useQuery({
     queryKey: ['lokalvardsArtiklar'],
     queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 10000).then(r => r.filter(a => !a.is_deleted)).catch(() => []),
     staleTime: 60000,
   });

   const { containerRef, isPulling, pullDistance, PULL_THRESHOLD } = usePullToRefresh(
     () => queryClient.invalidateQueries(['lokalvardsArtiklar']),
     artiklarLoading
   );
   const fileInputRef = useRef(null);
   const [search, setSearch] = useState('');
   const [sortBy, setSortBy] = useState('benamning');
   const [sortOrder, setSortOrder] = useState('asc');
   const [editingId, setEditingId] = useState(null);
   const [editForm, setEditForm] = useState({});
   const [uploading, setUploading] = useState(false);
   const [filterTyp, setFilterTyp] = useState('aktiva');
   const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: uttag = [] } = useQuery({
    queryKey: ['uttag'],
    queryFn: async () => {
      const data = await base44.entities.Uttag.list('-created_date', 100000).catch(() => []);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000,
  });

  const uttagLoading = false;

  const { data: inköp = [] } = useQuery({
    queryKey: ['lokalvardInkop'],
    queryFn: () => base44.entities.LokalvardInköp?.list ? base44.entities.LokalvardInköp.list() : Promise.resolve([]),
    staleTime: 60000,
  });

  const calculateUttag = (aggregatedArtikel) => {
    // Räkna uttag direkt för denna grupp
    if (!Array.isArray(uttag)) return 0;
    return uttag.reduce((sum, u) => {
      const matchingItems = u.artiklar?.filter(item => {
        // Match om benamning är exakt samma
        if (item.benamning && item.benamning.toLowerCase() === aggregatedArtikel.benamning.toLowerCase()) return true;
        // Match om benamning är streckkoden
        if (item.benamning === aggregatedArtikel.streckkod || item.benamning === aggregatedArtikel.old_streckkod) return true;
        // Match om artikel_id är någon av artikel-IDs i gruppen
        if (aggregatedArtikel.all_artikel_ids.includes(item.artikel_id)) return true;
        // Match om artikel_id är streckkoden
        if (item.artikel_id === aggregatedArtikel.streckkod || item.artikel_id === aggregatedArtikel.old_streckkod) return true;
        return false;
      }) || [];
      return sum + matchingItems.reduce((s, i) => s + (i.antal || 0), 0);
    }, 0);
  };

  const getInköptForArticle = (aggregatedArtikel) => {
    // Summa inköp för alla relaterade artikel-IDs i gruppen
    const matchingInköp = inköp.filter(i => aggregatedArtikel.all_artikel_ids.includes(i.artikel_id));
    return matchingInköp.reduce((sum, i) => sum + i.antal, 0);
  };

  const calculateSaldo = (aggregatedArtikel) => {
    const totalInköpt = getInköptForArticle(aggregatedArtikel);
    const inköptToUse = totalInköpt > 0 ? totalInköpt : aggregatedArtikel.total_antal_inkopta;
    return inköptToUse - calculateUttag(aggregatedArtikel);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LokalvardsArtikel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardsArtiklar']);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LokalvardsArtikel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['lokalvardsArtiklar']);
    },
  });

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const groupedByStreckkod = {};
  artiklar.forEach(artikel => {
    const streckkod = artikel.streckkod;
    if (!streckkod) return;

    if (!groupedByStreckkod[streckkod]) {
      groupedByStreckkod[streckkod] = {
        id: artikel.id,
        benamning: artikel.benamning,
        artikelnummer: artikel.artikelnummer,
        streckkod: artikel.streckkod,
        pris: artikel.pris,
        inkopsdatum: artikel.inkopsdatum,
        lagertroskelvarde: artikel.lagertroskelvarde,
        utgaende: artikel.utgaende,
        subcategory: artikel.subcategory,
        total_antal_inkopta: 0,
        total_current_quantity: 0,
        all_artikel_ids: [],
        huvudartikel_antal_inkopta: artikel.antal_inkopta,
      };
    }

    const currentGroup = groupedByStreckkod[streckkod];

    if (new Date(artikel.inkopsdatum) > new Date(currentGroup.inkopsdatum)) {
      Object.assign(currentGroup, {
        id: artikel.id,
        benamning: artikel.benamning,
        artikelnummer: artikel.artikelnummer,
        pris: artikel.pris,
        inkopsdatum: artikel.inkopsdatum,
        lagertroskelvarde: artikel.lagertroskelvarde,
        utgaende: artikel.utgaende,
        subcategory: artikel.subcategory,
        old_streckkod: artikel.old_streckkod,
      });
    } else if (!currentGroup.old_streckkod && artikel.old_streckkod) {
      currentGroup.old_streckkod = artikel.old_streckkod;
    }

    currentGroup.total_antal_inkopta += artikel.antal_inkopta;
    currentGroup.total_current_quantity += artikel.current_quantity;
    currentGroup.all_artikel_ids.push(artikel.id);
  });

  let processedArtiklar = Object.values(groupedByStreckkod);

  const filteredProcessedArtiklar = processedArtiklar.filter(a => {
    const searchLower = search.toLowerCase();
    const matchSearch = a.benamning.toLowerCase().includes(searchLower) || a.streckkod?.includes(search) || a.old_streckkod?.includes(search);
    if (!matchSearch) return false;
    
    const saldoForGroup = calculateSaldo(a);
    if (filterTyp === 'aktiva') return saldoForGroup > 0;
    if (filterTyp === 'lowStock') return saldoForGroup > 0 && saldoForGroup < (a.lagertroskelvarde || 10);
    if (filterTyp === 'empty') return saldoForGroup === 0;
    if (filterTyp === 'utgaende') return !!a.utgaende;
    if (filterTyp === 'utanPris') return !a.pris || a.pris < 1;
    if (filterTyp === 'alla') return true;
    return true;
  });

  const sorted = filteredProcessedArtiklar.sort((a, b) => {
    let aVal, bVal;
    
    // Hantera beräknade värden
    if (sortBy === 'saldo') {
      aVal = calculateSaldo(a);
      bVal = calculateSaldo(b);
    } else if (sortBy === 'uttag') {
      aVal = calculateUttag(a);
      bVal = calculateUttag(b);
    } else {
      aVal = a[sortBy];
      bVal = b[sortBy];
    }
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDownloadTemplate = () => {
    const headers = ['benamning', 'artikelnummer', 'streckkod', 'pris', 'inkopsdatum', 'antal_inkopta', 'lagertroskelvarde', 'subcategory', 'current_quantity', 'utgaende'];
    const infoRows = [
      ['=== IMPORTMALL FÖR LOKALVÅRDSARTIKLAR ===', '', '', '', '', '', '', '', '', ''],
      headers,
      ['Rengöringsduk', 'ART-001', '1234567890', '49.99', '2026-01-01', '100', '20', 'Textilier', '45', 'false'],
    ];
    const csv = [
      ...infoRows.map(r => r.map(c => `"${c}"`).join(',')),
      ...Array(19).fill(Array(10).fill('').map(() => ''))
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lokalvard_lager_mall.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            benamning: { type: 'string' },
            artikelnummer: { type: 'string' },
            streckkod: { type: 'string' },
            pris: { type: 'number' },
            inkopsdatum: { type: 'string' },
            antal_inkopta: { type: 'number' },
            lagertroskelvarde: { type: 'number' },
            subcategory: { type: 'string' },
            current_quantity: { type: 'number' },
            utgaende: { type: 'boolean' }
          }
        }
      });
      if (result.status === 'success' && Array.isArray(result.output)) {
        const valid = result.output.filter(r => r.benamning && r.artikelnummer && r.pris && r.antal_inkopta);
        if (valid.length > 0) {
          await base44.entities.LokalvardsArtikel.bulkCreate(valid);
          queryClient.invalidateQueries(['lokalvardsArtiklar']);
          alert(`${valid.length} artiklar importerade!`);
        } else {
          alert('Inga giltiga rader hittades.');
        }
      } else {
        alert('Importfel: ' + (result.details || 'Okänt fel'));
      }
    } catch (err) {
      alert('Importfel: ' + (err.message || 'Okänt fel'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleEditClick = (artikel) => {
    setEditingId(artikel.id);
    setEditForm({
      benamning: artikel.benamning,
      pris: artikel.pris,
      current_quantity: artikel.current_quantity,
      lagertroskelvarde: artikel.lagertroskelvarde,
      utgaende: !!artikel.utgaende,
      inkopsdatum: artikel.inkopsdatum,
    });
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      id: editingId,
      data: {
        benamning: editForm.benamning,
        pris: parseFloat(editForm.pris),
        current_quantity: parseInt(editForm.current_quantity),
        lagertroskelvarde: parseInt(editForm.lagertroskelvarde),
        utgaende: editForm.utgaende,
        inkopsdatum: editForm.inkopsdatum,
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const tomma = sorted.filter(a => calculateSaldo(a) === 0).length;
  const lågtSaldo = sorted.filter(a => {
    const saldo = calculateSaldo(a);
    return saldo > 0 && saldo < (a.lagertroskelvarde || 10);
  }).length;
  const utanPris = processedArtiklar.filter(a => !a.pris || a.pris < 1).length;
  const totaltVärde = processedArtiklar.reduce((sum, a) => sum + (calculateSaldo(a) * a.pris), 0);
  const filteredTotal = sorted.reduce((sum, a) => sum + (calculateSaldo(a) * a.pris), 0);

  if (artiklarLoading || uttagLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div ref={containerRef} className="max-w-7xl mx-auto p-4 space-y-4 overflow-y-auto min-h-screen" style={{ transform: isPulling ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)', transition: isPulling ? 'none' : 'transform 0.3s ease-out' }}>
      {pullDistance > 0 && (
        <div className="fixed top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none z-50">
          <div style={{ opacity: Math.min(pullDistance / PULL_THRESHOLD, 1) }}>
            {isPulling ? (
              <Loader2 className="w-5 h-5 text-[#8B1E1E] animate-spin" />
            ) : (
              <div className="text-xs text-gray-500">{pullDistance >= PULL_THRESHOLD ? 'Släpp för att uppdatera' : 'Dra för att uppdatera'}</div>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">📦 Lager – Lokalvård</h1>
        <div className="flex items-center gap-2">
          {window.location.hostname.includes('base44.app') && <>
            <Button size="sm" onClick={handleDownloadTemplate} className="hidden lg:flex bg-purple-600 hover:bg-purple-700">
              <FileDown className="w-4 h-4 mr-1" /> Mall
            </Button>
            <Button size="sm" onClick={handleImportClick} disabled={uploading} className="hidden lg:flex bg-green-600 hover:bg-green-700">
              <Upload className="w-4 h-4 mr-1" /> Importera
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
          </>}
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            <Plus className="w-4 h-4 mr-1" /> Ny artikel
          </Button>
        </div>
      </div>

      {/* Sökruta */}
      <input
        type="text"
        placeholder="Sök artikel eller streckkod..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400"
      />

      {/* Totalt lagervärde */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm text-blue-700 font-medium">Totalt lagervärde ({sorted.length} artiklar)</span>
        <span className="text-xl font-bold text-blue-900">{filteredTotal.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
      </div>

      {/* Filterflikar */}
       <div className="flex gap-1 flex-wrap items-center">
         {[
           { key: 'aktiva', label: 'Aktiva & utgående m/ saldo' },
           { key: 'alla', label: 'Alla artiklar' },
           { key: 'empty', label: `Slut i lager (${tomma})` },
           { key: 'lowStock', label: `Lågt lager (${lågtSaldo})` },
           { key: 'utgaende', label: 'Utgående' },
           { key: 'utanPris', label: `Utan pris (${utanPris})` }
         ].map(({ key, label }) => (
           <button
             key={key}
             onClick={() => setFilterTyp(key)}
             className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
               filterTyp === key
                 ? 'bg-gray-800 text-white'
                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
             }`}
           >
             {label}
           </button>
         ))}
         {filterTyp !== 'aktiva' && (
           <Button 
             size="sm" 
             variant="outline" 
             onClick={() => setFilterTyp('aktiva')}
             className="gap-1 text-xs ml-auto"
           >
             <RotateCcw className="w-3 h-3" /> Rensa
           </Button>
         )}
       </div>

      {/* Status badges */}
      {(tomma > 0 || lågtSaldo > 0 || utanPris > 0) && (
        <div className="flex gap-2 flex-wrap">
          {tomma > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-200 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{tomma} artiklar slut</span>
            </div>
          )}
          {lågtSaldo > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg border border-yellow-200 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{lågtSaldo} lågt lager</span>
            </div>
          )}
          {utanPris > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg border border-orange-200 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{utanPris} utan pris</span>
            </div>
          )}
        </div>
      )}

      {/* Tabell - Desktop */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold cursor-pointer hover:bg-gray-100" onClick={() => handleSort('benamning')}>
                  <div className="flex items-center gap-1">Artikel {sortBy === 'benamning' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('streckkod')}>
                  <div className="flex items-center gap-1">Streckkod {sortBy === 'streckkod' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('pris')}>
                  <div className="flex items-center justify-end gap-1">Pris {sortBy === 'pris' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('total_antal_inkopta')}>
                  <div className="flex items-center justify-end gap-1">Inköpt {sortBy === 'total_antal_inkopta' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('uttag')}>
                  <div className="flex items-center justify-end gap-1">Uttag {sortBy === 'uttag' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('saldo')}>
                  <div className="flex items-center justify-end gap-1">Saldo {sortBy === 'saldo' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('lagertroskelvarde')}>
                  <div className="flex items-center justify-end gap-1">Tröskel {sortBy === 'lagertroskelvarde' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}</div>
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
                {sorted.map((artikel) => {
                   const saldo = calculateSaldo(artikel);
                   let saldoColor = 'text-gray-900';
                   let saldoBg = '';
                   if (saldo === 0) {
                     saldoColor = 'text-red-600 font-semibold';
                     saldoBg = 'bg-red-50';
                   } else if (saldo < (artikel.lagertroskelvarde || 10)) {
                     saldoColor = 'text-yellow-600 font-semibold';
                     saldoBg = 'bg-yellow-50';
                   }

                   return (
                      <tr key={artikel.id} className={`${saldoBg} transition-colors`}>
                      {editingId === artikel.id ? (
                       <>
                         <td className="px-3 py-2">
                           <input type="text" value={editForm.benamning} onChange={(e) => setEditForm({ ...editForm, benamning: e.target.value })} className="px-2 py-1 border border-gray-300 rounded w-full text-xs" />
                         </td>
                         <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{artikel.streckkod}</td>
                         <td className="px-3 py-2">
                           <input type="number" step="0.01" value={editForm.pris} onChange={(e) => setEditForm({ ...editForm, pris: e.target.value })} className="px-2 py-1 border border-gray-300 rounded w-20 text-right text-xs" />
                         </td>
                         <td className="px-3 py-2 text-right text-xs">{artikel.total_antal_inkopta}</td>
                         <td className="px-3 py-2 text-right text-xs text-gray-600">{calculateUttag(artikel)}</td>
                         <td className="px-3 py-2">
                           <input type="number" value={editForm.current_quantity} onChange={(e) => setEditForm({ ...editForm, current_quantity: e.target.value })} className="px-2 py-1 border border-gray-300 rounded w-16 text-right text-xs" />
                         </td>
                         <td className="px-3 py-2">
                           <input type="number" value={editForm.lagertroskelvarde} onChange={(e) => setEditForm({ ...editForm, lagertroskelvarde: e.target.value })} className="px-2 py-1 border border-gray-300 rounded w-16 text-right text-xs" />
                         </td>
                         <td className="px-3 py-2">
                           <label className="flex items-center gap-1 cursor-pointer">
                             <Checkbox checked={editForm.utgaende} onCheckedChange={(checked) => setEditForm({ ...editForm, utgaende: !!checked })} />
                             <span className="text-xs text-gray-600">Utgående</span>
                           </label>
                         </td>
                         <td className="px-3 py-2">
                           <div className="flex items-center gap-1">
                             <button onClick={handleSaveEdit} className="text-green-600 hover:bg-green-50 p-1 rounded font-semibold text-xs">✓</button>
                             <button onClick={handleCancelEdit} className="text-red-600 hover:bg-red-50 p-1 rounded font-semibold text-xs">✕</button>
                           </div>
                         </td>
                       </>
                      ) : (
                        <>
                          <td className="px-3 py-2">
                            <button onClick={() => {
                              const targetArtikel = artiklar.find(a => a.id === artikel.id);
                              const navigatePath = targetArtikel?.artikelnummer || targetArtikel?.streckkod || targetArtikel?.id;
                              if (navigatePath) {
                                navigate(`/Lokalvard/Artikel/${navigatePath}`);
                              }
                            }} className="font-medium text-blue-600 hover:underline text-left text-xs">
                              <span>{artikel.benamning}</span>
                              {artikel.subcategory && <span className="text-gray-500"> — {artikel.subcategory}</span>}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{artikel.streckkod}</td>
                          <td className="px-3 py-2 text-right text-xs font-semibold whitespace-nowrap">{artikel.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                          <td className="px-3 py-2 text-right text-xs">{getInköptForArticle(artikel)}</td>
                          <td className="px-3 py-2 text-right text-xs text-gray-600">{calculateUttag(artikel)}</td>
                          <td className={`px-3 py-2 text-right text-xs ${saldoColor}`}>{saldo}</td>
                          <td className="px-3 py-2 text-right text-xs text-gray-600">{artikel.lagertroskelvarde}</td>
                          <td className="px-3 py-2">
                            {artikel.utgaende ? (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded whitespace-nowrap">Utgående</span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Aktiv</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(artikel); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded" title="Redigera">
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </td>
                       </>
                       )}
                       </tr>
                       );
                       })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobil kort-vy */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((artikel) => {
          const saldo = calculateSaldo(artikel);
          let saldoColor = 'text-gray-900';
          let saldoBg = 'bg-white';
          if (saldo === 0) {
            saldoColor = 'text-red-600';
            saldoBg = 'bg-red-50';
          } else if (saldo < (artikel.lagertroskelvarde || 10)) {
            saldoColor = 'text-yellow-600';
            saldoBg = 'bg-yellow-50';
          }

          return (
            <div key={artikel.id} className={`${saldoBg} border border-gray-200 rounded-lg p-4`}>
              <button 
                onClick={() => {
                  const targetArtikel = artiklar.find(a => a.id === artikel.id);
                  const navigatePath = targetArtikel?.artikelnummer || targetArtikel?.streckkod || targetArtikel?.id;
                  if (navigatePath) {
                    navigate(`/Lokalvard/Artikel/${navigatePath}`);
                  }
                }}
                className="font-semibold text-blue-600 hover:underline text-left text-sm mb-2 block w-full"
              >
                {artikel.benamning}
              </button>
              {artikel.subcategory && <p className="text-xs text-gray-500 mb-2">{artikel.subcategory}</p>}
              <div className={`text-2xl font-bold ${saldoColor} mb-2`}>
                {saldo} st
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Pris:</span>
                  <span className="font-medium">{artikel.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
                </div>
                <div className="flex justify-between">
                  <span>Tröskel:</span>
                  <span className="font-medium">{artikel.lagertroskelvarde}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button 
                  onClick={() => handleEditClick(artikel)} 
                  className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium w-full"
                >
                  Redigera
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog för att lägga till ny artikel */}
      <AddArtikelDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} artiklar={artiklar} />
    </div>
  );
}