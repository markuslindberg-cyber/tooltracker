import React from 'react';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Wrench, Calendar, DollarSign, User } from 'lucide-react';

const serviceTypeConfig = {
  repair: { label: "Reparation", color: "bg-red-100 text-red-700" },
  maintenance: { label: "Underhåll", color: "bg-blue-100 text-blue-700" },
  inspection: { label: "Inspektion", color: "bg-purple-100 text-purple-700" },
  calibration: { label: "Kalibrering", color: "bg-amber-100 text-amber-700" },
  replacement_parts: { label: "Reservdelar", color: "bg-green-100 text-green-700" },
};

export default function ServiceHistoryPanel({ serviceRecords }) {
  if (!serviceRecords || serviceRecords.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Inga serviceposter ännu</p>
      </div>
    );
  }

  const totalCost = serviceRecords.reduce((sum, record) => sum + (record.cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-[#8B1E1E]/5 rounded-xl p-4 border border-[#8B1E1E]/20">
        <p className="text-sm text-gray-600 mb-1">Totala servicekostnader</p>
        <p className="text-2xl font-bold text-gray-900">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      <div className="space-y-3">
        {serviceRecords.map((record) => {
          const serviceType = serviceTypeConfig[record.service_type] || serviceTypeConfig.repair;
          return (
            <div key={record.id} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <Badge className={`${serviceType.color} border-0`}>
                  {serviceType.label}
                </Badge>
                <p className="font-bold text-lg text-gray-900">
                  ${record.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <p className="text-gray-900 font-medium mb-2">{record.description}</p>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {format(new Date(record.service_date), 'MMM d, yyyy')}
                </div>
                {record.performed_by && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" />
                    {record.performed_by}
                  </div>
                )}
              </div>

              {record.notes && (
                <p className="text-sm text-gray-500 mt-2 pt-2 border-t border-gray-100">
                  {record.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}