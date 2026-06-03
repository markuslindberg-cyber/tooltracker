import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  ScanLine,
  Download,
  Upload,
  Loader2,
} from 'lucide-react';
import ArbetskläderUtrustningFormModal from '@/components/modals/ArbetskläderUtrustningFormModal';
import ArbetskläderScanModal from '@/components/modals/ArbetskläderScanModal';
import CheckoutModal from '@/components/modals/CheckoutModal';
import SearchFilterBar from '@/components/ui/SearchFilterBar';
import { useRef } from 'react';

const statusMap = {
  i_lager: { label: 'I lager', class: 'bg-green-100 text-green-800' },
  i_bruk: { label: 'I bruk', class: 'bg-blue-100 text-blue-800' },
  saknas: { label: 'Saknas', class: 'bg-red-100 text-red-800' },
  kasserad: { label: 'Kasserad', class: 'bg-gray-100 text-gray-800' },
};

const conditionMap = {
  ny: { label: 'Ny' },
  bra: { label: 'Bra' },
  okej: { label: 'Okej' },
  dålig: { label: 'Dålig' },
};

export default function ArbetskläderUtrustning() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [manufacturerFilter, setManufacturerFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['arbetskläder'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 500),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const categories = [...new Set(items.map(i => i.category))].sort();
  const subcategories = [...new Set(items.map(i => i.subcategory).filter(Boolean))].sort();
  const sizes = [...new Set(items.map(i => i.size).filter(Boolean))].sort();
  const manufacturers = [...new Set(items.map(i => i.manufacturer).filter(Boolean))].sort();

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = search === '' || 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.subcategory?.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesSubcategory = subcategoryFilter === 'all' || item.subcategory === subcategoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSize = sizeFilter === 'all' || item.size === sizeFilter;
      const matchesManufacturer = manufacturerFilter === 'all' || item.manufacturer === manufacturerFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;

      return matchesSearch && matchesCategory && matchesSubcategory && matchesStatus && matchesSize && matchesManufacturer && matchesCondition;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [items, search, statusFilter, categoryFilter, subcategoryFilter, sizeFilter, manufacturerFilter, conditionFilter]);

  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      if (!groups[item.name]) {
        groups[item.name] = {
          name: item.name,
          category: item.category,
          subcategory: item.subcategory,
          manufacturer: item.manufacturer,
          location_name: item.location_name,
          notes: item.notes,
          sizes: [],
          items: [],
        };
      }
      groups[item.name].items.push(item);
      if (item.size) {
        const sizeEntry = groups[item.name].sizes.find(s => s.size === item.size);
        if (sizeEntry) {
          sizeEntry.quantity += item.quantity || 0;
        } else {
          groups[item.name].sizes.push({ size: item.size, quantity: item.quantity || 0 });
        }
      }
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredItems]);

  const deleteItem = async (id) => {
    if (confirm('Är du säker på att du vill ta bort denna artikel?')) {
      await base44.entities.ArbetskläderUtrustning.delete(id);
      refetch();
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    refetch();
  };

  const handleDownloadTemplate = () => {
    const headers = ['namn', 'kategori', 'underkategori', 'storlek', 'tillverkare', 'antal', 'status', 'skick', 'plats', 'anteckningar'];
    const exampleRow = ['Arbetsjacka', 'Arbetskläder', 'Jackor', 'M', 'Nike', '5', 'i_lager', 'bra', 'Lager 1', 'Ny'];
    const csv = [
      headers.join(','),
      exampleRow.join(','),
      ...Array(19).fill(headers.map(() => '').join(','))
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'arbetsklder_mall.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
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
            namn: { type: 'string' },
            kategori: { type: 'string' },
            underkategori: { type: 'string' },
            storlek: { type: 'string' },
            tillverkare: { type: 'string' },
            antal: { type: 'number' },
            status: { type: 'string' },
            skick: { type: 'string' },
            plats: { type: 'string' },
            anteckningar: { type: 'string' }
          }
        }
      });

      if (result.status === 'success' && Array.isArray(result.output)) {
        const valid = result.output.filter(r => r.namn && r.kategori);
        if (valid.length > 0) {
          await base44.entities.ArbetskläderUtrustning.bulkCreate(
            valid.map(r => ({
              name: r.namn,
              category: r.kategori,
              subcategory: r.underkategori || '',
              size: r.storlek || '',
              manufacturer: r.tillverkare || '',
              quantity: r.antal || 1,
              status: r.status || 'i_lager',
              condition: r.skick || 'bra',
              location_name: r.plats || '',
              notes: r.anteckningar || ''
            }))
          );
          refetch();
          alert(`${valid.length} arbetskläder importerade!`);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Arbetskläder & Utrustning</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{groupedItems.length} artiklar</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="hidden lg:flex gap-2"
            >
              <Download className="w-4 h-4" />
              Ladda ner mall
            </Button>
            <Button
              onClick={handleImportClick}
              disabled={uploading}
              variant="outline"
              className="hidden lg:flex gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Laddar...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Importera Excel
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => setShowCheckoutModal(true)}
              variant="outline"
              className="gap-2"
            >
              <ScanLine className="w-4 h-4" />
              Plocka ut
            </Button>
            <Button
              onClick={() => setShowScanModal(true)}
              variant="outline"
              className="gap-2"
            >
              <ScanLine className="w-4 h-4" />
              Inventera
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Ny artikel
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <SearchFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          subcategoryFilter={subcategoryFilter}
          onSubcategoryChange={setSubcategoryFilter}
          locationFilter={sizeFilter}
          onLocationChange={setSizeFilter}
          manufacturerFilter={manufacturerFilter}
          onManufacturerChange={setManufacturerFilter}
          conditionFilter={conditionFilter}
          onConditionChange={setConditionFilter}
          availableCategories={categories}
          availableSubcategories={subcategories}
          availableLocations={sizes}
          availableManufacturers={manufacturers}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onClearFilters={() => {
            setStatusFilter('all');
            setCategoryFilter('all');
            setSubcategoryFilter('all');
            setSizeFilter('all');
            setManufacturerFilter('all');
            setConditionFilter('all');
          }}
          showViewToggle={true}
          statusOptions={[
            { value: 'i_lager', label: 'I lager' },
            { value: 'i_bruk', label: 'I bruk' },
            { value: 'saknas', label: 'Saknas' },
            { value: 'kasserad', label: 'Kasserad' },
          ]}
          conditionOptions={[
            { value: 'ny', label: 'Ny' },
            { value: 'bra', label: 'Bra' },
            { value: 'okej', label: 'Okej' },
            { value: 'dålig', label: 'Dålig' },
          ]}
        />

        {/* Items Display */}
        {groupedItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Inga artiklar hittades</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6' : 'space-y-4 mt-6'}>
            {groupedItems.map((group) => (
              <div
                key={group.name}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{group.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{group.subcategory}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(group.items[0])}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Kategori:</span>
                    <Badge variant="outline">{group.category}</Badge>
                  </div>
                  {group.manufacturer && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tillverkare:</span>
                       <span className="font-medium dark:text-gray-200">{group.manufacturer}</span>
                    </div>
                  )}
                  {group.sizes.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Storlekar:</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {group.sizes.sort((a, b) => {
                          const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
                          return sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size);
                        }).map((s, idx) => (
                          <Badge key={idx} variant="outline" className="bg-blue-50 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700">{s.size} ({s.quantity})</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {group.location_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Plats:</span>
                       <span className="font-medium dark:text-gray-200">{group.location_name}</span>
                    </div>
                  )}
                </div>

                {group.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 border-t dark:border-gray-700 pt-2">{group.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ArbetskläderUtrustningFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        item={editingItem}
        locations={locations}
      />

      <ArbetskläderScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        items={items}
        onRefresh={refetch}
      />

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        items={items}
      />
    </div>
  );
}