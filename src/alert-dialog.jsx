import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight, TrendingUp, Users, AlertTriangle, Wrench } from 'lucide-react';
import { calculateDepreciatedValue } from '@/lib/depreciationUtils';

export default function MaskinerSection() {
  const { data: tools = [] } = useQuery({
    queryKey: ['ownerTools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 10000).then(r => r.filter(t => !t.is_deleted)),
  });

  const { data: serviceRecords = [] } = useQuery({
    queryKey: ['ownerServiceRecords'],
    queryFn: () => base44.entities.ServiceRecord.list('-service_date', 5),
  });

  const { data: depSettings = [] } = useQuery({
    queryKey: ['depreciationSettings'],
    queryFn: () => base44.entities.DepreciationSetting.list(),
  });

  const HIDDEN = ['såld', 'sålda', 'retired'];
  const active = tools.filter(t => !HIDDEN.includes(t.status));
  const available = active.filter(t => t.status === 'available' || t.status === 'Tillgänglig').length;
  const inUse = active.filter(t => t.status === 'in_use').length;
  const iLager = active.filter(t => t.status === 'i_lager').length;
  const maintenance = active.filter(t => t.status === 'maintenance').length;
  const missing = tools.filter(t => t.status === 'missing').length;
  const purchaseValue = active.reduce((sum, t) => sum + (t.purchase_price || 0), 0);
  const totalValue = active.reduce((sum, t) => {
    const { currentValue } = calculateDepreciatedValue(t, depSettings);
    return sum + currentValue;
  }, 0);

  const statuses = [
    { label: 'Tillgänglig', count: available, color: 'bg-emerald-500' },
    { label: 'I bruk', count: inUse, color: 'bg-blue-500' },
    { label: 'I lager', count: iLager, color: 'bg-cyan-500' },
    { label: 'Underhåll', count: maintenance, color: 'bg-amber-500' },
    { label: 'Saknas', count: missing, color: 'bg-red-500' },
  ];

  // Category breakdown
  const categories = {};
  active.forEach(t => {
    const cat = t.category || 'Okategoriserad';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8B1E1E]/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-[#8B1E1E]" />
          </div>
          Maskiner
        </h2>
        <Link to="/Inventory">
          <Button variant="ghost" size="sm" className="text-[#8B1E1E]">Visa alla <ArrowRight className="w-3 h-3 ml-1" /></Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Totalt</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{active.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Investerat</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{purchaseValue.toLocaleString('sv-SE')} kr</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">Bokfört värde</p>
          <p className="text-2xl font-bold text-[#8B1E1E]">{totalValue.toLocaleString('sv-SE')} kr</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">I bruk</p>
          <p className="text-2xl font-bold text-blue-600">{inUse}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Underhåll</p>
          <p className="text-2xl font-bold text-amber-600">{maintenance}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Statusfördelning</h3>
          <div className="space-y-2">
            {statuses.filter(s => s.count > 0).map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top categories */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Kategorier (topp)</h3>
          <div className="space-y-2">
            {topCategories.map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{cat}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent service */}
      {serviceRecords.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Senaste service</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {serviceRecords.slice(0, 4).map(sr => (
              <div key={sr.id} className="px-5 py-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{sr.tool_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{sr.description || sr.service_type} · {sr.cost?.toLocaleString('sv-SE')} kr</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}