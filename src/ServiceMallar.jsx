import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Navigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import MaskinerSection from '@/components/owner/MaskinerSection';
import HandredskapSection from '@/components/owner/HandredskapSection';
import ArbetskladerSection from '@/components/owner/ArbetskladerSection';
import LokalvardSection from '@/components/owner/LokalvardSection';
import OwnerTotalSummary from '@/components/owner/OwnerTotalSummary';

export default function OwnerOverview() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
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
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8B1E1E] rounded-xl flex items-center justify-center shadow-lg shadow-[#8B1E1E]/25">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Ägaröversikt</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Samlad statistik för alla avdelningar</p>
            </div>
          </div>
        </div>

        {/* Total Summary */}
        <OwnerTotalSummary />

        {/* Sections */}
        <div className="space-y-10">
          <MaskinerSection />
          <hr className="border-gray-200 dark:border-gray-800" />
          <HandredskapSection />
          <hr className="border-gray-200 dark:border-gray-800" />
          <ArbetskladerSection />
          <hr className="border-gray-200 dark:border-gray-800" />
          <LokalvardSection />
        </div>
      </div>
    </div>
  );
}