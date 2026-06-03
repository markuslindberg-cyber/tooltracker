import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Download, Search, ChevronDown, ChevronUp, User, Calendar, Package } from 'lucide-react';

export default function CheckoutReports() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['checkoutReports'],
    queryFn: () => base44.entities.CheckoutReport.list('-checked_out_date', 500),
  });

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const searchLower = search.toLowerCase();
      return (
        report.project?.toLowerCase().includes(searchLower) ||
        report.recipient_first_name?.toLowerCase().includes(searchLower) ||
        report.recipient_last_name?.toLowerCase().includes(searchLower)
      );
    });
  }, [reports, search]);

  const exportToExcel = () => {
    if (filteredReports.length === 0) {
      alert('Inga rapporter att exportera');
      return;
    }
    const headers = ['Projekt', 'Mottagare', 'Datum', 'Antal artiklar', 'Artiklar'];
    const rows = filteredReports.map(report => {
      const itemsText = report.checked_out_items.map(item => `${item.name} (${item.quantity})`).join('; ');
      return [
        report.project || '',
        `${report.recipient_first_name} ${report.recipient_last_name}`,
        new Date(report.checked_out_date).toLocaleDateString('sv-SE'),
        report.checked_out_items.length,
        itemsText,
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `uttagsrapporter_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Uttagsrapporter</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{filteredReports.length} rapporter</p>
        </div>

        {/* Sök + knappar */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Sök efter projekt eller mottagare..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline" className="gap-2 w-full sm:w-auto">
              <Download className="w-4 h-4" />
              Exportera alla
            </Button>
          </div>
        </div>

        {/* Rapporter */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Inga rapporter hittades</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const isExpanded = expandedId === report.id;
              return (
                <div
                  key={report.id}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  {/* Card header – klickbar */}
                  <button
                    className="w-full text-left px-4 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{report.project}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {report.recipient_first_name} {report.recipient_last_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(report.checked_out_date).toLocaleDateString('sv-SE')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {report.checked_out_items.length} artiklar
                        </span>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />}
                  </button>

                  {/* Expanderat innehåll */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-4 bg-gray-50 dark:bg-gray-800/30">
                      {/* Info-grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Mottagare</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {report.recipient_first_name} {report.recipient_last_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Projekt</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{report.project}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Datum & tid</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                            {new Date(report.checked_out_date).toLocaleString('sv-SE')}
                          </p>
                        </div>
                      </div>

                      {/* Artikellista */}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-2">
                          Uttagna artiklar ({report.checked_out_items.length} st)
                        </p>
                        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                          {report.checked_out_items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                {item.subcategory && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.subcategory}</p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs font-semibold">
                                {item.quantity} st
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}