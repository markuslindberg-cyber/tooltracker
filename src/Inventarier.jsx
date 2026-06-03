import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingDown, Save, RotateCw } from 'lucide-react';
import { DEFAULT_SETTINGS } from '@/lib/depreciationUtils';

const LEVEL_COLORS = {
  'Låg': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  'Medel': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  'Hög': { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
};

export default function DepreciationSettings() {
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState({});
  const [seeding, setSeeding] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['depreciationSettings'],
    queryFn: () => base44.entities.DepreciationSetting.list(),
  });

  // Seed default settings if none exist
  useEffect(() => {
    if (!isLoading && settings.length === 0 && !seeding) {
      setSeeding(true);
      base44.entities.DepreciationSetting.bulkCreate(DEFAULT_SETTINGS).then(() => {
        queryClient.invalidateQueries({ queryKey: ['depreciationSettings'] });
        setSeeding(false);
      });
    }
  }, [isLoading, settings.length, seeding]);

  // Populate edit values from settings
  useEffect(() => {
    if (settings.length > 0) {
      const vals = {};
      settings.forEach(s => {
        vals[s.id] = {
          level_name: s.level_name,
          annual_percentage: s.annual_percentage,
          minimum_value_percentage: s.minimum_value_percentage,
        };
      });
      setEditValues(vals);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.DepreciationSetting.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['depreciationSettings'] }),
  });

  const handleSave = (setting) => {
    const vals = editValues[setting.id];
    if (!vals) return;
    updateMutation.mutate({
      id: setting.id,
      data: {
        level_name: vals.level_name,
        annual_percentage: Number(vals.annual_percentage),
        minimum_value_percentage: Number(vals.minimum_value_percentage),
      },
    });
  };

  const handleChange = (id, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role !== 'ägare') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-4 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8B1E1E] rounded-xl flex items-center justify-center shadow-lg shadow-[#8B1E1E]/25">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Avskrivningsinställningar</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Konfigurera deprecieringsnivåer för maskiner</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Varje maskin kan tilldelas en deprecieringsnivå (Låg, Medel, Hög). Värdet räknas ner varje månad baserat på den årliga procentsatsen. Maskinen når aldrig under minimivärdet.
          </p>
        </div>

        {/* Settings cards */}
        <div className="space-y-4">
          {settings.map(setting => {
            const colors = LEVEL_COLORS[setting.level_name] || LEVEL_COLORS['Låg'];
            const vals = editValues[setting.id] || {};
            const hasChanges = vals.level_name !== setting.level_name ||
                               vals.annual_percentage !== setting.annual_percentage ||
                               vals.minimum_value_percentage !== setting.minimum_value_percentage;

            return (
              <div key={setting.id} className={`bg-white dark:bg-gray-900 rounded-2xl border ${colors.border} shadow-sm overflow-hidden`}>
                <div className={`px-5 py-3 ${colors.bg} border-b ${colors.border}`}>
                  <h3 className={`font-semibold ${colors.text}`}>{setting.level_name} depreciering</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <Label className="text-sm text-gray-600 dark:text-gray-400">Namn</Label>
                    <Input
                      type="text"
                      value={vals.level_name ?? ''}
                      onChange={(e) => handleChange(setting.id, 'level_name', e.target.value)}
                      className="mt-1 max-w-xs"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">Årlig avskrivning (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={vals.annual_percentage ?? ''}
                        onChange={(e) => handleChange(setting.id, 'annual_percentage', e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-400 mt-1">Månatlig: {((vals.annual_percentage || 0) / 12).toFixed(2)}%</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600 dark:text-gray-400">Minimivärde (% av inköpspris)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={vals.minimum_value_percentage ?? ''}
                        onChange={(e) => handleChange(setting.id, 'minimum_value_percentage', e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-400 mt-1">Maskinen når aldrig under {vals.minimum_value_percentage || 0}% av inköpspriset</p>
                    </div>
                  </div>

                  {/* Example */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Exempel: Maskin köpt för 100 000 kr</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Efter 1 år: {Math.max(100000 * (vals.minimum_value_percentage || 0) / 100, 100000 - 100000 * (vals.annual_percentage || 0) / 100).toLocaleString('sv-SE')} kr · 
                      Efter 3 år: {Math.max(100000 * (vals.minimum_value_percentage || 0) / 100, 100000 - 100000 * (vals.annual_percentage || 0) / 100 * 3).toLocaleString('sv-SE')} kr · 
                      Minimum: {(100000 * (vals.minimum_value_percentage || 0) / 100).toLocaleString('sv-SE')} kr
                    </p>
                  </div>

                  {hasChanges && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleSave(setting)}
                        size="sm"
                        className="bg-[#8B1E1E] hover:bg-[#6B1515]"
                        disabled={updateMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Spara ändringar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {seeding && (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <RotateCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Skapar standardinställningar...</span>
          </div>
        )}
      </div>
    </div>
  );
}