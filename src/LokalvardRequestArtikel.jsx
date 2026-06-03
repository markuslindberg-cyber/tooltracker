import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, ChevronDown, X, TrendingUp, RotateCcw, Filter, ChevronUp } from 'lucide-react';
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e'];

function FilterChip({ label, count, children }) {
  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:inline">{label}</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:hidden">{label.slice(0, 3)}</span>
          <span className="text-gray-800">{count === 0 ? 'Alla' : `${count}`}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>
      </PopoverTrigger>
      {children}
    </Popover>
  );
}

export default function KostnadPerKund() {
  const navigate = useNavigate();
  const [allUttag, setAllUttag] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [availableCustomerTypes, setAvailableCustomerTypes] = useState([]);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState([]);
  const [selectedCustomerStatus, setSelectedCustomerStatus] = useState('alla');
  const [loading, setLoading] = useState(true);
  const [customerMap, setCustomerMap] = useState({});
  const [customerNameToTypeMap, setCustomerNameToTypeMap] = useState({});
  const [customerStatusMap, setCustomerStatusMap] = useState({});
  const [personalMap, setPersonalMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const [uttag, kunder, personal] = await Promise.all([
          base44.entities.Uttag.list(null, 10000),
          base44.entities.Kund.list(null, 10000),
          base44.entities.TeamMember.list(null, 10000)
        ]);
        setAllCustomers(kunder);
        setAllUttag(uttag);

        const statusMap = {};
        const cMap = {};
        const cNameToTypeMap = {};
        kunder.forEach(k => {
          statusMap[k.id] = k.status || 'aktiv';
          cMap[k.id] = k.namn;
          cNameToTypeMap[k.namn] = k.typ;
        });
        setCustomerStatusMap(statusMap);
        setCustomerMap(cMap);
        setCustomerNameToTypeMap(cNameToTypeMap);

        const periods = [...new Set(uttag.map(u => u.manad).filter(Boolean))].sort((a, b) => b.localeCompare(a));
        setAvailablePeriods(periods);

        const types = [...new Set(kunder.map(k => k.typ).filter(Boolean))].sort();
        setAvailableCustomerTypes(types);

        const pMap = {};
        personal.forEach(p => { pMap[p.id] = p.name; });
        setPersonalMap(pMap);
      } catch (error) {
        toast.error('Kunde inte ladda kostnaddata');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Aggregate costs reactively based on selected periods
  const aggregatedData = (() => {
    const filteredUttag = selectedPeriods.length > 0
      ? allUttag.filter(u => selectedPeriods.includes(u.manad))
      : allUttag;

    const costMap = {};
    filteredUttag.forEach(u => {
      const kundtyp = customerNameToTypeMap[u.kund_namn] || 'Okänd';
      if (!costMap[u.kund_id]) {
        costMap[u.kund_id] = {
          kund_id: u.kund_id,
          namn: customerMap[u.kund_id] || u.kund_namn || 'Okänd',
          kundtyp,
          kundstatus: customerStatusMap[u.kund_id] || 'aktiv',
          personal_namn: personalMap[u.personal_id] || u.personal_namn || 'Okänd',
          total: 0
        };
      }
      costMap[u.kund_id].total += u.total_kostnad;
    });

    return Object.values(costMap).sort((a, b) => b.total - a.total);
  })();

  const data = aggregatedData
    .filter(d => selectedCustomerIds.length === 0 || selectedCustomerIds.includes(d.kund_id))
    .filter(d => selectedCustomerTypes.length === 0 || selectedCustomerTypes.includes(d.kundtyp))
    .filter(d => selectedCustomerStatus === 'alla' || d.kundstatus === selectedCustomerStatus);

  const total = data.reduce((sum, item) => sum + item.total, 0);

  const handleExport = () => {
    const csv = ['Kund,Kostnad (kr)\n', ...data.map(d => `${d.namn},${d.total.toFixed(2)}`), `Totalt,${total.toFixed(2)}`].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kostnad_${selectedPeriods.length > 0 ? selectedPeriods.join('_') : 'alla'}.csv`;
    a.click();
  };

  const [chartOpen, setChartOpen] = useState(true);

  if (loading) return <div className="flex justify-center p-8">Laddar...</div>;

  const hasActiveFilters = selectedPeriods.length > 0 || selectedCustomerIds.length > 0 || selectedCustomerTypes.length > 0 || selectedCustomerStatus !== 'alla';
  const maxTotal = data.length > 0 ? Math.max(...data.map(d => d.total)) : 0;
  const chartData = data.slice(0, 10).map(d => ({ name: d.namn.length > 15 ? d.namn.slice(0, 15) + '…' : d.namn, value: Math.round(d.total) }));

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            Kostnad per kund
          </h1>
          {data.length > 0 && (
            <Button onClick={handleExport} size="sm" className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 hidden sm:block" />

          <FilterChip label="Period" count={selectedPeriods.length}>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {availablePeriods.map(p => (
                  <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={selectedPeriods.includes(p)}
                      onCheckedChange={(checked) => {
                        setSelectedPeriods(prev => checked ? [...prev, p] : prev.filter(id => id !== p));
                      }}
                    />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
              </div>
              {selectedPeriods.length > 0 && (
                <button onClick={() => setSelectedPeriods([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                  <X className="w-3 h-3" /> Rensa
                </button>
              )}
            </PopoverContent>
          </FilterChip>

          <FilterChip label="Kundtyp" count={selectedCustomerTypes.length}>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {availableCustomerTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={selectedCustomerTypes.includes(type)}
                      onCheckedChange={(checked) => {
                        setSelectedCustomerTypes(prev => checked ? [...prev, type] : prev.filter(t => t !== type));
                      }}
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
              {selectedCustomerTypes.length > 0 && (
                <button onClick={() => setSelectedCustomerTypes([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                  <X className="w-3 h-3" /> Rensa
                </button>
              )}
            </PopoverContent>
          </FilterChip>

          <FilterChip label="Status" count={selectedCustomerStatus !== 'alla' ? 1 : 0}>
            <PopoverContent className="w-44 p-2" align="start">
              <div className="space-y-1">
                {[{ value: 'alla', label: 'Alla' }, { value: 'aktiv', label: 'Aktiva' }, { value: 'inaktiv', label: 'Inaktiva' }].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="kundstatus"
                      checked={selectedCustomerStatus === opt.value}
                      onChange={() => setSelectedCustomerStatus(opt.value)}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </FilterChip>

          <FilterChip label="Kund" count={selectedCustomerIds.length}>
            <PopoverContent className="w-60 p-2" align="start">
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {allCustomers.map(k => (
                  <label key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={selectedCustomerIds.includes(k.id)}
                      onCheckedChange={(checked) => {
                        setSelectedCustomerIds(prev => checked ? [...prev, k.id] : prev.filter(id => id !== k.id));
                      }}
                    />
                    <span className="text-sm">{k.namn}</span>
                  </label>
                ))}
              </div>
              {selectedCustomerIds.length > 0 && (
                <button onClick={() => setSelectedCustomerIds([])} className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1">
                  <X className="w-3 h-3" /> Rensa
                </button>
              )}
            </PopoverContent>
          </FilterChip>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSelectedPeriods([]);
                setSelectedCustomerIds([]);
                setSelectedCustomerTypes([]);
                setSelectedCustomerStatus('alla');
              }}
              className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Rensa
            </button>
          )}
        </div>
      </div>

      {data.length > 0 ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Compact chart + total row */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setChartOpen(!chartOpen)}
              className="w-full px-4 py-2.5 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-700 font-medium">Totalt</span>
                <span className="text-lg font-bold text-blue-900">
                  {total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <span className="hidden sm:inline">{chartOpen ? 'Dölj graf' : 'Visa graf'}</span>
                {chartOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            {chartOpen && chartData.length > 0 && (
              <div className="px-2 py-4">
                <div className="w-full" style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={35}
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `${v.toLocaleString('sv-SE')} kr`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-3 pt-2 pb-1">
                  {chartData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-600">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inline bar chart — mobile-friendly kostnadsfördelning */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Kostnadsfördelning</h2>
              <span className="text-xs text-gray-400">{data.length} kunder</span>
            </div>
            <div className="divide-y divide-gray-50">
              {data.map((item, index) => {
                const pct = total > 0 ? (item.total / total) * 100 : 0;
                const barWidth = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                const color = COLORS[index % COLORS.length];

                return (
                  <div key={item.kund_id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                    {/* Top row: name + amount */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {item.namn}
                        </span>
                        {item.kundtyp && (
                          <span className="hidden sm:inline-flex text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 flex-shrink-0">
                            {item.kundtyp}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900">
                          {item.total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kr
                        </span>
                        <span className="text-xs text-gray-400 w-10 text-right tabular-nums">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${barWidth}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">Inga uttag matchar de valda filtren.</div>
      )}
    </div>
  );
}