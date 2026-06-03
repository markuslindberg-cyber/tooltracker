import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#3B82F6', '#10B981', '#8B1E1E', '#F59E0B'];

const CUSTOM_LABEL = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  if (value === 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700}>
      {value}
    </text>
  );
};

export default function PendingRequestsChart({ loanCount, workwearCount, lokalvardCount, lokalvardApprovedCount = 0 }) {
  const total = loanCount + workwearCount + lokalvardCount + lokalvardApprovedCount;

  const data = [
    { name: 'Låneförfrågan maskiner', value: loanCount, path: '/Transfers' },
    { name: 'Uttag arbetskläder', value: workwearCount, path: '/Arbetsklader/Forfragan' },
    { name: 'Väntande lokalvårdsartiklar', value: lokalvardCount, path: '/Lokalvard/BegaranAttGodkanna' },
    { name: 'Godkända ej uttagna (lokalvård)', value: lokalvardApprovedCount, path: '/Lokalvard/NyttUttag' },
  ].filter(d => d.value >= 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Väntande begäranden</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Totalt {total} väntande</p>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
          <span className="text-3xl font-bold text-gray-200 dark:text-gray-700">0</span>
          <p className="text-sm mt-1">Inga väntande begäranden</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={80}
              dataKey="value"
              labelLine={false}
              label={CUSTOM_LABEL}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} st`, name]}
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="mt-3 space-y-2">
        {data.map((entry, index) => (
          <Link key={entry.name} to={entry.path} className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 py-1.5 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="text-xs text-gray-600 dark:text-gray-400">{entry.name}</span>
            </div>
            <span className={`text-sm font-semibold ${entry.value > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{entry.value}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}