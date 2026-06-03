import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SprayCan, ArrowRight, AlertTriangle } from 'lucide-react';
import { calculateLokalvardLagerValue } from '@/lib/lokalvardLagerUtils';

export default function LokalvardSection() {
  const { data: articles = [] } = useQuery({
    queryKey: ['ownerLokalvardArticles'],
    queryFn: () => base44.entities.LokalvardsArtikel.list('-updated_date', 10000).then(r => r.filter(a => !a.is_deleted)),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ['ownerLokalvardRequests'],
    queryFn: () => base44.entities.LokalvardArtikelRequest.list('-request_date', 50),
  });

  const { data: uttag = [] } = useQuery({
    queryKey: ['ownerUttag'],
    queryFn: () => base44.entities.Uttag.list(null, 100000).then(r => Array.isArray(r) ? r : []),
  });

  const { data: inkop = [] } = useQuery({
    queryKey: ['ownerInkop'],
    queryFn: () => base44.entities.LokalvardInköp?.list ? base44.entities.LokalvardInköp.list() : Promise.resolve([]),
  });

  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const lowStock = articles.filter(a => (a.current_quantity || 0) <= (a.lagertroskelvarde || 10)).length;
  const totalArticles = articles.length;
  const totalLagerValue = calculateLokalvardLagerValue(articles, uttag, inkop);

  // Uttag this month
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const uttagThisMonth = uttag.filter(u => u.manad === currentMonth);
  const monthCost = uttagThisMonth.reduce((sum, u) => sum + (u.total_kostnad || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <SprayCan className="w-4 h-4 text-emerald-600" />
          </div>
          Lokalvård
        </h2>
        <Link to="/Lokalvard/Lager">
          <Button variant="ghost" size="sm" className="text-[#8B1E1E]">Visa alla <ArrowRight className="w-3 h-3 ml-1" /></Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Artiklar i lager</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalArticles}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Lagervärde</p>
          <p className="text-2xl font-bold text-[#8B1E1E]">{totalLagerValue.toLocaleString('sv-SE')} kr</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Kostnad denna månad</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{monthCost.toLocaleString('sv-SE')} kr</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Summa av alla uttag till kunder under {new Date().toLocaleString('sv-SE', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Väntande begäran</p>
          <p className="text-2xl font-bold text-amber-600">{pendingRequests}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Low stock alert */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm flex items-center gap-2">
            {lowStock > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            Lågt lager ({lowStock} artiklar)
          </h3>
          {lowStock > 0 ? (
            <div className="space-y-2">
              {articles.filter(a => (a.current_quantity || 0) <= (a.lagertroskelvarde || 10)).slice(0, 5).map(a => (
                <div key={a.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{a.benamning}</span>
                  <span className="text-sm font-medium text-red-600">{a.current_quantity || 0} st</span>
                </div>
              ))}
              {lowStock > 5 && <p className="text-xs text-gray-400">+ {lowStock - 5} fler artiklar</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Alla artiklar har tillräckligt lager</p>
          )}
        </div>

        {/* Recent requests */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Begärningar</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Väntande</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{pendingRequests}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Godkända</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{requests.filter(r => r.status === 'approved').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Slutförda</span>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{requests.filter(r => r.status === 'completed').length}</span>
            </div>
          </div>
          <Link to="/Lokalvard/BegaranAttGodkanna" className="mt-3 block">
            <Button variant="outline" size="sm" className="w-full text-xs">Hantera begärningar <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}