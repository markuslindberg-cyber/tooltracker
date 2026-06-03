import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Pencil, Check, X, ChevronDown, ChevronRight, Tag, Layers, Trash2, AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import CategoryItemsPanel from '@/components/CategoryItemsPanel';

const ENTITY_LABELS = {
  Tool: 'Maskiner',
  HandTool: 'Handredskap',
  'ArbetskläderUtrustning': 'Arbetskläder',
  LokalvardsArtikel: 'Lokalvård – Lager',
};

const ENTITY_COLORS = {
  Tool: 'bg-blue-100 text-blue-700',
  HandTool: 'bg-green-100 text-green-700',
  'ArbetskläderUtrustning': 'bg-purple-100 text-purple-700',
  LokalvardsArtikel: 'bg-orange-100 text-orange-700',
};

function EditableField({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  const handleSave = () => {
    if (val.trim() && val.trim() !== value) onSave(val.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          className="border border-gray-300 rounded px-2 py-0.5 text-sm w-48 focus:outline-none focus:border-blue-400"
        />
        <button onClick={handleSave} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
        <button onClick={() => { setVal(value); setEditing(false); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 group">
      {value}
      <button onClick={() => { setVal(value); setEditing(true); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity">
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

// Warning dialog when category has items
function DeleteBlockedDialog({ count, entityLabel, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Kan inte radera kategorin</h2>
            <p className="text-sm text-gray-600 mt-1">
              Det finns <strong>{count} {entityLabel.toLowerCase()}</strong> som använder den här kategorin.
              Du måste byta kategori på dem innan du kan radera.
            </p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800">
          Gå till respektive sida, filtrera på kategorin och byt kategori på alla poster. Kom sedan tillbaka hit och försök igen.
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Stäng</Button>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ category, itemCount, onUpdateName, onUpdateSubcat, onDelete, onShowItems }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Är du säker på att du vill radera kategorin "${category.name}"?`)) return;
    setDeleting(true);
    await onDelete(category);
    setDeleting(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-start gap-2 px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-gray-400 mt-0.5 shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>

        {/* Main content */}
        <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
          {/* Top row: name + delete */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 flex-1 min-w-0 truncate">
              <EditableField value={category.name} onSave={(newName) => onUpdateName(category, newName)} />
            </span>
            <button
              onClick={e => { e.stopPropagation(); handleDelete(); }}
              disabled={deleting}
              className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 active:text-red-600 transition-colors rounded-lg hover:bg-red-50"
              title="Radera kategori"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Bottom row: badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge className={`text-xs ${ENTITY_COLORS[category.entity_type]}`}>
              {ENTITY_LABELS[category.entity_type] || category.entity_type}
            </Badge>
            {itemCount !== undefined && (
              <button
                onClick={e => { e.stopPropagation(); if (itemCount > 0) onShowItems(category); }}
                className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                  itemCount > 0
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:bg-blue-300 cursor-pointer'
                    : 'bg-gray-50 text-gray-400 cursor-default'
                }`}
              >
                {itemCount} {itemCount === 1 ? 'artikel' : 'artiklar'}
              </button>
            )}
            <span className="text-xs text-gray-400">{(category.subcategories || []).length} underkategorier</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          {(category.subcategories || []).length === 0 ? (
            <p className="text-sm text-gray-400 italic">Inga underkategorier registrerade</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {category.subcategories.map((sub, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                  <Layers className="w-3 h-3 text-gray-400 shrink-0" />
                  <EditableField value={sub} onSave={(newSub) => onUpdateSubcat(category, sub, newSub)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CategoryManagement() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [blockedDialog, setBlockedDialog] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEntity, setNewCatEntity] = useState('Tool');
  const [adding, setAdding] = useState(false);
  const [itemsPanelCategory, setItemsPanelCategory] = useState(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list(null, 100000),
  });

  const { data: countsData } = useQuery({
    queryKey: ['categoryCounts'],
    queryFn: () => base44.functions.invoke('getCategoryCounts', {}).then(r => r.data.counts),
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncCategories', {});
      const { created, updated } = res.data;
      toast.success(`Synkronisering klar! ${created} skapade, ${updated} uppdaterade.`);
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['categoryCounts']);
    } catch (err) {
      toast.error('Fel vid synkronisering: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateName = async (category, newName) => {
    try {
      const res = await base44.functions.invoke('updateCategoryName', {
        categoryId: category.id,
        oldName: category.name,
        newName,
        entityType: category.entity_type,
      });
      toast.success(`Kategori uppdaterad! ${res.data.updatedCount} poster påverkade.`);
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['categoryCounts']);
    } catch (err) {
      toast.error('Fel: ' + err.message);
    }
  };

  const handleUpdateSubcat = async (category, oldSubcat, newSubcat) => {
    try {
      const res = await base44.functions.invoke('updateSubcategoryName', {
        categoryId: category.id,
        oldSubcat,
        newSubcat,
        entityType: category.entity_type,
        categoryName: category.name,
      });
      toast.success(`Underkategori uppdaterad! ${res.data.updatedCount} poster påverkade.`);
      queryClient.invalidateQueries(['categories']);
    } catch (err) {
      toast.error('Fel: ' + err.message);
    }
  };

  const handleDelete = async (category) => {
    try {
      const res = await base44.functions.invoke('deleteCategory', {
        categoryId: category.id,
        categoryName: category.name,
        entityType: category.entity_type,
      });
      if (res.data?.error === 'ITEMS_EXIST') {
        setBlockedDialog({ count: res.data.count, entityLabel: ENTITY_LABELS[category.entity_type] || 'poster' });
        return;
      }
      toast.success(`Kategorin "${category.name}" raderades.`);
      queryClient.invalidateQueries(['categories']);
      queryClient.invalidateQueries(['categoryCounts']);
    } catch (err) {
      const data = err.response?.data;
      if (data?.error === 'ITEMS_EXIST') {
        setBlockedDialog({ count: data.count, entityLabel: ENTITY_LABELS[category.entity_type] || 'poster' });
      } else {
        toast.error('Fel vid radering: ' + (err.message || 'Okänt fel'));
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAdding(true);
    try {
      await base44.entities.Category.create({
        name: newCatName.trim(),
        entity_type: newCatEntity,
        subcategories: [],
        page_label: { Tool: 'Maskiner / Inventarie', HandTool: 'Handredskap', 'ArbetskläderUtrustning': 'Arbetskläder', LokalvardsArtikel: 'Lokalvård – Lager' }[newCatEntity],
      });
      toast.success(`Kategorin "${newCatName.trim()}" skapades.`);
      setNewCatName('');
      setShowAddForm(false);
      queryClient.invalidateQueries(['categories']);
    } catch (err) {
      toast.error('Fel: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const entityTypes = ['all', ...Object.keys(ENTITY_LABELS)];

  const filtered = filterType === 'all'
    ? categories
    : categories.filter(c => c.entity_type === filterType);

  const grouped = {};
  filtered.forEach(cat => {
    const key = cat.entity_type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(cat);
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {blockedDialog && (
        <DeleteBlockedDialog
          count={blockedDialog.count}
          entityLabel={blockedDialog.entityLabel}
          onClose={() => setBlockedDialog(null)}
        />
      )}

      {itemsPanelCategory && (
        <CategoryItemsPanel
          category={itemsPanelCategory}
          onClose={() => setItemsPanelCategory(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Kategorier</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hantera kategori- och underkategorinamn globalt i appen</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(v => !v)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Ny kategori
          </Button>
          <Button onClick={handleSync} disabled={syncing} className="bg-[#8B1E1E] hover:bg-[#7a1a1a] gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Synkronisera
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-gray-500">Kategorinamn</label>
            <input
              autoFocus
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setShowAddForm(false); }}
              placeholder="T.ex. Grävmaskiner"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Tillhör</label>
            <select
              value={newCatEntity}
              onChange={e => setNewCatEntity(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddCategory} disabled={adding || !newCatName.trim()} className="gap-1">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Spara
            </Button>
            <Button variant="outline" onClick={() => { setShowAddForm(false); setNewCatName(''); }}>
              Avbryt
            </Button>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        <strong>Tips:</strong> Klicka på "Synkronisera kategorier" för att hämta alla kategorier. Hovra över ett kategorinamn för att redigera det – ändringen uppdateras automatiskt på alla poster i appen.
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {entityTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === type
                ? 'bg-[#8B1E1E] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {type === 'all' ? 'Alla' : ENTITY_LABELS[type]}
            {type !== 'all' && (
              <span className="ml-1.5 opacity-70">
                ({categories.filter(c => c.entity_type === type).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Inga kategorier hittades</p>
          <p className="text-sm mt-1">Klicka på "Synkronisera kategorier" för att hämta alla kategorier från systemet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([entityType, cats]) => (
            <div key={entityType}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold text-gray-700">{ENTITY_LABELS[entityType] || entityType}</h2>
                <span className="text-xs text-gray-400">({cats.length} kategorier)</span>
              </div>
              <div className="space-y-2">
                {cats.sort((a, b) => a.name.localeCompare(b.name, 'sv')).map(cat => {
                  const countKey = `${cat.entity_type}::${cat.name}`;
                  const itemCount = countsData ? (countsData[countKey] || 0) : undefined;
                  return (
                    <div key={cat.id} className="group">
                      <CategoryRow
                        category={cat}
                        itemCount={itemCount}
                        onUpdateName={handleUpdateName}
                        onUpdateSubcat={handleUpdateSubcat}
                        onDelete={handleDelete}
                        onShowItems={setItemsPanelCategory}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}