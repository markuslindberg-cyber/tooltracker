import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, User, MoreVertical, ArrowRightLeft, Wrench, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const statusConfig = {
  available: { label: "Tillgänglig", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  in_use: { label: "I bruk", color: "bg-blue-100 text-blue-700 border-blue-200" },
  maintenance: { label: "Underhåll", color: "bg-amber-100 text-amber-700 border-amber-200" },
  missing: { label: "Saknas", color: "bg-red-100 text-red-700 border-red-200" },
  retired: { label: "Kasserad", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const categoryIcons = {
  power_tools: "⚡",
  hand_tools: "🔧",
  measuring: "📏",
  safety: "🦺",
  accessories: "🔩",
  heavy_equipment: "🚜",
  vehicles: "🚗",
  other: "📦",
};

export default function ToolCard({ tool, serviceCost = 0, onTransfer, onEdit, onStatusChange, onViewHistory }) {
  const status = statusConfig[tool.status] || statusConfig.available;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* Image Section */}
      <div className="relative h-28 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
        {tool.image_url ? (
          <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl opacity-40">{categoryIcons[tool.category] || '📦'}</span>
        )}
        <div className="absolute top-2 left-2">
          <Badge className={cn("font-medium border", status.color)}>
            {status.label}
          </Badge>
        </div>
        {tool.status === 'missing' && (
          <div className="absolute top-3 right-3">
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-gray-900 truncate">{tool.name}</h3>
            {tool.subcategory && (
              <p className="text-xs text-gray-500">{tool.subcategory}</p>
            )}
            {tool.model_number && (
              <p className="text-xs text-gray-500">{tool.model_number}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit?.(tool)}>
                <Wrench className="w-4 h-4 mr-2" />
                Redigera verktyg
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTransfer?.(tool)}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Förflytta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory?.(tool)}>
                Visa historik
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {tool.status !== 'missing' && (
                <DropdownMenuItem 
                  onClick={() => onStatusChange?.(tool, 'missing')}
                  className="text-[#8B1E1E]"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Rapportera saknad
                </DropdownMenuItem>
              )}
              {tool.status === 'missing' && (
                <DropdownMenuItem 
                  onClick={() => onStatusChange?.(tool, 'available')}
                  className="text-emerald-600"
                >
                  Markera som hittad
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2 space-y-1">
          {tool.location_name && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="truncate">{tool.location_name}</span>
            </div>
          )}
          {tool.assigned_to_name && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <User className="w-3 h-3 text-gray-400" />
              <span className="truncate">{tool.assigned_to_name}</span>
            </div>
          )}
          </div>

          {/* Cost Summary */}
          {(tool.purchase_price || serviceCost > 0) && (
          <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5 text-xs">
            {tool.purchase_price && (
              <div className="flex justify-between">
                <span className="text-gray-500">Inköp:</span>
                <span className="font-medium text-gray-900">${tool.purchase_price.toLocaleString()}</span>
              </div>
            )}
            {serviceCost > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Service:</span>
                <span className="font-medium text-[#8B1E1E]">${serviceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
          )}

          {/* Quick Action */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2 border-[#8B1E1E]/30 text-[#8B1E1E] hover:bg-[#8B1E1E]/10 hover:text-[#6B1515] text-xs h-7"
          onClick={() => onTransfer?.(tool)}
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Förflytta
        </Button>
      </div>
    </div>
  );
}