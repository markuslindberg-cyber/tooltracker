import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Copy, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from '@tanstack/react-query';

const defaultForm = {
  name: '',
  manufacturer: '',
  category: '',
  subcategory: '',
  status: 'i_lager',
  purchase_date: '',
  purchase_price: '',
  image_url: '',
  barcode: '',
  notes: '',
};

export default function HandToolBatchModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState(defaultForm);
  const [quantity, setQuantity] = useState(1);
  const [distributions, setDistributions] = useState([{ location_id: '', location_name: '', count: 1 }]);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: categoryImages = [] } = useQuery({
    queryKey: ['categoryimages'],
    queryFn: () => base44.entities.CategoryImage.list('category'),
    enabled: isOpen,
  });
  const categoryImageMap = Object.fromEntries(categoryImages.map(ci => [ci.category, ci.image_url]));

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('name'),
    enabled: isOpen,
  });

  const { data: allHandTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 200),
    enabled: isOpen,
  });

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

const availableCategories = [...new Set([
  ...Object.keys(PREDEFINED_CATEGORIES),
  ...allHandTools.map(t => t.category).filter(Boolean),
])].sort();

// Subcategories: predefined for chosen category + any from existing tools in that category
const availableSubcategories = [...new Set([
  ...(PREDEFINED_CATEGORIES[form.category] || []),
  ...allHandTools.filter(t => t.category === form.category).map(t => t.subcategory).filter(Boolean),
])].sort();

  // When category changes, auto-fill image from category if no custom image set
  useEffect(() => {
    if (form.category && categoryImageMap[form.category] && !form.image_url) {
      setForm(p => ({ ...p, image_url: categoryImageMap[form.category] }));
    }
  }, [form.category, categoryImages]);

  useEffect(() => {
    if (!isOpen) {
      setForm(defaultForm);
      setQuantity(1);
      setDistributions([{ location_id: '', location_name: '', count: 1, condition: 'bra' }]);
    }
  }, [isOpen]);

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, image_url: file_url }));
    setUploadingImage(false);
    e.target.value = '';
  };

  const totalDistributed = distributions.reduce((s, d) => s + (parseInt(d.count) || 0), 0);

  const handleAddRow = () => {
    setDistributions(prev => [...prev, { location_id: '', location_name: '', count: 1 }]);
  };

  const handleRemoveRow = (i) => {
    setDistributions(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleDistChange = (i, field, value) => {
    setDistributions(prev => prev.map((d, idx) => {
      if (idx !== i) return d;
      if (field === 'location_id') {
        const loc = locations.find(l => l.id === value);
        return { ...d, location_id: value, location_name: loc?.name || '' };
      }
      return { ...d, [field]: value };
    }));
  };

  const handleSubmit = async () => {
    if (totalDistributed !== quantity) return;
    setSaving(true);
    const records = [];
    for (const dist of distributions) {
      const count = parseInt(dist.count) || 0;
      for (let i = 0; i < count; i++) {
        records.push({
          name: form.name,
          manufacturer: form.manufacturer,
          category: form.category,
          subcategory: form.subcategory,
          status: form.status || 'i_lager',
          notes: form.notes,
          image_url: form.image_url || undefined,
          purchase_date: form.purchase_date || undefined,
          purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : undefined,
          barcode: form.barcode || undefined,
          location_id: dist.location_id || undefined,
          location_name: dist.location_name || undefined,
        });
      }
    }
    await base44.entities.HandTool.bulkCreate(records);
    setSaving(false);
    onSuccess?.();
    onClose();
  };

  const isValid = form.name && form.category && totalDistributed === quantity && quantity > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Lägg till handredskap</DialogTitle>
        </DialogHeader>

        {/* Template picker */}
        {allHandTools.length > 0 && (
          <div className="space-y-1">
            <Label className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" />Använd befintligt redskap som mall</Label>
            <select
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
              defaultValue=""
              onChange={e => {
                const id = e.target.value;
                if (!id) return;
                const match = allHandTools.find(t => t.id === id);
                if (match) setForm({
                  name: match.name || '',
                  manufacturer: match.manufacturer || '',
                  category: match.category || '',
                  subcategory: match.subcategory || '',
                  status: match.status || 'i_lager',
                  purchase_date: match.purchase_date || '',
                  purchase_price: match.purchase_price ? String(match.purchase_price) : '',
                  image_url: match.image_url || '',
                  notes: match.notes || '',
                  barcode: match.barcode || '',
                });
              }}
            >
              <option value="">— Välj mall (valfritt) —</option>
              {(() => {
                const toolMap = new Map();
                allHandTools.forEach(t => {
                  const existing = toolMap.get(t.name);
                  if (!existing) {
                    toolMap.set(t.name, t);
                  } else {
                    // Prioritera: subcategory > barcode > befintlig
                    const betterSubcat = !existing.subcategory && t.subcategory;
                    const betterBarcode = !existing.barcode && t.barcode;
                    if (betterSubcat || betterBarcode) {
                      toolMap.set(t.name, t);
                    }
                  }
                });
                return [...toolMap.values()].sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.category ? ` (${t.category}${t.subcategory ? ` / ${t.subcategory}` : ''})` : ''}
                  </option>
                ));
              })()}
            </select>
          </div>
        )}

        <div className="space-y-5 py-2">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Namn *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="t.ex. Räfsa, Spade..."
                list="ht-name-suggestions"
              />
              <datalist id="ht-name-suggestions">
                {[...new Set(allHandTools.map(t => t.name).filter(Boolean))].map(n => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Tillverkare</Label>
              <Input
                value={form.manufacturer}
                onChange={e => setForm(p => ({ ...p, manufacturer: e.target.value }))}
                placeholder="t.ex. Fiskars"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Kategori *</Label>
              <Input
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="t.ex. Räfsor, Spadar..."
                list="ht-category-suggestions"
              />
              <datalist id="ht-category-suggestions">
                {availableCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Underkategori</Label>
              <Input
                value={form.subcategory}
                onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))}
                placeholder="Valfritt"
                list="ht-subcategory-suggestions"
              />
              <datalist id="ht-subcategory-suggestions">
                {availableSubcategories.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Streckkod</Label>
            <Input
              value={form.barcode}
              onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))}
              placeholder="Valfritt"
            />
          </div>

          {/* Category image preview + upload */}
          <div className="space-y-1">
            <Label>Bild</Label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-gray-100 border overflow-hidden flex items-center justify-center shrink-0">
                {form.image_url
                  ? <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                  : <span className="text-xs text-gray-400 text-center px-1">{form.category && categoryImageMap[form.category] ? 'Kategoribild' : 'Ingen bild'}</span>}
              </div>
              <div className="space-y-1">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50">
                    {uploadingImage ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Laddar upp...</> : <><Upload className="w-3.5 h-3.5" />Ladda upp bild</>}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} disabled={uploadingImage} />
                </label>
                {form.category && categoryImageMap[form.category] && (
                  <p className="text-xs text-gray-500">Kategoribild används som standard</p>
                )}
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <Label>Antal att lägga till *</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-32"
            />
          </div>

          {/* Distribution */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fördela på platser</Label>
              <span className={`text-sm font-medium ${totalDistributed === quantity ? 'text-green-600' : 'text-red-500'}`}>
                {totalDistributed} / {quantity} fördelade
              </span>
            </div>

            {distributions.map((dist, i) => (
              <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                <div className="flex-1 min-w-[140px]">
                  <Select value={dist.location_id} onValueChange={v => handleDistChange(i, 'location_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Välj plats" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Ingen plats</SelectItem>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={dist.count}
                  onChange={e => handleDistChange(i, 'count', e.target.value)}
                  className="w-20"
                />
                {distributions.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(i)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={handleAddRow} className="gap-1">
              <Plus className="w-4 h-4" />
              Lägg till plats
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : `Lägg till ${quantity} st`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}