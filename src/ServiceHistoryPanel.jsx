import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ENTITY_LABELS = {
  Tool: 'Maskiner',
  HandTool: 'Handredskap',
  'ArbetskläderUtrustning': 'Arbetskläder',
  LokalvardsArtikel: 'Lokalvård – Lager',
};

const FROM_PATH = '/Administration/Kategorier';

function fetchItems(entityType, categoryName) {
  if (entityType === 'Tool') return base44.entities.Tool.filter({ category: categoryName }, null, 100000);
  if (entityType === 'HandTool') return base44.entities.HandTool.filter({ category: categoryName }, null, 100000);
  if (entityType === 'ArbetskläderUtrustning') return base44.entities.ArbetskläderUtrustning.filter({ category: categoryName }, null, 100000);
  if (entityType === 'LokalvardsArtikel') return base44.entities.LokalvardsArtikel.list(null, 100000);
  return Promise.resolve([]);
}

function getItemName(item, entityType) {
  if (entityType === 'LokalvardsArtikel') return item.benamning || '–';
  return item.name || '–';
}

function getItemSubtitle(item, entityType) {
  if (entityType === 'LokalvardsArtikel') return item.artikelnummer || item.streckkod || '';
  if (entityType === 'Tool') return [item.manufacturer, item.model_number].filter(Boolean).join(' · ');
  if (entityType === 'HandTool') return [item.manufacturer, item.subcategory].filter(Boolean).join(' · ');
  if (entityType === 'ArbetskläderUtrustning') return item.subcategory || '';
  return '';
}

function getItemPath(item, entityType) {
  if (entityType === 'LokalvardsArtikel') {
    if (item.artikelnummer) return `/Lokalvard/Artikel/${item.artikelnummer}`;
    if (item.streckkod) return `/Lokalvard/Artikel/${item.streckkod}`;
  }
  if (entityType === 'Tool') return `/Inventory?toolId=${item.id}`;
  if (entityType === 'HandTool') return `/HandTools?toolId=${item.id}`;
  if (entityType === 'ArbetskläderUtrustning') return `/ArbetskladerUtrustning?toolId=${item.id}`;
  return null;
}

export default function CategoryItemsPanel({ category, onClose }) {
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['categoryItems', category.entity_type, category.name],
    queryFn: () => fetchItems(category.entity_type, category.name),
  });

  const handleItemClick = (item) => {
    const path = getItemPath(item, category.entity_type);
    if (path) {
      navigate(path, { state: { from: FROM_PATH } });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{category.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{ENTITY_LABELS[category.entity_type] || category.entity_type}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Inga artiklar i denna kategori</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => {
                const name = getItemName(item, category.entity_type);
                const subtitle = getItemSubtitle(item, category.entity_type);
                const path = getItemPath(item, category.entity_type);
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleItemClick(item)}
                      disabled={!path}
                      className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-colors ${path ? 'hover:bg-blue-50 cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${path ? 'text-blue-700' : 'text-gray-900'}`}>
                          {name}
                        </p>
                        {subtitle && <p className="text-xs text-gray-400 truncate mt-0.5">{subtitle}</p>}
                      </div>
                      {path && <ArrowRight className="w-4 h-4 text-blue-300 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 shrink-0">
          {items.length} {items.length === 1 ? 'artikel' : 'artiklar'}
        </div>
      </div>
    </div>
  );
}