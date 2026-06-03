import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shovel, ArrowRight } from 'lucide-react';

export default function HandredskapSection() {
  const { data: tools = [] } = useQuery({
    queryKey: ['ownerHandTools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 10000).then(r => r.filter(t => !t.is_deleted)),
  });

  const statusMap = {
    i_lager: { label: 'I lager', color: 'bg-emerald-500' },
    i_bruk: { label: 'I bruk', color: 'bg-blue-500' },
    saknas: { label: 'Saknas', color: 'bg-red-500' },
    kasserad: { label: 'Kasserad', color: 'bg-gray-500' },
  };

  const statusCounts = {};
  tools.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });

  const categories = {};
  tools.forEach(t => {
    const cat = t.category || 'Okategoriserad';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const totalValue = tools.reduce((sum, t) => sum + (t.purchase_price || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Shovel className="w-4 h-4 text-orange-600" />
          </div>
          Handredskap
        </h2>
        <Link to="/HandTools">
          <Button variant="ghost" size="sm" className="text-[#8B1E1E]">Visa alla <ArrowRight className="w-3 h-3 ml-1" /></Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Totalt</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tools.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Totalvärde</p>
          <p className="text-2xl font-bold text-[#8B1E1E]">{totalValue.toLocaleString('sv-SE')} kr</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Kategorier</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{Object.keys(categories).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Statusfördelning</h3>
          <div className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => {
              const s = statusMap[status] || { label: status, color: 'bg-gray-400' };
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{s.label}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

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
    </div>
  );
}