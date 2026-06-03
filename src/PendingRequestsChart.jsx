import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ScanLine } from 'lucide-react';

export default function ToolLogTab({ toolId }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['toolLogs', toolId],
    queryFn: () => toolId ? base44.entities.ToolLog.filter({ tool_id: toolId }, '-change_date') : Promise.resolve([]),
    enabled: !!toolId,
  });

  const { data: inventoryReports = [] } = useQuery({
    queryKey: ['inventoryReports'],
    queryFn: () => base44.entities.InventoryReport.list('-performed_at', 200),
    enabled: !!toolId,
  });

  // Find inventory scans where this tool was checked
  const scanEntries = useMemo(() => {
    if (!toolId) return [];
    return inventoryReports
      .filter(r => r.checked_list?.some(item => item.id === toolId))
      .map(r => ({
        id: `scan-${r.id}`,
        type: 'scan',
        date: r.performed_at,
        by_name: r.performed_by_name || 'Okänd',
        by_email: r.performed_by_email || '',
        location: r.location_name || 'Öppen inventering',
        mode: r.mode,
      }));
  }, [inventoryReports, toolId]);

  // Merge logs and scan entries into a single timeline sorted by date
  const timeline = useMemo(() => {
    const logEntries = logs.map(log => ({
      ...log,
      type: 'log',
      date: log.change_date,
    }));
    return [...logEntries, ...scanEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [logs, scanEntries]);

  if (timeline.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>Ingen ändringshistorik ännu</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {timeline.map((entry) => {
        if (entry.type === 'scan') {
          return (
            <div key={entry.id} className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 rounded p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition text-xs">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <ScanLine className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-300">Inventerad</p>
                    <p className="text-gray-500 dark:text-gray-400">{entry.by_name}{entry.location ? ` · ${entry.location}` : ''}</p>
                  </div>
                </div>
                <p className="text-gray-400 whitespace-nowrap ml-2">
                  {format(new Date(entry.date), 'dd/MM/yy HH:mm', { locale: sv })}
                </p>
              </div>
            </div>
          );
        }

        // Regular log entry
        return (
          <div key={entry.id} className="border border-gray-200 rounded p-2 hover:bg-gray-50 transition text-xs">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{entry.changed_by_name}</p>
                <p className="text-gray-500">{entry.changed_by_email}</p>
              </div>
              <p className="text-gray-400 whitespace-nowrap ml-2">
                {format(new Date(entry.date), 'dd/MM/yy HH:mm', { locale: sv })}
              </p>
            </div>
            <div className="mt-1 space-y-1">
              {entry.change_type === 'created' ? (
                <div className="text-gray-700">
                  <span className="font-medium">✓ {entry.field_name}</span> skapat:
                  <span className="font-mono bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded text-green-700 dark:text-green-400 ml-1 break-all">{entry.new_value}</span>
                </div>
              ) : (
                <div className="text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{entry.field_name}</span> ändrat:
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <span className="font-mono bg-red-50 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-red-700 dark:text-red-400 break-all">{entry.old_value || '—'}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-mono bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded text-green-700 dark:text-green-400 break-all">{entry.new_value || '—'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}