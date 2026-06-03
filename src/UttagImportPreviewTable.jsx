import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardWidget({ title, editMode, children, className }) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm h-full overflow-hidden flex flex-col",
      editMode && "border-dashed border-2 border-blue-400 cursor-grab active:cursor-grabbing",
      className
    )}>
      {editMode && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <GripVertical className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-blue-500 font-medium">{title}</span>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}