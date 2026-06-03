import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Tillgänglig' },
  { value: 'in_use', label: 'I bruk' },
  { value: 'i_lager', label: 'I lager' },
  { value: 'maintenance', label: 'Underhåll' },
  { value: 'missing', label: 'Saknas' },
  { value: 'retired', label: 'Kasserad' },
  { value: 'sålda', label: 'Såld' },
];

export default function BulkEditToolsModal({ isOpen, onClose, selectedCount, selectedTools = [], locations, categories, huvudmaskiner = [], onSubmit }) {
  const [status, setStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [mainMachineId, setMainMachineId] = useState('');
  const [compatibleIds, setCompatibleIds] = useState([]); // array of machine IDs
  const [depreciationLevel, setDepreciationLevel] = useState('');
  const [saving, setSaving] = useState(false);

  // Check if all selected tools share the same category
  const sharedCategory = useMemo(() => {
    if (selectedTools.length === 0) return null;
    const cats = [...new Set(selectedTools.map(t => t.category).filter(Boolean))];
    return cats.length === 1 ? cats[0] : null;
  }, [selectedTools]);

  // Fetch category definitions to get subcategories
  const { data: categoryDefs = [] } = useQuery({
    queryKey: ['categories', 'Tool'],
    queryFn: () => base44.entities.Category.filter({ entity_type: 'Tool' }),
    enabled: isOpen,
  });

  // Get available subcategories for the shared category
  const availableSubcategories = useMemo(() => {
    if (!sharedCategory) return [];
    const catDef = categoryDefs.find(c => c.name === sharedCategory);
    return catDef?.subcategories || [];
  }, [sharedCategory, categoryDefs]);

  const handleClose = () => {
    setStatus('');
    setLocationId('');
    setCategory('');
    setSubcategory('');
    setMainMachineId('');
    setCompatibleIds([]);
    setDepreciationLevel('');
    onClose();
  };

  const toggleCompatible = (id) => {
    setCompatibleIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    const updates = {};
    if (status) updates.status = status;
    if (locationId) {
      const loc = locations.find(l => l.id === locationId);
      updates.location_id = locationId;
      updates.location_name = loc?.name || '';
    }
    if (category) updates.category = category;
    if (subcategory) updates.subcategory = subcategory;
    if (mainMachineId) {
      const machine = huvudmaskiner.find(m => m.id === mainMachineId);
      updates.main_machine_id = mainMachineId;
      updates.main_machine_name = machine?.name || '';
    } else if (mainMachineId === '__clear__') {
      updates.main_machine_id = null;
      updates.main_machine_name = null;
    }
    if (compatibleIds.length > 0) {
      const names = compatibleIds.map(id => huvudmaskiner.find(m => m.id === id)?.name || '').filter(Boolean);
      updates.compatible_with_main_machine_ids = compatibleIds;
      updates.compatible_with_main_machine_names = names;
    }
    if (depreciationLevel) {
      updates.depreciation_level = depreciationLevel === '__clear__' ? null : depreciationLevel;
    }

    if (Object.keys(updates).length === 0) return;

    setSaving(true);
    await onSubmit(updates);
    setSaving(false);
    handleClose();
  };

  const hasChanges = status || locationId || category || subcategory || mainMachineId || compatibleIds.length > 0 || depreciationLevel;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Massredigera {selectedCount} maskiner</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-500">Välj vad du vill uppdatera. Tomma fält lämnas oförändrade.</p>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Ändra ej" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Plats</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Ändra ej" />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Ändra ej" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Underkategori – visas bara om alla markerade har samma kategori */}
          {sharedCategory && availableSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Underkategori <span className="text-xs text-gray-400 font-normal">(alla har kategori: {sharedCategory})</span></Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Ändra ej" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Deprecieringsnivå */}
          <div className="space-y-2">
            <Label>Deprecieringsnivå</Label>
            <Select value={depreciationLevel} onValueChange={setDepreciationLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Ändra ej" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">— Ingen depreciering —</SelectItem>
                <SelectItem value="Låg">Låg (20%/år)</SelectItem>
                <SelectItem value="Medel">Medel (30%/år)</SelectItem>
                <SelectItem value="Hög">Hög (40%/år)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Huvudmaskin */}
          <div className="space-y-2">
            <Label>Huvudmaskin</Label>
            <Select value={mainMachineId} onValueChange={setMainMachineId}>
              <SelectTrigger>
                <SelectValue placeholder="Ändra ej" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">— Ingen huvudmaskin —</SelectItem>
                {huvudmaskiner.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Passar till (kompatibla huvudmaskiner) */}
          <div className="space-y-2">
            <Label>Passar till (välj en eller flera)</Label>
            <Select onValueChange={toggleCompatible}>
              <SelectTrigger>
                <SelectValue placeholder="Lägg till huvudmaskin..." />
              </SelectTrigger>
              <SelectContent>
                {huvudmaskiner
                  .filter(m => !compatibleIds.includes(m.id))
                  .map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {compatibleIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {compatibleIds.map(id => {
                  const machine = huvudmaskiner.find(m => m.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {machine?.name || id}
                      <button onClick={() => toggleCompatible(id)} className="ml-1 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Avbryt</Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || saving}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : `Uppdatera ${selectedCount} maskiner`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}