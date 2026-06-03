import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shirt, ArrowRight, Clock } from 'lucide-react';

export default function ArbetskladerSection() {
  const { data: items = [] } = useQuery({
    queryKey: ['ownerArbetsklader'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 10000).then(r => r.filter(i => !i.is_deleted)),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['ownerWorkwearRequests'],
    queryFn: () => base44.entities.WorkwearRequest.list('-request_date', 20),
  });

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const completed = requests.filter(r => r.status === 'completed').length;

  const categoryCounts = {};
  items.forEach(i => {
    const cat = i.category || 'Okategoriserad';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + (i.quantity || 1);
  });

  const totalValue = items.reduce((sum, i) => sum + (i.purchase_price || 0) * (i.quantity || 1), 0);
  const totalItems = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Shirt className="w-4 h-4 text-violet-600" />
          </div>
          Arbetskläder & Utrustning
        </h2>
        <Link to="/ArbetskladerUtrustning">
          <Button variant="ghost" size="sm" className="text-[#8B1E1E]">Visa alla <ArrowRight className="w-3 h-3 ml-1" /></Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Artiklar</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{items.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Antal totalt</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalItems}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Totalvärde</p>
          <p className="text-2xl font-bold text-[#8B1E1E]">{totalValue.toLocaleString('sv-SE')} kr</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Väntande begäran</p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Categories */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Per kategori</h3>
          <div className="space-y-2">
            {Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{cat}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{count} st</span>
              </div>
            ))}
          </div>
        </div>

        {/* Requests overview */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Begärningar</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Väntande</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Godkända</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{approved}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Slutförda</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{completed}</span>
            </div>
          </div>
          <Link to="/Arbetsklader/Forfragan" className="mt-3 block">
            <Button variant="outline" size="sm" className="w-full text-xs">Hantera förfrågningar <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}