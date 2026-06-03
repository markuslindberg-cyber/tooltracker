import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Package, MapPin, Edit, Trash2, Upload, FileSpreadsheet, Loader2, Check, X as XIcon, ScanLine, Image, CheckSquare, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HandToolBatchModal from '@/components/modals/HandToolBatchModal';
import HandToolScanModal from '@/components/modals/HandToolScanModal';
import HandToolEditModal from '@/components/modals/HandToolEditModal';
import HandToolGroupEditModal from '@/components/modals/HandToolGroupEditModal';
import HandToolCard from '@/components/ui/HandToolCard';
import SearchFilterBar from '@/components/ui/SearchFilterBar';

const statusConfig = {
  i_lager:  { label: 'I lager',  className: 'bg-green-100 text-green-800' },
  i_bruk:   { label: 'I bruk',   className: 'bg-blue-100 text-blue-800' },
  saknas:   { label: 'Saknas',   className: 'bg-red-100 text-red-800' },
  kasserad: { label: 'Kasserad', className: 'bg-gray-100 text-gray-600' },
};


export default function HandTools() {
   const queryClient = useQueryClient();
   const [search, setSearch] = useState('');
   
   const { data: handTools = [], isLoading } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.filter({ is_deleted: { $ne: true } }, '-updated_date', 1000),
  });

   const { containerRef, isPulling, pullDistance, PULL_THRESHOLD } = usePullToRefresh(
     () => queryClient.invalidateQueries(['handtools']),
     isLoading
   );
  const [statusFilter, setStatusFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [subcategoryFilter, setSubcategoryFilter] = useState([]);
  const [manufacturerFilter, setManufacturerFilter] = useState([]);
  const [locationFilter, setLocationFilter] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editTool, setEditTool] = useState(null);
  const [viewMode, setViewMode] = useState('grouped');
  const [editingCategory, setEditingCategory] = useState(null);
  const [groupEditTarget, setGroupEditTarget] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(null);
  const categoryImageInputRef = useRef(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expandedAvsparrning, setExpandedAvsparrning] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkLocation, setBulkLocation] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [savingBulk, setSavingBulk] = useState(false);

  const { data: categoryImages = [] } = useQuery({
    queryKey: ['categoryimages'],
    queryFn: () => base44.entities.CategoryImage.list('category'),
  });

  // Map: category -> image_url
  const categoryImageMap = Object.fromEntries(categoryImages.map(ci => [ci.category, ci]));

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
  });

  const AVSPARRNING_CATEGORY = 'Avspärrningsmaterial';
  const [activeTab, setActiveTab] = useState('handredskap');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const mainHandTools = handTools.filter(t => t.category !== AVSPARRNING_CATEGORY);
  const avsparrningTools = handTools.filter(t => t.category === AVSPARRNING_CATEGORY);

  const activeTools = activeTab === 'avsparrning' ? avsparrningTools : mainHandTools;

  const categories = [...new Set(activeTools.map(t => t.category).filter(Boolean))].sort();
  const subcategories = [...new Set(activeTools.map(t => t.subcategory).filter(Boolean))].sort();
  const manufacturers = [...new Set(activeTools.map(t => t.manufacturer).filter(Boolean))].sort();
  const locationNames = [...new Set(activeTools.map(t => t.location_name).filter(Boolean))].sort();

  const filtered = activeTools.filter(t => {
    const q = search.toLowerCase();
    if (q && !`${t.name} ${t.manufacturer} ${t.category} ${t.subcategory}`.toLowerCase().includes(q)) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(t.status)) return false;
    if (categoryFilter.length > 0 && !categoryFilter.includes(t.category)) return false;
    if (subcategoryFilter.length > 0 && !subcategoryFilter.includes(t.subcategory)) return false;
    if (manufacturerFilter.length > 0 && !manufacturerFilter.includes(t.manufacturer)) return false;
    if (locationFilter.length > 0 && !locationFilter.includes(t.location_name)) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, t) => {
    const key = `${t.name}__${t.category}__${t.manufacturer || ''}`;
    if (!acc[key]) acc[key] = { name: t.name, category: t.category, manufacturer: t.manufacturer, items: [] };
    acc[key].items.push(t);
    return acc;
  }, {});

  const renameMutation = useMutation({
    mutationFn: async ({ oldName, newName }) => {
      const toUpdate = handTools.filter(t => t.category === oldName);
      await Promise.all(toUpdate.map(t => base44.entities.HandTool.update(t.id, { category: newName })));
      const existing = categoryImageMap[oldName];
      if (existing) {
        await base44.entities.CategoryImage.update(existing.id, { category: newName });
      }
    },
    onMutate: async ({ oldName, newName }) => {
      await queryClient.cancelQueries({ queryKey: ['handtools'] });
      const prevTools = queryClient.getQueryData(['handtools']);
      queryClient.setQueryData(['handtools'], (old) =>
        old?.map(t => t.category === oldName ? { ...t, category: newName } : t) || []
      );
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['handtools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handtools'] });
      queryClient.invalidateQueries({ queryKey: ['categoryimages'] });
      setEditingCategory(null);
    },
  });

  const handleRenameCategory = () => {
    if (!editingCategory || editingCategory.newName.trim() === editingCategory.oldName) {
      setEditingCategory(null);
      return;
    }
    renameMutation.mutate({ oldName: editingCategory.oldName, newName: editingCategory.newName.trim() });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HandTool.update(id, { is_deleted: true, deleted_at: new Date().toISOString() }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['handtools'] });
      const prevTools = queryClient.getQueryData(['handtools']);
      queryClient.setQueryData(['handtools'], (old) =>
        old?.filter(t => t.id !== id) || []
      );
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['handtools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handtools'] });
    },
  });

  const handleDelete = (id) => deleteMutation.mutate(id);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (items) => {
    const ids = items.map(i => i.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const bulkSaveMutation = useMutation({
    mutationFn: async ({ updates, toolIds }) => {
      return Promise.all(toolIds.map(id => base44.entities.HandTool.update(id, updates)));
    },
    onMutate: async ({ updates, toolIds }) => {
      await queryClient.cancelQueries({ queryKey: ['handtools'] });
      const prevTools = queryClient.getQueryData(['handtools']);
      queryClient.setQueryData(['handtools'], (old) =>
        old?.map(t => toolIds.includes(t.id) ? { ...t, ...updates } : t) || []
      );
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['handtools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handtools'] });
      setSelectedIds(new Set());
      setBulkStatus('');
      setBulkLocation('');
    },
  });

  const handleBulkSave = () => {
    if (!bulkStatus && !bulkLocation) return;
    const updates = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkLocation) {
      const loc = locations.find(l => l.id === bulkLocation);
      updates.location_id = bulkLocation;
      updates.location_name = loc?.name || '';
    }
    bulkSaveMutation.mutate({ updates, toolIds: [...selectedIds] });
  };

  const hasFilters = search || statusFilter.length > 0 || categoryFilter.length > 0 || subcategoryFilter.length > 0 || manufacturerFilter.length > 0 || locationFilter.length > 0;

  const handleDownloadTemplate = () => {
    const infoRows = [
      ['=== IMPORTMALL FÖR HANDREDSKAP ===', '', '', '', '', '', '', '', '', '', '', ''],
      ['Kolumn 1: name', 'Kolumn 2: manufacturer', 'Kolumn 3: category', 'Kolumn 4: subcategory', 'Kolumn 5: status', 'Kolumn 6: condition', 'Kolumn 7: purchase_date', 'Kolumn 8: purchase_price', 'Kolumn 9: location_name', 'Kolumn 10: assigned_to_name', 'Kolumn 11: barcode', 'Kolumn 12: notes'],
      ['Namn (obligatorisk)', 'Tillverkare/märke', 'Kategori (t.ex. Räfsor)', 'Underkategori', 'Status: i_lager / i_bruk / saknas / kasserad', 'Skick: ny / bra / okej / dålig', 'Köpdatum (ÅÅÅÅ-MM-DD)', 'Köppris (siffra)', 'Platsnamn', 'Tilldelad person', 'Streckkod', 'Anteckningar'],
      ['--- FYLL I DINA RADER NEDAN FRÅN RAD 6 (exempelrader nedan) ---', '', '', '', '', '', '', '', '', '', '', ''],
    ];
    const headers = ['name', 'manufacturer', 'category', 'subcategory', 'status', 'condition', 'purchase_date', 'purchase_price', 'location_name', 'assigned_to_name', 'barcode', 'notes'];
    // Pick up to 5 unique examples from existing tools (mix of handredskap and avspärrning)
    const seen = new Set();
    const exampleRows = handTools.filter(t => {
      const key = `${t.name}__${t.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5).map(t => [
      t.name || '', t.manufacturer || '', t.category || '', t.subcategory || '',
      t.status || 'i_lager', '', t.purchase_date || '', t.purchase_price || '',
      t.location_name || '', t.assigned_to_name || '', t.barcode || '', t.notes || ''
    ]);
    if (exampleRows.length === 0) {
      exampleRows.push(['Räfsa', 'Fiskars', 'Räfsor', '', 'i_lager', 'bra', '2026-01-01', '199', '', '', '', 'Exempelrad']);
    }
    const emptyRows = Array(19).fill(Array(12).fill(''));
    const csvContent = [
      ...infoRows.map(r => r.map(c => `"${c}"`).join(',')),
      headers.join(','),
      ...exampleRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')),
      ...emptyRows.map(r => r.join(','))
    ].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'handredskap_mall.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            manufacturer: { type: 'string' },
            category: { type: 'string' },
            subcategory: { type: 'string' },
            status: { type: 'string' },
            condition: { type: 'string' },
            purchase_date: { type: 'string' },
            purchase_price: { type: 'number' },
            location_name: { type: 'string' },
            assigned_to_name: { type: 'string' },
            barcode: { type: 'string' },
            notes: { type: 'string' },
          }
        }
      });
      if (result.status === 'success' && result.output) {
        const rows = Array.isArray(result.output) ? result.output : [result.output];
        const valid = rows.filter(r => r.name && r.name.trim());
        if (valid.length > 0) {
          await base44.entities.HandTool.bulkCreate(valid.map(r => ({
            name: r.name,
            manufacturer: r.manufacturer || '',
            category: r.category || 'Okategoriserad',
            subcategory: r.subcategory || '',
            status: r.status || 'i_lager',
            condition: r.condition || 'bra',
            purchase_date: r.purchase_date || undefined,
            purchase_price: r.purchase_price || undefined,
            location_name: r.location_name || '',
            assigned_to_name: r.assigned_to_name || '',
            barcode: r.barcode || '',
            notes: r.notes || '',
          })));
          queryClient.invalidateQueries(['handtools']);
          alert(`${valid.length} redskap importerades!`);
        } else {
          alert('Inga giltiga rader hittades i filen.');
        }
      } else {
        alert('Kunde inte läsa filen: ' + (result.details || 'Okänt fel'));
      }
    } catch (err) {
      alert('Importfel: ' + (err.message?.includes('unicode') || err.message?.includes('utf')
        ? 'Filen har fel teckenkodning. Ladda ned en ny mall och fyll i den — importera inte den gamla mallen.'
        : err.message || 'Okänt fel'));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleCategoryImageUpload = async (e, category) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCategoryImage(category);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    // Create or update CategoryImage record
    const existing = categoryImageMap[category];
    if (existing) {
      await base44.entities.CategoryImage.update(existing.id, { image_url: file_url });
    } else {
      await base44.entities.CategoryImage.create({ category, image_url: file_url });
    }
    // Also update all tools in this category that don't have a custom image
    const toolsInCat = handTools.filter(t => t.category === category && !t.custom_image);
    await Promise.all(toolsInCat.map(t => base44.entities.HandTool.update(t.id, { image_url: file_url })));
    queryClient.invalidateQueries(['categoryimages']);
    queryClient.invalidateQueries(['handtools']);
    setUploadingCategoryImage(null);
    e.target.value = '';
  };

  const clearFilters = () => {
    setSearch(''); setStatusFilter([]); setCategoryFilter([]); setSubcategoryFilter([]);
    setManufacturerFilter([]); setLocationFilter([]);
  };

  return (
    <div ref={containerRef} className="p-6 space-y-6 overflow-y-auto min-h-screen" style={{ transform: isPulling ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)', transition: isPulling ? 'none' : 'transform 0.3s ease-out' }}>
      {pullDistance > 0 && (
        <div className="fixed top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none">
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Handredskap</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{handTools.length} redskap totalt</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {import.meta.env.DEV && <>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="hidden lg:flex gap-2">
              <FileSpreadsheet className="w-4 h-4" />Ladda ned mall
            </Button>
            <label className="hidden lg:block">
              <Button variant="outline" size="sm" disabled={importing} asChild>
                <span className="gap-2 cursor-pointer">
                  {importing ? <><Loader2 className="w-4 h-4 animate-spin" />Importerar...</> : <><Upload className="w-4 h-4" />Importera CSV</>}
                </span>
              </Button>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} className="hidden" disabled={importing} />
            </label>
          </>}
          <Button variant="outline" size="sm" onClick={() => setShowScanModal(true)} className="gap-2">
            <ScanLine className="w-4 h-4" /><span className="hidden sm:inline">Inventera (skanna)</span>
          </Button>
          <Button size="sm" onClick={() => setShowBatchModal(true)} className="bg-[#8B1E1E] hover:bg-[#6B1515] gap-2">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Lägg till redskap</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-2">
          <TabsTrigger value="handredskap">Handredskap ({mainHandTools.length})</TabsTrigger>
          <TabsTrigger value="avsparrning">Avspärrning ({avsparrningTools.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search & Filters */}
      <SearchFilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        subcategoryFilter={subcategoryFilter}
        onSubcategoryChange={setSubcategoryFilter}
        manufacturerFilter={manufacturerFilter}
        onManufacturerChange={setManufacturerFilter}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onClearFilters={clearFilters}
        availableCategories={categories}
        availableSubcategories={subcategories}
        availableManufacturers={manufacturers}
        availableLocations={locationNames}
        availableAssignedTo={[]}
        showViewToggle={true}
        viewModes={['grid', 'list', 'grouped']}
        statusOptions={[
          { value: 'i_lager', label: 'I lager' },
          { value: 'i_bruk', label: 'I bruk' },
          { value: 'saknas', label: 'Saknas' },
          { value: 'kasserad', label: 'Kasserad' },
        ]}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B1E1E] rounded-full animate-spin" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <Package className="w-12 h-12 mb-3 opacity-40" />
          <p className="font-medium">Inga redskap hittades</p>
          <p className="text-sm">Klicka på "Lägg till redskap" för att börja</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Card grid view — individual cards like Maskiner page */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {filtered.map((tool) => (
            <HandToolCard
              key={tool.id}
              tool={tool}
              categoryImageUrl={categoryImageMap[tool.category]?.image_url}
              onEdit={setEditTool}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped view — items grouped by name/category with location sub-groups */
        <div className="space-y-4">
          {selectedIds.size > 0 && (
            <div className="sticky top-4 z-20 bg-white border border-[#8B1E1E]/30 rounded-xl p-3 shadow-lg flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[#8B1E1E]">{selectedIds.size} markerade</span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Ändra status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="i_lager">I lager</SelectItem>
                  <SelectItem value="i_bruk">I bruk</SelectItem>
                  <SelectItem value="saknas">Saknas</SelectItem>
                  <SelectItem value="kasserad">Kasserad</SelectItem>
                </SelectContent>
              </Select>
              <Select value={bulkLocation} onValueChange={setBulkLocation}>
                <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Ändra plats" /></SelectTrigger>
                <SelectContent>
                  {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleBulkSave} disabled={bulkSaveMutation.isPending || (!bulkStatus && !bulkLocation)} className="bg-[#8B1E1E] hover:bg-[#6B1515] h-8">
                {bulkSaveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Spara
              </Button>
              <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-gray-600 ml-auto"><XIcon className="w-4 h-4" /></button>
            </div>
          )}

          {Object.values(grouped).map((group) => {
            const groupKey = `${group.name}-${group.category}`;
            const isExpanded = expandedGroups.has(groupKey);
            const byLocation = group.items.reduce((acc, item) => {
              const loc = item.location_name || 'INGEN PLATS';
              if (!acc[loc]) acc[loc] = [];
              acc[loc].push(item);
              return acc;
            }, {});
            const byStatus = group.items.reduce((acc, item) => {
              acc[item.status] = (acc[item.status] || 0) + 1;
              return acc;
            }, {});
            const groupSelected = group.items.every(i => selectedIds.has(i.id));
            const toggleExpand = () => {
              setExpandedGroups(prev => {
                const next = new Set(prev);
                if (next.has(groupKey)) next.delete(groupKey); else next.add(groupKey);
                return next;
              });
            };
            return (
              <div key={groupKey} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  onClick={toggleExpand}
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700">
                      {group.items[0]?.image_url || categoryImageMap[group.category]?.image_url
                        ? <img src={group.items[0]?.image_url || categoryImageMap[group.category]?.image_url} alt={group.name} className="w-full h-full object-cover" />
                        : <Package className="w-5 h-5 text-gray-300" />}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</h2>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{group.category}{group.manufacturer ? ` · ${group.manufacturer}` : ''} · {group.items.length} st totalt</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
                    {Object.entries(byStatus).map(([s, count]) => (
                      <span key={s} className={`text-xs font-medium px-2 py-1 rounded-full ${statusConfig[s]?.className || 'bg-gray-100 text-gray-600'}`}>{count} {statusConfig[s]?.label || s}</span>
                    ))}
                    <button
                      onClick={() => {
                        const selectedInGroup = group.items.filter(i => selectedIds.has(i.id));
                        setGroupEditTarget({ ...group, items: selectedInGroup.length > 0 ? selectedInGroup : group.items });
                      }}
                      className="ml-1 p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                      title="Redigera grupp"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <Checkbox
                      checked={groupSelected}
                      onCheckedChange={() => toggleSelectAll(group.items)}
                      className="shrink-0"
                    />
                  </div>
                </div>
                {isExpanded && (
                <div className="divide-y divide-gray-50 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                  {Object.entries(byLocation).map(([locName, items]) => (
                    <div key={locName}>
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100/80 dark:bg-gray-800/50 border-y border-gray-200 dark:border-gray-700">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{locName}</span>
                        <span className="text-xs text-gray-400">({items.length} st)</span>
                        <Checkbox
                          checked={items.every(i => selectedIds.has(i.id))}
                          onCheckedChange={() => toggleSelectAll(items)}
                          className="ml-1"
                        />
                      </div>
                      <div className="divide-y divide-gray-50 dark:divide-gray-800">
                        {items.map((item, idx) => (
                          <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group ${selectedIds.has(item.id) ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                            <span className="text-xs text-gray-400 w-5 shrink-0">#{idx + 1}</span>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.status === 'i_lager' ? 'bg-green-500' : item.status === 'i_bruk' ? 'bg-blue-500' : item.status === 'saknas' ? 'bg-red-500' : 'bg-gray-400'}`} />
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig[item.status]?.className || 'bg-gray-100 text-gray-600'}`}>{statusConfig[item.status]?.label || item.status}</span>
                            {item.notes && <span className="text-xs text-gray-400 truncate max-w-[160px]">{item.notes}</span>}
                            <div className="ml-auto flex items-center gap-2">
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditTool(item)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                              <Checkbox
                                checked={selectedIds.has(item.id)}
                                onCheckedChange={() => toggleSelect(item.id)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List view — simple flat list */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group">
                <span className={`w-3 h-3 rounded-full shrink-0 ${item.status === 'i_lager' ? 'bg-green-500' : item.status === 'i_bruk' ? 'bg-blue-500' : item.status === 'saknas' ? 'bg-red-500' : 'bg-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">{item.category}{item.manufacturer ? ` · ${item.manufacturer}` : ''}</p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusConfig[item.status]?.className || 'bg-gray-100 text-gray-600'}`}>{statusConfig[item.status]?.label || item.status}</span>
                  {item.location_name && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{item.location_name}</span>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditTool(item)} className="p-1.5 text-gray-400 hover:text-gray-600"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {groupEditTarget && (
        <HandToolGroupEditModal
          isOpen={!!groupEditTarget}
          group={groupEditTarget}
          onClose={() => setGroupEditTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries(['handtools']);
            setGroupEditTarget(null);
          }}
        />
      )}

      <HandToolScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        handTools={handTools}
        locations={locations}
      />

      <HandToolBatchModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onSuccess={() => queryClient.invalidateQueries(['handtools'])}
      />

      {editTool && (
        <HandToolEditModal
          isOpen={!!editTool}
          tool={editTool}
          locations={locations}
          onClose={() => setEditTool(null)}
          onSuccess={() => {
            queryClient.invalidateQueries(['handtools']);
            setEditTool(null);
          }}
        />
      )}
    </div>
  );
}