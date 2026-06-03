import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MobileSelect({
  value,
  onChange,
  options = [],
  placeholder = "Välj ett alternativ",
  disabled = false,
  className = "",
  label = "",
}) {
  const [open, setOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  
  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  if (!isMobile) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "border border-gray-300 rounded px-3 py-2 text-sm w-full bg-white disabled:opacity-50",
          className
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          "w-full h-11 flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:opacity-50 active:bg-gray-50",
          className
        )}
      >
        <span className={selectedLabel === placeholder ? "text-gray-400" : "text-gray-900"}>
          {selectedLabel}
        </span>
        <ChevronDown className="w-5 h-5 text-gray-400" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>{label || "Välj alternativ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full h-11 px-4 py-3 text-left rounded-lg border transition-colors active:bg-blue-50",
                  value === opt.value
                    ? "bg-blue-100 border-blue-300 text-blue-900 font-medium"
                    : "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}