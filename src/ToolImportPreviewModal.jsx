import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const PREDEFINED_CATEGORIES = {
  'Spadar': ['Rakspad', 'Rundad', 'Fyrkantig'],
  'Räfsor': ['Järnräfsa', 'Träräfsa', 'Bamburäfsa'],
  'Krattor': ['Metallkratta', 'Plast-kratta', 'Bambu-kratta'],
  'Sagar': ['Handsåg', 'Bågså', 'Nippelkätting'],
  'Hammrar': ['Klumhugg', 'Gummihammer', 'Slägga'],
  'Skufflar': ['Järnskuffel', 'Träskuffel', 'Plast-skuffel'],
  'Banor': ['Järnbana', 'Träbana'],
  'Avspärrningsmaterial': ['Farthinder', 'Skyltar', 'Kravallstaketet', 'Koner', 'Markeringsskärmar'],
};

export default function HandToolGroupEditModal({ isOpen, onClose, group, onSuccess }) {
  const currentCount = group?.items?.length || 0;
  const [form, setForm] = useState({
    name: group?.name || '',
    manufacturer: group?.manufacturer || '',
    category: group?.category || '',
    subcategory: group?.items?.[0]?.subcategory || '',
    barcode: group?.items?.[0]?.barcode || '',
    location_id: '',
    quantity: currentCount,
  });
  const [saving, setSaving] = useState(false);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);

  const { data: allHandTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 200),
    enabled: isOpen,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
    enabled: isOpen,
  });

  const availableCategories = [...new Set([
    ...Object.keys(PREDEFINED_CATEGORIES),
    ...allHandTools.map(t => t.category).filter(Boolean),
  ])].sort();

  const availableSubcategories = [...new Set([
    ...(PREDEFINED_CATEGORIES[form.category] || []),
    ...allHandTools.filter(t => t.category === form.category).map(t => t.subcategory).filter(Boolean),
  ])].sort();

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim(),
      category: form.category.trim(),
      subcategory: form.subcategory.trim(),
      barcode: form.barcode.trim(),
    };
    if (form.location_id) {
      const loc = locations.find(l => l.id === form.location_id);
      updates.location_id = form.location_id;
      updates.location_name = loc?.name || '';
    }
    // Update existing items
    await Promise.all(group.items.map(item => base44.entities.HandTool.update(item.id, updates)));

    const desiredQty = parseInt(form.quantity) || currentCount;
    if (desiredQty > currentCount) {
      // Add new items
      const toAdd = desiredQty - currentCount;
      const template = {
        ...updates,
        status: 'i_lager',
      };
      if (form.location_id) {
        const loc = locations.find(l => l.id === form.location_id);
        template.location_id = form.location_id;
        template.location_name = loc?.name || '';
      } else if (group.items[0]?.location_id) {
        template.location_id = group.items[0].location_id;
        template.location_name = group.items[0].location_name || '';
      }
      await base44.entities.HandTool.bulkCreate(Array(toAdd).fill(template));
    } else if (desiredQty < currentCount) {
      // Remove excess items (soft delete from the end)
      const toRemove = group.items.slice(desiredQty);
      await Promise.all(toRemove.map(item => base44.entities.HandTool.update(item.id, { is_deleted: true, deleted_at: new Date().toISOString() })));
    }

    setSaving(false);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redigera grupp – {group?.name}</DialogTitle>
          <p className="text-sm text-gray-500">{group?.items?.length} redskap kommer uppdateras</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Namn</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Tillverkare</Label>
            <Input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} list="grp-category-suggestions" />
            <datalist id="grp-category-suggestions">
              {availableCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label>Underkategori</Label>
            {showCustomSubcategory ? (
              <div className="flex gap-2">
                <Input
                  value={form.subcategory}
                  onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                  placeholder="Skriv ny underkategori"
                  autoFocus
                />
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => { setShowCustomSubcategory(false); setForm(f => ({ ...f, subcategory: '' })); }}>
                  Avbryt
                </Button>
              </div>
            ) : (
              <Select value={form.subcategory || ''} onValueChange={v => { if (v === '__custom__') { setShowCustomSubcategory(true); setForm(f => ({ ...f, subcategory: '' })); } else { setForm(f => ({ ...f, subcategory: v })); } }}>
                <SelectTrigger><SelectValue placeholder="Välj underkategori" /></SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  <SelectItem value="__custom__">+ Lägg till ny...</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Streckkod</Label>
            <Input value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Antal</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, quantity: Math.max(1, (parseInt(f.quantity) || 1) - 1) }))}>−</Button>
              <Input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="w-20 text-center" />
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, quantity: (parseInt(f.quantity) || 0) + 1 }))}>+</Button>
              <span className="text-sm text-gray-500">({currentCount} just nu)</span>
            </div>
            {parseInt(form.quantity) < currentCount && (
              <p className="text-xs text-red-500">⚠️ {currentCount - parseInt(form.quantity)} redskap kommer att tas bort</p>
            )}
            {parseInt(form.quantity) > currentCount && (
              <p className="text-xs text-green-600">+ {parseInt(form.quantity) - currentCount} nya redskap läggs till</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />Ändra plats för alla</Label>
            <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Välj ny plats (valfritt)" /></SelectTrigger>
              <SelectContent>
                {locations.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.location_id && (
              <button onClick={() => setForm(f => ({ ...f, location_id: '' }))} className="text-xs text-gray-400 hover:text-gray-600">Rensa platsval</button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Sparar...</> : `Uppdatera ${group?.items?.length} redskap`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}