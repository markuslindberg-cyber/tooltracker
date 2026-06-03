import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw, AlertTriangle, Loader2, Package, Shirt, Shovel, SprayCan, ChevronDown, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

const SECTIONS = [
  {
    key: 'Tool',
    label: 'Maskiner',
    icon: Package,
    color: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-200',
    headerColor: 'bg-blue-50',
    getName: (item) => item.name,
    getExtra: (item) => [item.category, item.manufacturer].filter(Boolean).join(' · '),
  },
  {
    key: 'HandTool',
    label: 'Handredskap',
    icon: Shovel,
    color: 'bg-green-100 text-green-700',
    borderColor: 'border-green-200',
    headerColor: 'bg-green-50',
    getName: (item) => item.name,
    getExtra: (item) => [item.category, item.manufacturer].filter(Boolean).join(' · '),
  },
  {
    key: 'ArbetskläderUtrustning',
    label: 'Arbetskläder & Utrustning',
    icon: Shirt,
    color: 'bg-purple-100 text-purple-700',
    borderColor: 'border-purple-200',
    headerColor: 'bg-purple-50',
    getName: (item) => item.name,
    getExtra: (item) => [item.category, item.subcategory, item.size].filter(Boolean).join(' · '),
  },
  {
    key: 'LokalvardsArtikel',
    label: 'Lokalvård – Lager',
    icon: SprayCan,
    color: 'bg-orange-100 text-orange-700',
    borderColor: 'border-orange-200',
    headerColor: 'bg-orange-50',
    getName: (item) => item.benamning,
    getExtra: (item) => [item.subcategory, item.streckkod].filter(Boolean).join(' · '),
  },
];

function DaysLeftBadge({ deletedAt }) {
  if (!deletedAt) return null;
  const daysLeft = 30 - differenceInDays(new Date(), new Date(deletedAt));
  if (daysLeft <= 3) return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{daysLeft}d kvar</span>;
  if (daysLeft <= 7) return <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{daysLeft}d kvar</span>;
  return <span className="text-xs text-gray-400">{daysLeft}d kvar</span>;
}

function SectionGroup({ section, items, onRestore, onPermanentDelete, restoring, deleting }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = section.icon;

  return (
    <div className={`border ${section.borderColor} rounded-xl overflow-hidden`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${section.headerColor} hover:opacity-90 transition-opacity`}
      >
        <Icon className="w-5 h-5 text-gray-600" />
        <span className="font-semibold text-gray-800 flex-1 text-left">{section.label}</span>
        <Badge className={section.color}>{items.length} objekt</Badge>
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="bg-white divide-y divide-gray-50">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{section.getName(item)}</p>
                {section.getExtra(item) && (
                  <p className="text-xs text-gray-500 truncate">{section.getExtra(item)}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  Raderades {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true, locale: sv })}
                </p>
              </div>
              <DaysLeftBadge deletedAt={item.deleted_at} />
              <button
                onClick={() => onRestore(section.key, item)}
                disabled={restoring === item.id}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                title="Återställ"
              >
                {restoring === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onPermanentDelete(section.key, item)}
                disabled={deleting === item.id}
                className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                title="Radera permanent"
              >
                {deleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Papperskorg() {
  const queryClient = useQueryClient();
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: tools = [], isLoading: l1 } = useQuery({
    queryKey: ['trash_tools'],
    queryFn: () => base44.entities.Tool.filter({ is_deleted: true }, '-deleted_at', 1000),
  });
  const { data: handTools = [], isLoading: l2 } = useQuery({
    queryKey: ['trash_handtools'],
    queryFn: () => base44.entities.HandTool.filter({ is_deleted: true }, '-deleted_at', 1000),
  });
  const { data: arbetsklader = [], isLoading: l3 } = useQuery({
    queryKey: ['trash_arbetsklader'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.filter({ is_deleted: true }, '-deleted_at', 1000),
  });
  const { data: lokalvard = [], isLoading: l4 } = useQuery({
    queryKey: ['trash_lokalvard'],
    queryFn: () => base44.entities.LokalvardsArtikel.filter({ is_deleted: true }, '-deleted_at', 1000),
  });

  const isLoading = l1 || l2 || l3 || l4;

  const dataMap = {
    Tool: tools,
    HandTool: handTools,
    ArbetskläderUtrustning: arbetsklader,
    LokalvardsArtikel: lokalvard,
  };

  const totalCount = tools.length + handTools.length + arbetsklader.length + lokalvard.length;

  const handleRestore = async (entityKey, item) => {
    setRestoring(item.id);
    await base44.entities[entityKey].update(item.id, { is_deleted: false, deleted_at: null });
    queryClient.invalidateQueries([`trash_${entityKey.toLowerCase()}`]);
    queryClient.invalidateQueries([entityKey.toLowerCase()]);
    setRestoring(null);
    toast.success(`"${SECTIONS.find(s => s.key === entityKey)?.getName(item)}" återställd!`);
  };

  const handlePermanentDelete = async (entityKey, item) => {
    const name = SECTIONS.find(s => s.key === entityKey)?.getName(item);
    if (!window.confirm(`Radera "${name}" permanent? Detta kan inte ångras.`)) return;
    setDeleting(item.id);
    await base44.entities[entityKey].delete(item.id);
    queryClient.invalidateQueries([`trash_${entityKey.toLowerCase()}`]);
    setDeleting(null);
    toast.success(`"${name}" raderades permanent.`);
  };

  const handleEmptyAll = async () => {
    if (!window.confirm(`Radera ALLA ${totalCount} objekt i papperskorgen permanent? Detta kan inte ångras.`)) return;
    for (const section of SECTIONS) {
      const items = dataMap[section.key];
      for (const item of items) {
        await base44.entities[section.key].delete(item.id);
      }
    }
    queryClient.invalidateQueries(['trash_tools']);
    queryClient.invalidateQueries(['trash_handtools']);
    queryClient.invalidateQueries(['trash_arbetsklader']);
    queryClient.invalidateQueries(['trash_lokalvard']);
    toast.success('Papperskorgen tömd!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900">Papperskorg</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Raderade objekt sparas i 30 dagar innan de tas bort permanent.
            {totalCount > 0 && ` ${totalCount} objekt totalt.`}
          </p>
        </div>
        {totalCount > 0 && (
          <Button
            variant="outline"
            onClick={handleEmptyAll}
            className="text-red-600 border-red-200 hover:bg-red-50 gap-2 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Töm papperskorg
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-amber-800">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Objekt raderas automatiskt permanent 30 dagar efter de hamnar i papperskorgen. Återställ dem om du vill behålla dem.</span>
      </div>

      {/* Empty state */}
      {totalCount === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium text-gray-500">Papperskorgen är tom</p>
          <p className="text-sm mt-1">Raderade objekt visas här i 30 dagar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {SECTIONS.map(section => {
            const items = dataMap[section.key];
            if (items.length === 0) return null;
            return (
              <SectionGroup
                key={section.key}
                section={section}
                items={items}
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
                restoring={restoring}
                deleting={deleting}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}