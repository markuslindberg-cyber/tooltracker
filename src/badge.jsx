import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, Grid, List, Rows3, X } from "lucide-react";
import { cn } from "@/lib/utils";

function FilterSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-3 space-y-1">{children}</div>}
    </div>
  );
}

function FilterOption({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-colors text-left",
        selected ? "bg-[#8B1E1E]/10 text-[#8B1E1E] font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      )}
    >
      <span className={cn(
        "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center",
        selected ? "bg-[#8B1E1E] border-[#8B1E1E]" : "border-gray-300 dark:border-gray-600"
      )}>
        {selected && <span className="w-2 h-2 bg-white rounded-sm block" />}
      </span>
      {label}
    </button>
  );
}

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  subcategoryFilter,
  onSubcategoryChange,
  manufacturerFilter,
  onManufacturerChange,
  conditionFilter,
  onConditionChange,
  locationFilter,
  onLocationChange,
  assignedToFilter,
  onAssignedToChange,
  viewMode,
  onViewModeChange,
  onClearFilters,
  showViewToggle = true,
  availableSubcategories = [],
  availableManufacturers = [],
  availableLocations = [],
  availableAssignedTo = [],
  availableCategories = [],
  sortBy,
  onSortByChange,
  statusOptions: customStatusOptions,
  conditionOptions: customConditionOptions,
  viewModes,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Support both array and 'all'/string for backwards compat
  const isActive = (f) => Array.isArray(f) ? f.length > 0 : (f && f !== 'all');
  const activeCount = [statusFilter, categoryFilter, subcategoryFilter, manufacturerFilter, conditionFilter, locationFilter, assignedToFilter].filter(isActive).length;

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const statusOptions = customStatusOptions || [
    { value: 'available', label: 'Tillgänglig' },
    { value: 'in_use', label: 'I bruk' },
    { value: 'i_lager', label: 'I lager' },
    { value: 'maintenance', label: 'Underhåll' },
    { value: 'missing', label: 'Saknas' },
    { value: 'retired', label: 'Kasserad' },
  ];

  const conditionOptions = customConditionOptions || [
    { value: 'new', label: 'Ny' },
    { value: 'good', label: 'Bra' },
    { value: 'fair', label: 'Okej' },
    { value: 'poor', label: 'Dålig' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 space-y-3">
      {/* Search row – always full width */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Sök..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-10 border-gray-200 focus:border-[#8B1E1E]/30 w-full"
        />
      </div>

      {/* Filter row – always on its own line below search */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        {/* Filter button */}
        <div className="relative" ref={ref}>
          <Button
            variant="outline"
            onClick={() => setOpen(!open)}
            className={cn("h-9 gap-2 border-gray-200", activeCount > 0 && "border-[#8B1E1E]/40 text-[#8B1E1E]")}
          >
            {activeCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#8B1E1E] text-white text-xs flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
            <SlidersHorizontal className="w-4 h-4" />
            Filtrera
            <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
          </Button>

          {open && (
            <div className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-[500px] overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Filtrera efter:</span>
                {activeCount > 0 && (
                  <button
                    onClick={() => {
                      onStatusChange([]);
                      onCategoryChange(Array.isArray(categoryFilter) ? [] : 'all');
                      onSubcategoryChange(Array.isArray(subcategoryFilter) ? [] : 'all');
                      onManufacturerChange(Array.isArray(manufacturerFilter) ? [] : 'all');
                      onConditionChange(Array.isArray(conditionFilter) ? [] : 'all');
                      onLocationChange(Array.isArray(locationFilter) ? [] : 'all');
                      if (onAssignedToChange) onAssignedToChange('all');
                      setOpen(false);
                    }}
                    className="text-xs text-[#8B1E1E] hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Rensa
                  </button>
                )}
              </div>

              <FilterSection title="Status" defaultOpen={statusFilter.length > 0}>
                <FilterOption label="Alla" selected={statusFilter.length === 0} onClick={() => onStatusChange([])} />
                {statusOptions.map(opt => (
                  <FilterOption 
                    key={opt.value} 
                    label={opt.label} 
                    selected={statusFilter.includes(opt.value)} 
                    onClick={() => {
                      const newFilter = statusFilter.includes(opt.value)
                        ? statusFilter.filter(v => v !== opt.value)
                        : [...statusFilter, opt.value];
                      onStatusChange(newFilter);
                    }} 
                  />
                ))}
              </FilterSection>

              {availableCategories.length > 0 && (
                <FilterSection title="Kategori" defaultOpen={isActive(categoryFilter)}>
                  <FilterOption label="Alla kategorier" selected={!isActive(categoryFilter)} onClick={() => onCategoryChange(Array.isArray(categoryFilter) ? [] : 'all')} />
                  {availableCategories.map(cat => (
                    <FilterOption key={cat} label={cat}
                      selected={Array.isArray(categoryFilter) ? categoryFilter.includes(cat) : categoryFilter === cat}
                      onClick={() => {
                        if (!Array.isArray(categoryFilter)) { onCategoryChange(cat); return; }
                        onCategoryChange(categoryFilter.includes(cat) ? categoryFilter.filter(v => v !== cat) : [...categoryFilter, cat]);
                      }} />
                  ))}
                </FilterSection>
              )}

              {availableSubcategories.length > 0 && (
                <FilterSection title="Underkategori" defaultOpen={isActive(subcategoryFilter)}>
                  <FilterOption label="Alla underkategorier" selected={!isActive(subcategoryFilter)} onClick={() => onSubcategoryChange(Array.isArray(subcategoryFilter) ? [] : 'all')} />
                  {availableSubcategories.map(sub => (
                    <FilterOption key={sub} label={sub}
                      selected={Array.isArray(subcategoryFilter) ? subcategoryFilter.includes(sub) : subcategoryFilter === sub}
                      onClick={() => {
                        if (!Array.isArray(subcategoryFilter)) { onSubcategoryChange(sub); return; }
                        onSubcategoryChange(subcategoryFilter.includes(sub) ? subcategoryFilter.filter(v => v !== sub) : [...subcategoryFilter, sub]);
                      }} />
                  ))}
                </FilterSection>
              )}

              {availableLocations.length > 0 && (
                <FilterSection title="Plats" defaultOpen={isActive(locationFilter)}>
                  <FilterOption label="Alla platser" selected={!isActive(locationFilter)} onClick={() => onLocationChange(Array.isArray(locationFilter) ? [] : 'all')} />
                  {availableLocations.map(loc => (
                    <FilterOption key={loc} label={loc}
                      selected={Array.isArray(locationFilter) ? locationFilter.includes(loc) : locationFilter === loc}
                      onClick={() => {
                        if (!Array.isArray(locationFilter)) { onLocationChange(loc); return; }
                        onLocationChange(locationFilter.includes(loc) ? locationFilter.filter(v => v !== loc) : [...locationFilter, loc]);
                      }} />
                  ))}
                </FilterSection>
              )}

              {availableAssignedTo.length > 0 && (
                <FilterSection title="Tilldelad" defaultOpen={assignedToFilter !== 'all'}>
                  <FilterOption label="Alla" selected={assignedToFilter === 'all'} onClick={() => onAssignedToChange('all')} />
                  <FilterOption label="Ej tilldelad" selected={assignedToFilter === 'unassigned'} onClick={() => onAssignedToChange('unassigned')} />
                  {availableAssignedTo.map(person => (
                    <FilterOption key={person} label={person} selected={assignedToFilter === person} onClick={() => onAssignedToChange(person)} />
                  ))}
                </FilterSection>
              )}

              {availableManufacturers.length > 0 && (
                <FilterSection title="Tillverkare" defaultOpen={isActive(manufacturerFilter)}>
                  <FilterOption label="Alla tillverkare" selected={!isActive(manufacturerFilter)} onClick={() => onManufacturerChange(Array.isArray(manufacturerFilter) ? [] : 'all')} />
                  {availableManufacturers.map(mfr => (
                    <FilterOption key={mfr} label={mfr}
                      selected={Array.isArray(manufacturerFilter) ? manufacturerFilter.includes(mfr) : manufacturerFilter === mfr}
                      onClick={() => {
                        if (!Array.isArray(manufacturerFilter)) { onManufacturerChange(mfr); return; }
                        onManufacturerChange(manufacturerFilter.includes(mfr) ? manufacturerFilter.filter(v => v !== mfr) : [...manufacturerFilter, mfr]);
                      }} />
                  ))}
                </FilterSection>
              )}

              {conditionFilter !== undefined && (
                <FilterSection title="Skick" defaultOpen={isActive(conditionFilter)}>
                  <FilterOption label="Alla skick" selected={!isActive(conditionFilter)} onClick={() => onConditionChange(Array.isArray(conditionFilter) ? [] : 'all')} />
                  {conditionOptions.map(opt => (
                    <FilterOption key={opt.value} label={opt.label}
                      selected={Array.isArray(conditionFilter) ? conditionFilter.includes(opt.value) : conditionFilter === opt.value}
                      onClick={() => {
                        if (!Array.isArray(conditionFilter)) { onConditionChange(opt.value); return; }
                        onConditionChange(conditionFilter.includes(opt.value) ? conditionFilter.filter(v => v !== opt.value) : [...conditionFilter, opt.value]);
                      }} />
                  ))}
                </FilterSection>
              )}
            </div>
          )}
        </div>

        {/* Sort */}
        {sortBy !== undefined && onSortByChange && (
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[170px] h-9 border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Senast uppdaterad</SelectItem>
              <SelectItem value="last_checked">Senast kontrollerad</SelectItem>
              <SelectItem value="name">Namn (A-Ö)</SelectItem>
              <SelectItem value="category">Kategori</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* View toggle */}
        {showViewToggle && (
          <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ml-auto">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onViewModeChange('grid')}
              className={`h-9 w-9 rounded-none ${viewMode === 'grid' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => onViewModeChange('list')}
              className={`h-9 w-9 rounded-none ${viewMode === 'list' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}
            >
              <List className="w-4 h-4" />
            </Button>
            {viewModes?.includes('grouped') && (
              <Button
                variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => onViewModeChange('grouped')}
                className={`h-9 w-9 rounded-none ${viewMode === 'grouped' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}
              >
                <Rows3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}