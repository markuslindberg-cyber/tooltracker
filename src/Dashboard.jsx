import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, AlertTriangle, Minus, Save, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

function sizeSort(a, b) {
  const aIdx = SIZE_ORDER.indexOf(a);
  const bIdx = SIZE_ORDER.indexOf(b);
  // Both in text size order
  if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
  // Both numeric (e.g. shoe sizes, glove sizes)
  const aNum = parseFloat(a);
  const bNum = parseFloat(b);
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
  // Text sizes before numeric
  if (aIdx !== -1) return -1;
  if (bIdx !== -1) return 1;
  return (a || '').localeCompare(b || '');
}

export default function ArbetskläderStreckkodhantering() {
  const [selectedArticle, setSelectedArticle] = useState('');
  const [barcodeEdits, setBarcodeEdits] = useState({}); // keyed by size string
  const [savingKey, setSavingKey] = useState(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['arbetskläder-streckkod'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 500),
  });

  const activeItems = useMemo(() => items.filter(i => !i.is_deleted), [items]);

  // Unique article names
  const articleNames = useMemo(() => {
    return [...new Set(activeItems.map(i => i.name))].sort();
  }, [activeItems]);

  // Group selected article's items by size
  const sizeGroups = useMemo(() => {
    if (!selectedArticle) return [];
    const grouped = {};
    activeItems.filter(i => i.name === selectedArticle).forEach(item => {
      const key = item.size || '__none__';
      if (!grouped[key]) {
        grouped[key] = { size: item.size || '', items: [], barcode: item.barcode || '' };
      }
      grouped[key].items.push(item);
      // Use the first non-empty barcode found
      if (!grouped[key].barcode && item.barcode) {
        grouped[key].barcode = item.barcode;
      }
    });
    return Object.values(grouped).sort((a, b) => sizeSort(a.size, b.size));
  }, [activeItems, selectedArticle]);

  // Build a map of barcode -> article names (excluding current article) for duplicate detection
  const barcodeToOtherArticles = useMemo(() => {
    const map = {};
    activeItems.filter(i => i.barcode && i.name !== selectedArticle).forEach(i => {
      if (!map[i.barcode]) map[i.barcode] = new Set();
      map[i.barcode].add(`${i.name}${i.size ? ` (${i.size})` : ''}`);
    });
    return map;
  }, [activeItems, selectedArticle]);

  const getCurrentBarcode = (group) => {
    const key = group.size || '__none__';
    return barcodeEdits[key] !== undefined ? barcodeEdits[key] : group.barcode;
  };

  const handleBarcodeChange = (size, value) => {
    const key = size || '__none__';
    setBarcodeEdits(prev => ({ ...prev, [key]: value }));
  };

  const getDuplicateWarning = (group) => {
    const barcode = getCurrentBarcode(group);
    if (!barcode) return null;
    const others = barcodeToOtherArticles[barcode];
    if (others && others.size > 0) {
      return `Redan använd av: ${[...others].join(', ')}`;
    }
    return null;
  };

  // Save barcode for one size group — updates ALL items with same name+size
  const saveBarcode = async (group) => {
    const key = group.size || '__none__';
    const newBarcode = getCurrentBarcode(group);
    setSavingKey(key);
    for (const item of group.items) {
      await base44.entities.ArbetskläderUtrustning.update(item.id, { barcode: newBarcode });
    }
    queryClient.invalidateQueries({ queryKey: ['arbetskläder-streckkod'] });
    setBarcodeEdits(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSavingKey(null);
    toast({ title: 'Sparat', description: `Streckkod för ${group.size || 'artikeln'} uppdaterad (${group.items.length} poster).` });
  };

  // Save all edited sizes
  const saveAll = async () => {
    const editedKeys = Object.keys(barcodeEdits);
    if (editedKeys.length === 0) return;
    setSavingKey('all');
    for (const group of sizeGroups) {
      const key = group.size || '__none__';
      if (barcodeEdits[key] !== undefined) {
        const newBarcode = barcodeEdits[key];
        for (const item of group.items) {
          await base44.entities.ArbetskläderUtrustning.update(item.id, { barcode: newBarcode });
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['arbetskläder-streckkod'] });
    setBarcodeEdits({});
    setSavingKey(null);
    toast({ title: 'Allt sparat', description: `Streckkoder uppdaterade.` });
  };

  const hasEdits = Object.keys(barcodeEdits).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Streckkodhantering</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Hantera streckkoder per storlek för arbetskläder</p>
        </div>

        {/* Article selector */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 mb-6">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Välj artikel</label>
          <Select value={selectedArticle} onValueChange={(v) => { setSelectedArticle(v); setBarcodeEdits({}); }}>
            <SelectTrigger>
              <SelectValue placeholder="Välj en artikel..." />
            </SelectTrigger>
            <SelectContent>
              {articleNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Barcode table grouped by size */}
        {selectedArticle && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{selectedArticle}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{sizeGroups.length} storlekar</p>
              </div>
              {hasEdits && (
                <Button onClick={saveAll} disabled={savingKey === 'all'} size="sm" className="gap-2">
                  {savingKey === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Spara alla
                </Button>
              )}
            </div>

            {sizeGroups.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Inga storleksvarianter hittades för denna artikel.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {sizeGroups.map(group => {
                  const key = group.size || '__none__';
                  const barcode = getCurrentBarcode(group);
                  const isEdited = barcodeEdits[key] !== undefined;
                  const duplicate = getDuplicateWarning(group);
                  const isEmpty = !barcode;
                  const totalQty = group.items.reduce((sum, i) => sum + (i.quantity || 0), 0);

                  return (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4">
                      {/* Size badge */}
                      <div className="flex items-center gap-3 sm:w-32 shrink-0">
                        <Badge variant="outline" className="text-sm px-3 py-1 min-w-[3rem] justify-center">
                          {group.size || '—'}
                        </Badge>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {totalQty} st / {group.items.length} {group.items.length === 1 ? 'post' : 'poster'}
                        </span>
                      </div>

                      {/* Barcode input */}
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={barcode}
                          onChange={(e) => handleBarcodeChange(group.size, e.target.value)}
                          placeholder="Ange streckkod..."
                          className="flex-1"
                        />

                        {duplicate ? (
                          <div className="shrink-0" title={duplicate}>
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          </div>
                        ) : isEmpty ? (
                          <div className="shrink-0" title="Streckkod saknas">
                            <Minus className="w-5 h-5 text-amber-500" />
                          </div>
                        ) : (
                          <div className="shrink-0" title="OK">
                            <Check className="w-5 h-5 text-green-500" />
                          </div>
                        )}

                        {isEdited && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveBarcode(group)}
                            disabled={savingKey === key}
                            className="shrink-0"
                          >
                            {savingKey === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>

                      {duplicate && (
                        <p className="text-xs text-red-500 sm:hidden">{duplicate}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {sizeGroups.some(g => getDuplicateWarning(g)) && (
              <div className="hidden sm:block p-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Varning: Vissa streckkoder används redan av andra artiklar.
                </p>
              </div>
            )}
          </div>
        )}

        {!selectedArticle && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            Välj en artikel ovan för att hantera streckkoder.
          </div>
        )}
      </div>
    </div>
  );
}