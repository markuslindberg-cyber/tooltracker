import React from 'react';
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, icon: Icon, trend, trendLabel, className, iconClassName }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <div className={cn(
      "bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide line-clamp-2">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
          {(trend !== undefined || trendLabel) && (
            <div className="flex items-center gap-1 mt-1">
              {trend !== undefined && (
                <span className={cn(
                  "text-xs sm:text-sm font-medium",
                  isPositive && "text-emerald-600",
                  isNegative && "text-red-600",
                  !isPositive && !isNegative && "text-gray-500"
                )}>
                  {isPositive ? '+' : ''}{trend}%
                </span>
              )}
              {trendLabel && (
                <span className="text-xs text-gray-400 hidden sm:inline">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
        <div className={cn(
          "p-2 sm:p-3 rounded-xl shrink-0",
          iconClassName || "bg-[#8B1E1E]/10"
        )}>
          <Icon className={cn(
            "w-4 h-4 sm:w-6 sm:h-6",
            iconClassName ? "" : "text-[#8B1E1E]"
          )} />
        </div>
        )}
      </div>
    </div>
  );
}