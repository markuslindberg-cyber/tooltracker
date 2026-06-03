import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Calendar, ChevronDown, ChevronRight, X, Upload, FileDown, Download, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { useScrollRestore } from '@/hooks/useScrollRestore';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import NyttUttagModal from '@/components/lokalvard/NyttUttagModal';

export default function LokalvardUttag() {
  useScrollRestore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const { data: artiklar = [] } = useQuery({
    queryKey: ['lokalvardsArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list(null, 10000).catch(() => []),
  });

  const { data: uttagData = [], isLoading: uttagLoading, refetch } = useQuery({
    queryKey: ['uttag'],
    queryFn: async () => {
       try {
         const data = await base44.entities.Uttag.list('-datum', 100000).catch(() => []);
         let checkoutData = [];
         if (base44.entities.LokalvardCheckout?.list) {
           checkoutData = await base44.entities.LokalvardCheckout.list('-checked_out_date', 100000).catch(() => []);
         }
         let requestData = [];
         if (base44.entities.LokalvardArtikelRequest?.list) {
           requestData = await base44.entities.LokalvardArtikelRequest.list(null, 100000).catch(() => []);
         }
         return { uttag: data, checkout: checkoutData, requests: requestData };
      } catch (err) {
        console.error('Fel vid hämtning av uttag:', err);
        return { uttag: [], checkout: [], requests: [] };
      }
    },
    refetchInterval: 2000,
  });

  const { containerRef, isPulling, pullDistance, PULL_THRESHOLD } = usePullToRefresh(
    () => queryClient.invalidateQueries(['uttag']),
    uttagLoading
  );

  const [sortBy, setSortBy] = useState('datum');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [editArticleForm, setEditArticleForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [searchBarcode, setSearchBarcode] = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showNyttUttagModal, setShowNyttUttagModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadAllUttag, setLoadAllUttag] = useState(false);
  const itemsPerPage = 500;

  const artikelMap = useMemo(() => {
    const map = {};
    artiklar.forEach(a => {
      map[a.id] = a;
      map[a.streckkod] = a;
      if (a.old_streckkod) map[a.old_streckkod] = a;
      if (a.benamning) map[a.benamning.toLowerCase()] = a;
    });
    return map;
  }, [artiklar]);

  const uttag = useMemo(() => {
    const processedUttag = (uttagData.uttag || []).map(u => ({
      ...u,
      artiklar: u.artiklar?.map(a => {
        const found = artikelMap[a.artikel_id] || (a.benamning && artikelMap[a.benamning.toLowerCase()]);
        return {
          ...a,
          streckkod: found?.streckkod || a.streckkod,
          artikel_namn: found?.benamning || a.benamning,
          pris_per_enhet: a.pris_per_enhet || found?.pris || 0,
          isCheckout: false,
          isMatched: !!found
        };
      })
    }));

    // Build request map for ordernummer lookup
    const requestMap = {};
    (uttagData.requests || []).forEach(r => { requestMap[r.id] = r; });

    const checkoutAsUttag = uttagData.checkout?.map(co => {
      const dateStr = co.checked_out_date || new Date().toISOString();
      const artiklar = co.checked_out_items.map(item => {
        // Try multiple lookup strategies
        let foundArtikel = artikelMap[item.item_id];
        if (!foundArtikel && item.barcode) foundArtikel = artikelMap[item.barcode];
        if (!foundArtikel && item.name) {
          // Try searching by benamning (name)
          const nameKey = Object.keys(artikelMap).find(key => {
            const a = artikelMap[key];
            return a && a.benamning?.toLowerCase() === item.name?.toLowerCase();
          });
          if (nameKey) foundArtikel = artikelMap[nameKey];
        }
        
        const pris = foundArtikel?.pris || item.price || 0;
        const antal = item.scanned_quantity || item.quantity || 0;
        return {
          artikel_id: foundArtikel?.id || item.item_id || '',
          benamning: foundArtikel?.benamning || item.name || item.barcode,
          streckkod: foundArtikel?.streckkod || item.barcode,
          artikel_namn: foundArtikel?.benamning || item.name,
          isCheckout: true,
          isMatched: !!foundArtikel,
          antal: antal,
          pris_per_enhet: pris,
          total_pris: antal * pris
        };
      });
      const total_kostnad = artiklar.reduce((sum, a) => sum + a.total_pris, 0);
      const linkedRequest = requestMap[co.request_id];
      return {
        id: co.id,
        datum: dateStr,
        personal_id: '',
        personal_namn: co.checked_out_by_name,
        kund_id: co.customer_id,
        kund_namn: co.customer_name,
        ordernummer: co.ordernummer || linkedRequest?.ordernummer || null,
        request_id: co.request_id,
        artiklar: artiklar,
        total_kostnad: total_kostnad,
        manad: dateStr.substring(0, 7)
      };
    }) || [];
    
    return [...processedUttag, ...checkoutAsUttag].sort((a, b) => new Date(b.datum) - new Date(a.datum));
  }, [uttagData, artikelMap]);

  const { data: personal = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(null, 10000).catch(() => []),
  });

  const { data: kunder = [] } = useQuery({
    queryKey: ['kunder'],
    queryFn: () => base44.entities.Kund.list(null, 10000).catch(() => []),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Uttag.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['uttag']);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Uttag.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['uttag']);
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

  const availableMonths = useMemo(
    () => [...new Set(uttag.map(u => u.manad).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [uttag]
  );

  const personalMap = useMemo(() => {
    const map = {};
    personal.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [personal]);

  const personalNameToId = useMemo(() => {
    const map = {};
    personal.forEach(p => {
      map[p.name] = p.id;
    });
    return map;
  }, [personal]);

  const kundeNameToId = useMemo(() => {
    const map = {};
    kunder.forEach(k => {
      map[k.namn] = k.id;
    });
    return map;
  }, [kunder]);

  const availablePersonal = useMemo(
    () => {
      const seen = new Map();
      uttag.forEach(u => {
        if (u.personal_id && !seen.has(u.personal_id)) {
          seen.set(u.personal_id, personalMap[u.personal_id] || u.personal_namn);
        }
      });
      return Array.from(seen.entries());
    },
    [uttag, personalMap]
  );

  const [selectedPersonal, setSelectedPersonal] = useState([]);

  const isUnmatched = (u) => u.artiklar?.some(a => a.isMatched === false);

  const filtered = uttag.filter(u => {
    const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(u.manad);
    const customerMatch = selectedCustomers.length === 0 || selectedCustomers.includes(u.kund_id);
    const personalMatch = selectedPersonal.length === 0 || selectedPersonal.includes(u.personal_id);
    if (searchBarcode === '') return monthMatch && customerMatch && personalMatch;
    const searchLower = searchBarcode.toLowerCase();
    const ordernummerMatch = (u.ordernummer || '').toLowerCase().includes(searchLower);
    const searchMatch = ordernummerMatch || u.artiklar?.some(a => {
      const benamning = (a.benamning || '').toLowerCase();
      const artikelNamn = (a.artikel_namn || '').toLowerCase();
      const artikelId = (a.artikel_id || '').toLowerCase();
      const streckkod = (a.streckkod || '').toLowerCase();
      const lagerArtikel = artikelMap[a.artikel_id] || artikelMap[a.streckkod];
      const lagerNamn = (lagerArtikel?.benamning || '').toLowerCase();
      const lagerStreckkod = (lagerArtikel?.streckkod || '').toLowerCase();
      return benamning.includes(searchLower) ||
        artikelNamn.includes(searchLower) ||
        artikelId.includes(searchLower) ||
        streckkod.includes(searchLower) ||
        lagerNamn.includes(searchLower) ||
        lagerStreckkod.includes(searchLower);
    });
    return monthMatch && customerMatch && personalMatch && searchMatch;
  });

  const sortField = (item) => {
    if (sortBy === 'personal_namn') return item.personal_namn;
    if (sortBy === 'kund_namn') return item.kund_namn;
    if (sortBy === 'total_kostnad') return item.total_kostnad;
    return item.datum;
  };

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal = sortField(a);
      let bVal = sortField(b);
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortBy, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [sorted, currentPage]);

  // Group articles by artikel_id, datum and kund_id
  const groupedRows = useMemo(() => {
    const grouped = {};
    paginatedData.forEach(u => {
      (u.artiklar || []).forEach((artikel, idx) => {
        const key = `${artikel.artikel_id}-${u.datum}-${u.kund_id}`;
        if (!grouped[key]) {
          grouped[key] = {
            ...u,
            artikel: artikel,
            artikel_id: artikel.artikel_id,
            benamning: artikel.benamning,
            artikel_namn: artikel.artikel_namn,
            streckkod: artikel.streckkod,
            totalAntal: 0,
            totalPrice: 0,
            isCheckout: artikel.isCheckout,
            ordernummer: u.ordernummer,
            indices: []
          };
        }
        grouped[key].totalAntal += artikel.antal;
        grouped[key].totalPrice += artikel.total_pris;
        grouped[key].indices.push(idx);
      });
    });
    return Object.values(grouped);
  }, [paginatedData]);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ArrowUp className="w-3 h-3 text-gray-300 inline ml-1" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-600 inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-blue-600 inline ml-1" />;
  };

  const handleDownloadTemplate = () => {
    const headers = ['datum', 'personal', 'kund', 'ordernummer', 'streckkod', 'antal', 'pris', 'månad'];
    const infoRows = [
      ['=== IMPORTMALL FÖR UTTAG ===', '', '', '', '', '', '', ''],
      headers,
      ['2026-01-15', 'Anna Andersson', 'Företag AB', 'ORD-001', '71617', '5', '49.99', '2026-01'],
    ];
    const csv = [...infoRows.map(r => r.map(c => `"${c}"`).join(',')), ...Array(19).fill(Array(8).fill('')).map(r => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lokalvard_uttag_mall.csv';
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
            datum: { type: 'string' },
            personal_namn: { type: 'string' },
            kund_namn: { type: 'string' },
            ordernummer: { type: 'string' },
            artikel_benamning: { type: 'string' },
            antal: { type: 'number' },
            pris_per_enhet: { type: 'number' },
            manad: { type: 'string' }
          }
        }
      });
      if (result.status === 'success' && Array.isArray(result.output)) {
      const valid = result.output.filter(r => r.datum && r.personal_namn && r.kund_namn && r.artikel_benamning && r.antal && r.pris_per_enhet);
      if (valid.length > 0) {
        await base44.entities.Uttag.bulkCreate(valid.map(r => {
          const matchedArtikel = artiklar.find(a => a.benamning?.toLowerCase() === r.artikel_benamning?.toLowerCase());
          return {
            datum: r.datum,
            personal_id: personalNameToId[r.personal_namn] || '',
            personal_namn: r.personal_namn,
            kund_id: kundeNameToId[r.kund_namn] || '',
            kund_namn: r.kund_namn,
            ordernummer: r.ordernummer || null,
            artiklar: [{
              artikel_id: matchedArtikel?.streckkod || matchedArtikel?.id || '',
              benamning: r.artikel_benamning,
              antal: r.antal,
              pris_per_enhet: r.pris_per_enhet,
              total_pris: r.antal * r.pris_per_enhet,
            }],
            total_kostnad: r.antal * r.pris_per_enhet,
            manad: r.manad,
          };
        }));
        setLoadAllUttag(true);
        alert(`${valid.length} uttag importerade! Laddar alla uttag...`);
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

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditForm({
      personal_namn: item.personal_namn,
      kund_namn: item.kund_namn,
      ordernummer: item.ordernummer || '',
      total_kostnad: item.total_kostnad,
      antal: item.artiklar[0]?.antal || 0
    });
  };

  const handleEditArticle = (uttagId, artikel, articleIndex) => {
    setEditingArticleId(`${uttagId}-${articleIndex}`);
    let pris = artikel.pris_per_enhet;
    
    // Om pris är 0, försök hämta från artikellistan
    if (pris === 0 || pris === undefined) {
      const foundArtikel = artikelMap[artikel.artikel_id] || artikelMap[artikel.benamning];
      pris = foundArtikel?.pris || 0;
    }
    
    setEditArticleForm({
      antal: artikel.antal,
      pris_per_enhet: pris
    });
  };

  const handleSaveArticle = (uttagId, articleIndex) => {
    const editingItem = uttag.find(u => u.id === uttagId);
    const updatedArtiklar = editingItem.artiklar.map((a, idx) => 
      idx === articleIndex 
        ? { ...a, antal: parseInt(editArticleForm.antal) || 0, pris_per_enhet: parseFloat(editArticleForm.pris_per_enhet) || 0, total_pris: (parseInt(editArticleForm.antal) || 0) * (parseFloat(editArticleForm.pris_per_enhet) || 0) }
        : a
    );
    const newTotal = updatedArtiklar.reduce((sum, a) => sum + a.total_pris, 0);
    updateMutation.mutate({
      id: uttagId,
      data: {
        artiklar: updatedArtiklar,
        total_kostnad: newTotal
      }
    });
    setEditingArticleId(null);
  };

  const handleCancelArticleEdit = () => {
    setEditingArticleId(null);
  };

  const groupArticles = (artiklar) => {
    const grouped = {};
    artiklar.forEach((artikel, idx) => {
      let name = '';
      let barcode = '';

      // Försök först söka i lagerlistan med artikel_id
      if (artikel.artikel_id) {
        const found = artikelMap[artikel.artikel_id];
        if (found) {
          name = found.benamning;
          barcode = found.streckkod;
        }
      }

      // Försök sedan söka med streckkod
      if (!name && artikel.streckkod) {
        const foundByBarcode = artikelMap[artikel.streckkod];
        if (foundByBarcode) {
          name = foundByBarcode.benamning;
          barcode = foundByBarcode.streckkod;
        }
      }

      // Försök söka med benamning som streckkod
      if (!name && artikel.benamning) {
        const foundByBarcode = artikelMap[artikel.benamning];
        if (foundByBarcode) {
          name = foundByBarcode.benamning;
          barcode = foundByBarcode.streckkod;
        }
      }

      // Om ännu ingen namn, använd benamning från artikel
      if (!name) name = artikel.benamning || 'Okänd artikel';
      if (!barcode) barcode = '';

      const key = `${name}|${barcode}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ ...artikel, originalIndex: idx });
    });
    return Object.entries(grouped).map(([key, items]) => {
      const [name, barcode] = key.split('|');
      return {
        name,
        barcode,
        items,
        totalAntal: items.reduce((sum, item) => sum + item.antal, 0),
        totalPrice: items.reduce((sum, item) => sum + item.total_pris, 0)
      };
    });
  };

  const handleSaveEdit = () => {
    const editingItem = uttag.find(u => u.id === editingId);
    updateMutation.mutate({
      id: editingId,
      data: {
        personal_namn: editForm.personal_namn,
        kund_namn: editForm.kund_namn,
        ordernummer: editForm.ordernummer || null,
        total_kostnad: parseFloat(editForm.total_kostnad) || 0,
        artiklar: editingItem.artiklar.map((a, idx) => idx === 0 ? { ...a, antal: parseInt(editForm.antal) || 0 } : a)
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDeleteUttag = (id, isCheckout) => {
    if (window.confirm('Är du säker på att du vill ta bort detta uttag?')) {
      if (isCheckout && base44.entities.LokalvardCheckout?.delete) {
        base44.entities.LokalvardCheckout.delete(id);
      } else {
        deleteMutation.mutate(id);
      }
    }
  };

  // Calculate total from all grouped rows (all filtered pages)
  const allGroupedRows = useMemo(() => {
    const grouped = {};
    sorted.forEach(u => {
      (u.artiklar || []).forEach((artikel) => {
        const key = `${artikel.artikel_id}-${u.datum}-${u.kund_id}`;
        if (!grouped[key]) {
          grouped[key] = {
            totalPrice: 0
          };
        }
        grouped[key].totalPrice += artikel.total_pris;
      });
    });
    return Object.values(grouped);
  }, [sorted]);

  const total = allGroupedRows.reduce((sum, row) => sum + row.totalPrice, 0);

  const handleExport = () => {
    const csv = [
      'Datum,Personal,Kund,Artikel,Antal,Pris,Ordernummer',
      ...sorted.map(u => `${u.datum},${u.personal_namn},${u.kund_namn},"${u.artiklar[0]?.benamning || ''}",${u.artiklar[0]?.antal || 0},${u.total_kostnad.toFixed(2)},${u.ordernummer || ''}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uttag_${selectedMonths.length > 0 ? selectedMonths.join('_') : 'alla'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const customers = [...new Set(uttag.map(u => u.kund_id).filter(Boolean))];

  const unmatchedArticles = useMemo(() => {
    const unmatched = [];
    uttag.forEach(u => {
      u.artiklar?.forEach(artikel => {
        const found = artikelMap[artikel.artikel_id] || artikelMap[artikel.benamning];
        if (!found) {
          const key = `${artikel.artikel_id}-${artikel.benamning}`;
          if (!unmatched.find(a => `${a.artikel_id}-${a.benamning}` === key)) {
            unmatched.push({
              artikel_id: artikel.artikel_id || artikel.benamning,
              benamning: artikel.benamning,
              count: uttag.reduce((sum, ut) => sum + (ut.artiklar?.filter(a => a.artikel_id === artikel.artikel_id || a.benamning === artikel.benamning).reduce((s, x) => s + x.antal, 0) || 0), 0)
            });
          }
        }
      });
    });
    return unmatched.sort((a, b) => b.count - a.count);
  }, [uttag, artikelMap]);

  if (uttagLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

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
      <NyttUttagModal
        open={showNyttUttagModal}
        onClose={() => setShowNyttUttagModal(false)}
        artikelMap={artikelMap}
        artiklar={artiklar}
      />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">📋 Uttag – Lokalvård</h1>
          {loadAllUttag && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Alla uttag laddat ({uttag.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
           {window.location.hostname.includes('base44.app') && <>
             <Button onClick={handleDownloadTemplate} className="hidden lg:flex bg-purple-600 hover:bg-purple-700">
               <FileDown className="w-4 h-4 mr-1" /> Mall
             </Button>
             <Button onClick={handleImportClick} disabled={uploading} className="hidden lg:flex bg-blue-600 hover:bg-blue-700">
               <Upload className="w-4 h-4 mr-1" /> Importera
             </Button>
             <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
           </>}
           {sorted.length > 0 && (
             <Button onClick={handleExport} className="hidden lg:flex bg-green-600 hover:bg-green-700">
               <Download className="w-4 h-4 mr-1" /> CSV
             </Button>
           )}
           <Button onClick={() => setShowNyttUttagModal(true)} className="bg-green-600 hover:bg-green-700">
             + Nytt uttag
           </Button>
           {window.location.hostname.includes('base44.app') && unmatchedArticles.length > 0 && !showUnmatched && (
             <Button onClick={() => setShowUnmatched(true)} className="bg-yellow-600 hover:bg-yellow-700">
               ⚠️ Omatchade ({unmatchedArticles.length})
             </Button>
           )}
         </div>
      </div>

      {/* Sökruta */}
      <input
        type="text"
        placeholder="Sök artikel, streckkod eller ordernummer..."
        value={searchBarcode}
        onChange={(e) => setSearchBarcode(e.target.value)}
        className="w-full h-11 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-blue-400"
      />

      {/* Filter-rad */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Månad filter */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-500 uppercase">Månad</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 h-11 px-2 text-sm font-medium text-gray-800 hover:text-blue-600 rounded hover:bg-gray-100">
                {selectedMonths.length === 0 ? 'Alla' : `${selectedMonths.length}`}
                <ChevronDown className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {availableMonths.map(m => (
                  <label key={m} className="flex items-center gap-2 h-11 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                    <Checkbox checked={selectedMonths.includes(m)} onCheckedChange={(checked) => setSelectedMonths(prev => checked ? [...prev, m] : prev.filter(x => x !== m))} />
                    <span className="text-sm">{m}</span>
                  </label>
                ))}
              </div>
              {selectedMonths.length > 0 && (
                <button onClick={() => setSelectedMonths([])} className="mt-2 h-9 w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 rounded hover:bg-gray-100">
                  <X className="w-4 h-4" /> Rensa
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Personal filter */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <span className="text-sm font-semibold text-gray-500 uppercase">Personal</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 h-11 px-2 text-sm font-medium text-gray-800 hover:text-blue-600 rounded hover:bg-gray-100">
                {selectedPersonal.length === 0 ? 'Alla' : `${selectedPersonal.length}`}
                <ChevronDown className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {availablePersonal.map(([pid, namn]) => (
                  <label key={pid} className="flex items-center gap-2 h-11 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                    <Checkbox checked={selectedPersonal.includes(pid)} onCheckedChange={(checked) => setSelectedPersonal(prev => checked ? [...prev, pid] : prev.filter(x => x !== pid))} />
                    <span className="text-sm">{namn}</span>
                  </label>
                ))}
              </div>
              {selectedPersonal.length > 0 && (
                <button onClick={() => setSelectedPersonal([])} className="mt-2 h-9 w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 rounded hover:bg-gray-100">
                  <X className="w-4 h-4" /> Rensa
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Kund filter */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <span className="text-sm font-semibold text-gray-500 uppercase">Kund</span>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 h-11 px-2 text-sm font-medium text-gray-800 hover:text-blue-600 rounded hover:bg-gray-100">
                {selectedCustomers.length === 0 ? 'Alla' : `${selectedCustomers.length}`}
                <ChevronDown className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {customers.map(cid => {
                  const cust = uttag.find(u => u.kund_id === cid);
                  return (
                    <label key={cid} className="flex items-center gap-2 h-11 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer">
                      <Checkbox checked={selectedCustomers.includes(cid)} onCheckedChange={(checked) => setSelectedCustomers(prev => checked ? [...prev, cid] : prev.filter(x => x !== cid))} />
                      <span className="text-sm">{cust?.kund_namn}</span>
                    </label>
                  );
                })}
              </div>
              {selectedCustomers.length > 0 && (
                <button onClick={() => setSelectedCustomers([])} className="mt-2 h-9 w-full text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 rounded hover:bg-gray-100">
                  <X className="w-4 h-4" /> Rensa
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {(selectedMonths.length > 0 || selectedCustomers.length > 0 || selectedPersonal.length > 0 || searchBarcode !== '') && (
          <Button
            variant="outline"
            onClick={() => { setSelectedMonths([]); setSelectedCustomers([]); setSelectedPersonal([]); setSearchBarcode(''); }}
            className="gap-1 text-sm"
          >
            <RotateCcw className="w-4 h-4" /> Rensa alla
          </Button>
        )}
      </div>

      {showUnmatched ? (
        <div>
          <Button onClick={() => setShowUnmatched(false)} variant="outline">
            ← Tillbaka till uttag
          </Button>
        </div>
      ) : (
        <div>
          {sorted.length > 0 ? (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">Totalt {sorted.length} uttag</span>
                <span className="text-xl font-bold text-blue-900">{total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
              </div>

              {/* Pagination info */}
              <div className="text-xs text-gray-500 mb-2">
                Visar {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, sorted.length)} av {sorted.length}
              </div>

              {/* Table - Desktop */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hidden lg:block">
              <table className="w-full text-sm">
               <thead>
                 <tr className="bg-gray-50 border-b border-gray-200">
                   <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-xs" onClick={() => handleSort('datum')}>
                      Datum <SortIcon col="datum" />
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-xs" onClick={() => handleSort('kund_namn')}>
                      Kund <SortIcon col="kund_namn" />
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-xs" onClick={() => handleSort('personal_namn')}>
                      Personal <SortIcon col="personal_namn" />
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">Artikel</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-600 text-xs">Antal</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 text-xs">Ordernr</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-xs" onClick={() => handleSort('total_kostnad')}>
                      Kostnad <SortIcon col="total_kostnad" />
                    </th>
                  </tr>
                </thead>
               <tbody>
                 {groupedRows.map((row) => {
                   const datumStr = row.datum ? row.datum.split('T')[0] : '';
                   const firstIdx = row.indices[0];
                   return (
                     <tr key={`${row.artikel_id}-${row.datum}-${row.kund_id}`} className="border-b border-gray-100 hover:bg-gray-50">
                       <td className="px-3 py-1.5 text-gray-900 whitespace-nowrap text-xs">{datumStr}</td>
                       <td className="px-3 py-1.5 text-gray-900 font-medium text-xs">{row.kund_namn}</td>
                       <td className="px-3 py-1.5 text-gray-700 text-xs">{row.personal_namn}</td>
                       <td className="px-3 py-1.5 text-gray-900 cursor-pointer hover:opacity-70 text-xs" onClick={() => {
                          const foundArtikel = artikelMap[row.artikel_id] || artikelMap[row.benamning];
                          if (foundArtikel?.artikelnummer) navigate(`/Lokalvard/Artikel/${foundArtikel.artikelnummer}`);
                        }}>
                          {row.artikel_namn || row.benamning}
                        </td>
                        <td className="px-3 py-1.5 text-center text-gray-900 text-xs">
                          {editingArticleId === `${row.id}-${firstIdx}` ? (
                            <input 
                              type="number" 
                              value={editArticleForm.antal} 
                              onChange={(e) => setEditArticleForm({...editArticleForm, antal: e.target.value})}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs text-center"
                              placeholder="Antal"
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            `${row.totalAntal} st`
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500 text-xs">{row.ordernummer || '–'}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-gray-900 whitespace-nowrap text-xs">
                          {editingArticleId === `${row.id}-${firstIdx}` ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editArticleForm.pris_per_enhet}
                              onChange={(e) => setEditArticleForm({...editArticleForm, pris_per_enhet: e.target.value})}
                              className="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs text-right"
                              placeholder="Pris"
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            row.totalPrice.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' kr'
                          )}
                        </td>
                        <td className="px-3 py-1.5 flex items-center gap-1">
                          {editingArticleId === `${row.id}-${firstIdx}` ? (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleSaveArticle(row.id, firstIdx)} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700">Spara</button>
                              <button onClick={handleCancelArticleEdit} className="px-2 py-0.5 bg-gray-400 text-white rounded text-xs font-medium hover:bg-gray-500">X</button>
                              <button onClick={() => handleDeleteUttag(row.id, row.isCheckout)} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700">Ta bort</button>
                            </div>
                          ) : (
                            <button onClick={() => handleEditArticle(row.id, row.artikel, firstIdx)} className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">Redigera</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>

              {/* Pagination */}
                {sorted.length > itemsPerPage && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      ← Förra
                    </Button>
                    <span className="text-sm text-gray-600">Sida {currentPage} av {Math.ceil(sorted.length / itemsPerPage)}</span>
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(sorted.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(sorted.length / itemsPerPage)}
                    >
                      Nästa →
                    </Button>
                  </div>
                )}

              {/* Mobile view */}
              <div className="lg:hidden space-y-1">
                {paginatedData.map((u) => (
                  <div key={`${u.id}-${u.datum}`} className="bg-white rounded border border-gray-200 px-3 py-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-xs text-gray-900 truncate">{u.kund_namn}</p>
                        <p className="text-xs text-gray-400 whitespace-nowrap">{u.datum?.split('T')[0]}</p>
                      </div>
                      <p className="text-xs font-bold text-gray-900 whitespace-nowrap ml-2">{u.total_kostnad.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{u.personal_namn}</span>
                      {u.ordernummer && <span>· {u.ordernummer}</span>}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {u.artiklar?.map((a, idx) => (
                        <span key={idx}>{idx > 0 ? ', ' : ''}{a.benamning} ({a.antal} st)</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {sorted.length === 0 && (
                <div className="text-center py-8 text-gray-500">Inget uttag för denna period</div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">Ingen data att visa</div>
          )}
          </div>
          )}

          {window.location.hostname.includes('base44.app') && unmatchedArticles.length > 0 && showUnmatched && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-yellow-900">⚠️ Omatchade artiklar ({unmatchedArticles.length})</h2>
                <Button onClick={() => setShowUnmatched(false)} variant="outline">
                  Stäng
                </Button>
              </div>
          <p className="text-sm text-yellow-800 mb-3">Dessa streckkoder/artiklar från uttag matchar inte artiklar i lagerlistan. Lägg till dem i lagerlistan eller korrigera streckkoden:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-yellow-100 border-b">
                  <th className="px-4 py-2 text-left font-semibold text-yellow-900">Streckkod/ID</th>
                  <th className="px-4 py-2 text-left font-semibold text-yellow-900">Namn från fil</th>
                  <th className="px-4 py-2 text-left font-semibold text-yellow-900">Namn från lager</th>
                  <th className="px-4 py-2 text-right font-semibold text-yellow-900">Antal gånger använd</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {unmatchedArticles.map((artikel) => {
                  const lagernummer = artikelMap[artikel.artikel_id];
                  const lagerNamn = lagernummer?.benamning || artikelMap[artikel.benamning]?.benamning || '';
                  return (
                    <tr key={`${artikel.artikel_id}-${artikel.benamning}`} className="hover:bg-yellow-100">
                      <td className="px-4 py-2 font-mono text-yellow-900">{artikel.artikel_id}</td>
                      <td className="px-4 py-2 text-yellow-900">{artikel.benamning || '–'}</td>
                      <td className="px-4 py-2 text-yellow-900">{lagerNamn || '–'}</td>
                      <td className="px-4 py-2 text-right text-yellow-900 font-semibold">{artikel.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}