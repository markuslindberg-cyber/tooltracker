import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

const subcategoriesByCategory = {
  'Spadar': ['Rakspad', 'Rundad', 'Fyrkantig'],
  'Räfsor': ['Järnräfsa', 'Träräfsa', 'Bamburäfsa'],
  'Krattor': ['Metallkratta', 'Plast-kratta', 'Bambu-kratta'],
  'Sagar': ['Handsåg', 'Bågså', 'Nippelkätting'],
  'Hammrar': ['Klumhugg', 'Gummihammer', 'Slägga'],
  'Skufflar': ['Järnskuffel', 'Träskuffel', 'Plast-skuffel'],
  'Banor': ['Järnbana', 'Träbana'],
  'Avspärrningsmaterial': ['Farthinder', 'Skyltar', 'Kravallstaketet', 'Koner', 'Markeringsskärmar'],
};
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function HandToolEditModal({ isOpen, onClose, tool, locations, onSuccess }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);

  const { data: categoryImages = [] } = useQuery({
    queryKey: ['categoryimages'],
    queryFn: () => base44.entities.CategoryImage.list('category'),
    enabled: isOpen,
  });
  const categoryImageMap = Object.fromEntries(categoryImages.map(ci => [ci.category, ci.image_url]));

  const { data: allHandTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list('-updated_date', 200),
    enabled: isOpen,
  });

  const availableCategories = [...new Set([
    ...Object.keys(subcategoriesByCategory),
    ...allHandTools.map(t => t.category).filter(Boolean),
  ])].sort();

  const availableSubcategories = [...new Set([
    ...(subcategoriesByCategory[form.category] || []),
    ...allHandTools.filter(t => t.category === form.category).map(t => t.subcategory).filter(Boolean),
  ])].sort();

  useEffect(() => {
    if (tool) { setForm({ ...tool }); setShowCustomSubcategory(false); }
  }, [tool]);

  const handleChange = (field, value) => {
    if (field === 'location_id') {
      const loc = locations?.find(l => l.id === value);
      setForm(p => ({ ...p, location_id: value, location_name: loc?.name || '' }));
    } else {
      setForm(p => ({ ...p, [field]: value }));
    }
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, image_url: file_url, custom_image: true }));
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleResetToCategory = () => {
    const catImg = categoryImageMap[form.category];
    setForm(p => ({ ...p, image_url: catImg || '', custom_image: false }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    await base44.entities.HandTool.update(tool.id, form);

    // If image changed, propagate to all tools with the same name+category
    if (form.image_url && form.image_url !== tool.image_url) {
      const siblings = allHandTools.filter(
        t => t.id !== tool.id && t.name === form.name && t.category === form.category
      );
      if (siblings.length > 0) {
        await Promise.all(
          siblings.map(t => base44.entities.HandTool.update(t.id, { image_url: form.image_url }))
        );
      }
    }

    setSaving(false);
    onSuccess?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Redigera redskap</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Namn</Label>
              <Input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tillverkare</Label>
              <Input value={form.manufacturer || ''} onChange={e => handleChange('manufacturer', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Kategori</Label>
              <Input
                value={form.category || ''}
                onChange={e => handleChange('category', e.target.value)}
                placeholder="Välj eller skriv ny"
                list="edit-category-suggestions"
              />
              <datalist id="edit-category-suggestions">
                {availableCategories.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label>Streckkod</Label>
              <Input value={form.barcode || ''} onChange={e => handleChange('barcode', e.target.value)} placeholder="Ange eller skanna streckkod" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Underkategori</Label>
            {showCustomSubcategory ? (
              <div className="flex gap-2">
                <Input
                  value={form.subcategory || ''}
                  onChange={e => handleChange('subcategory', e.target.value)}
                  placeholder="Skriv ny underkategori"
                  autoFocus
                />
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => { setShowCustomSubcategory(false); handleChange('subcategory', ''); }}>
                  Avbryt
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={form.subcategory || ''} onValueChange={v => { if (v === '__custom__') { setShowCustomSubcategory(true); handleChange('subcategory', ''); } else { handleChange('subcategory', v); } }}>
                  <SelectTrigger><SelectValue placeholder="Välj underkategori" /></SelectTrigger>
                  <SelectContent>
                    {availableSubcategories.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Lägg till ny...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => handleChange('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="i_lager">I lager</SelectItem>
                  <SelectItem value="i_bruk">I bruk</SelectItem>
                  <SelectItem value="saknas">Saknas</SelectItem>
                  <SelectItem value="kasserad">Kasserad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Bild</Label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-gray-100 border overflow-hidden flex items-center justify-center shrink-0">
                {form.image_url
                  ? <img src={form.image_url} alt="preview" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                  : <span className="text-xs text-gray-400 text-center px-1">Ingen bild</span>}
              </div>
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
                    {uploadingImage ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Laddar upp...</> : <><Upload className="w-3.5 h-3.5" />Ladda upp bild</>}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} disabled={uploadingImage} />
                </label>
                {categoryImageMap[form.category] && (
                  <button
                    onClick={handleResetToCategory}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Återställ till kategoribild
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Plats</Label>
            <Select value={form.location_id || ''} onValueChange={v => handleChange('location_id', v)}>
              <SelectTrigger><SelectValue placeholder="Välj plats" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Ingen plats</SelectItem>
                {locations?.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Anteckningar</Label>
            <Textarea value={form.notes || ''} onChange={e => handleChange('notes', e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : 'Spara ändringar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}