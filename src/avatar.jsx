import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, MoreVertical, Edit, Trash2, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const statusConfig = {
  i_lager:  { label: 'I lager',  color: 'bg-green-100 text-green-700 border-green-200' },
  i_bruk:   { label: 'I bruk',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  saknas:   { label: 'Saknas',   color: 'bg-red-100 text-red-700 border-red-200' },
  kasserad: { label: 'Kasserad', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function HandToolCard({ tool, categoryImageUrl, onEdit, onDelete }) {
  const status = statusConfig[tool.status] || statusConfig.i_lager;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* Image */}
      <div className="relative h-28 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
        {tool.image_url || categoryImageUrl ? (
          <img src={tool.image_url || categoryImageUrl} alt={tool.name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-8 h-8 text-gray-300" />
        )}
        <div className="absolute top-2 left-2">
          <Badge className={cn("font-medium border text-xs", status.color)}>
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{tool.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {tool.category}{tool.manufacturer ? ` · ${tool.manufacturer}` : ''}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit?.(tool)}>
                <Edit className="w-4 h-4 mr-2" />
                Redigera
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete?.(tool.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Ta bort
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2 space-y-1">
          {tool.location_name && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="truncate">{tool.location_name}</span>
            </div>
          )}
          {tool.notes && (
            <p className="text-xs text-gray-400 truncate">{tool.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}