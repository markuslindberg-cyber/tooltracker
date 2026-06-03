import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle2, AlertTriangle, Calendar, User, MapPin,
  Package, ChevronDown, ChevronUp, Download, ClipboardList, Trash2, Loader2,
  Wrench, Shovel, Shirt, SprayCan, Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

function exportReport(report) {
  const date = format(new Date(report.performed_at), 'yyyy-MM-dd');
  const header = ['Namn', 'Typ', 'Kategori', 'Streckkod', 'Plats', 'Status', 'Skick', 'Resultat'];
  const toRow = (item, result) => [item.name, item.type === 'handtool' ? 'Handredskap' : 'Maskin', item.category || '', item.barcode || '', item.location_name || '', item.status || '', item.condition || '', result];
  const rows = [
    ...(report.checked_list || []).map(i => toRow(i, 'Kontrollerad')),
    ...(report.unchecked_list || []).map(i => toRow(i, 'EJ KONTROLLERAD')),
  ];
  const loc = report.location_name || 'Öppen';
  const csv = [
    [`Inventeringsrapport - ${loc} - ${date}`],
    [`Utförd av: ${report.performed_by_name || report.performed_by_email || 'Okänd'}`],
    [`Kontrollerade: ${report.checked_items} / ${report.total_items}`],
    [],
    header,
    ...rows,
  ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `inventering_${loc.replace(/\s/g, '_')}_${date}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const TYPE_CONFIG = {
  tools:         { label: 'Maskiner',               icon: Wrench,   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  handtools:     { label: 'Handredskap',            icon: Shovel,   color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'arbetskläder':{ label: 'Arbetskläder',           icon: Shirt,    color: 'bg-purple-100 text-purple-700 border-purple-200' },
  lokalvards:    { label: 'Lokalvård',              icon: SprayCan, color: 'bg-teal-100 text-teal-700 border-teal-200' },
  both:          { label: 'Maskiner & Handredskap', icon: Package,  color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  all:           { label: 'Alla typer',             icon: Package,  color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function getTypeConfig(toolType) {
  if (!toolType) return TYPE_CONFIG.all;
  if (TYPE_CONFIG[toolType]) return TYPE_CONFIG[toolType];
  // comma-separated types
  return { label: toolType, icon: Package, color: 'bg-gray-100 text-gray-700 border-gray-200' };
}

function CategorySection({ title, items, bgColor, textColor, icon }) {
  const [open, setOpen] = useState(false);
  const byCategory = {};
  items.forEach(item => {
    const cat = item.category || 'Övrigt';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(item);
  });
  const categories = Object.keys(byCategory).sort();

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-sm font-semibold px-1 py-1">
        <span className={`flex items-center gap-2 ${textColor}`}>{icon} {title} ({items.length})</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="space-y-3 pl-1">
          {categories.map(cat => (
            <div key={cat} className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm">
                <span className="font-medium text-gray-800">{cat}</span>
                <span className="text-xs text-gray-500">{byCategory[cat].length} st</span>
              </div>
              <div className="divide-y divide-gray-50">
                {byCategory[cat].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between text-sm py-2 px-4 ${bgColor}`}>
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <div className="flex items-center gap-2">
                      {item.location_name && <span className="text-xs text-gray-500">{item.location_name}</span>}
                      <Badge variant="outline" className="text-xs">
                        {item.type === 'handtool' ? 'Handredskap' : item.type === 'arbetskläder' ? 'Arbetskläder' : item.type === 'lokalvards' ? 'Lokalvård' : 'Maskin'}
                      </Badge>
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
}

function ReportCard({ report, isAdmin, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const unchecked = report.unchecked_list || [];
  const checked = report.checked_list || [];
  const pct = report.total_items > 0 ? Math.round((report.checked_items / report.total_items) * 100) : 0;
  const tc = getTypeConfig(report.tool_type);
  const TypeIcon = tc.icon;

  const handleDelete = async () => {
    if (!confirm('Vill du radera denna rapport? Det går inte att ångra.')) return;
    setDeleting(true);
    await onDelete(report.id);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Origin icon */}
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
              {report.mode === 'open'
                ? <Globe className="w-5 h-5 text-gray-500" />
                : <MapPin className="w-5 h-5 text-gray-500" />}
            </div>
            <div className="flex-1 min-w-0">
              {/* Location + type */}
              <p className="font-semibold text-gray-900 text-base leading-tight">
                {report.location_name || 'Öppen inventering'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge className={`text-xs border ${tc.color}`}>
                  <TypeIcon className="w-3 h-3 mr-1" />{tc.label}
                </Badge>
                {pct === 100
                  ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs border">100% ✓</Badge>
                  : <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs border">{pct}%</Badge>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(report.performed_at), 'd MMM yyyy HH:mm', { locale: sv })}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {report.performed_by_name || report.performed_by_email || 'Okänd'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="outline" onClick={() => exportReport(report)}>
              <Download className="w-3.5 h-3.5" />
            </Button>
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="text-green-700 font-medium">{report.checked_items} kontrollerade</span>
            <span className="text-amber-700 font-medium">{report.unchecked_items} ej kontrollerade</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-[#8B1E1E] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-4">
          {unchecked.length > 0 && (
            <CategorySection title="Ej kontrollerade" items={unchecked} bgColor="bg-amber-50" textColor="text-amber-700" icon={<AlertTriangle className="w-4 h-4" />} />
          )}
          {checked.length > 0 && (
            <CategorySection title="Kontrollerade" items={checked} bgColor="bg-green-50" textColor="text-green-700" icon={<CheckCircle2 className="w-4 h-4" />} />
          )}
        </div>
      )}
    </div>
  );
}

export default function InventoryReports() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['inventoryReports'],
    queryFn: () => base44.entities.InventoryReport.list('-performed_at', 200),
  });

  const isAdmin = user?.role === 'admin';

  const locations = useMemo(() => {
    const locs = [...new Set(reports.map(r => r.location_name).filter(Boolean))].sort();
    return locs;
  }, [reports]);

  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (typeFilter !== 'all' && r.tool_type !== typeFilter) return false;
      if (locationFilter !== 'all') {
        if (locationFilter === '__open__' && r.location_name) return false;
        if (locationFilter !== '__open__' && r.location_name !== locationFilter) return false;
      }
      return true;
    });
  }, [reports, typeFilter, locationFilter]);

  // Group by type label for display
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(r => {
      const key = r.tool_type || 'all';
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return groups;
  }, [filtered]);

  const typeOrder = ['tools', 'handtools', 'both', 'arbetskläder', 'lokalvards', 'all'];
  const sortedGroupKeys = Object.keys(grouped).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

  const handleDelete = async (id) => {
    await base44.entities.InventoryReport.delete(id);
    queryClient.invalidateQueries(['inventoryReports']);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventeringsrapporter</h1>
            <p className="text-gray-500 mt-1">{reports.length} rapporter totalt</p>
          </div>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla typer</SelectItem>
                <SelectItem value="tools">Maskiner</SelectItem>
                <SelectItem value="handtools">Handredskap</SelectItem>
                <SelectItem value="arbetskläder">Arbetskläder</SelectItem>
                <SelectItem value="lokalvards">Lokalvård</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Plats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla platser</SelectItem>
                <SelectItem value="__open__">Öppen inventering</SelectItem>
                {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B1E1E] rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Inga rapporter hittades</h3>
            <p className="text-gray-500 text-sm">Genomför en inventering för att se rapporter här</p>
          </div>
        )}

        {/* Grouped sections */}
        {sortedGroupKeys.map(key => {
          const tc = getTypeConfig(key);
          const TypeIcon = tc.icon;
          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2">
                <TypeIcon className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{tc.label}</h2>
                <span className="text-xs text-gray-400">({grouped[key].length})</span>
              </div>
              <div className="space-y-3">
                {grouped[key].map(report => (
                  <ReportCard key={report.id} report={report} isAdmin={isAdmin} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}