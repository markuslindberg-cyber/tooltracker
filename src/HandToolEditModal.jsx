import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MobileSelect from '@/components/ui/mobile-select';
import TemplateSearchSelect from '@/components/ui/TemplateSearchSelect';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

const categories = [
  'Arbetskläder varsel',
  'Arbetskläder',
  'Skor',
  'Skyddsutrustning',
];

const subcategoriesByCategory = {
  'Arbetskläder varsel': [
    'Shorts',
    'Knäbyxor',
    'Stretchbyxor',
    'Snickarbyxor',
    'Termobyxor',
    'Piké-trojor',
    'Fleecejackor',
    'Västar',
    'Vinterjacka',
  ],
  'Arbetskläder': [
    'Termounderställ',
    'Mössor',
    'Sommarhandskar',
    'Vinterhandskar',
    'Kepsar',
    'Shorts',
    'Knäbyxor',
    'Stretchbyxor',
    'Snickarbyxor',
    'Piké-trojor',
    'Termobyxor',
    'Fleecejackor',
    'Skaljackor',
    'Regnkläder/varsel',
  ],
  'Skor': [
    'Skyddsskor',
    'Vinterskor',
    'Gummistövlar',
    'Sågstövlar',
  ],
  'Skyddsutrustning': [
    'Hörselskydd',
    'Skyddsglasogon',
    'Skyddshälmar',
    'Munskydd',
  ],
};

const handskeSizes = ['12', '11', '10', '9', '8', '7'];

const sizesByCategory = {
  'Arbetskläder varsel': ['XXL', 'XL', 'L', 'M', 'S', 'XS', 'XXS'],
  'Arbetskläder': ['XXL', 'XL', 'L', 'M', 'S', 'XS', 'XXS'],
  'Skor': ['47', '46', '45', '44', '43', '42', '41', '40', '39', '38', '37', '36', '35'],
  'Skyddsutrustning': ['XXL', 'XL', 'L', 'M', 'S', 'XS', 'XXS'],
  'Sommarhandskar': handskeSizes,
  'Vinterhandskar': handskeSizes,
};

const statuses = ['i_lager', 'i_bruk', 'saknas', 'kasserad'];
const conditions = ['ny', 'bra', 'okej', 'dålig'];

const statusLabels = {
  i_lager: 'I lager',
  i_bruk: 'I bruk',
  saknas: 'Saknas',
  kasserad: 'Kasserad',
};

const conditionLabels = {
  ny: 'Ny',
  bra: 'Bra',
  okej: 'Okej',
  dålig: 'Dålig',
};

export default function ArbetskläderUtrustningFormModal({
  isOpen,
  onClose,
  item,
  locations,
}) {
  const { data: allItems = [] } = useQuery({
    queryKey: ['arbetskläder'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 500),
  });

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    category: '',
    subcategory: '',
    size: '',
    quantity: 0,
    status: 'i_lager',
    condition: 'bra',
    location_id: '',
    location_name: '',
    purchase_date: '',
    purchase_price: '',
    barcode: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState('');
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Build unique template options from existing items (exclude deleted, deduplicate by name)
  const templateOptions = React.useMemo(() => {
    const seen = new Set();
    return allItems
      .filter(t => !t.is_deleted)
      .filter(t => {
        const key = `${t.name}||${t.category}||${t.manufacturer || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(t => ({
        value: t.id,
        label: `${t.name}${t.manufacturer ? ' - ' + t.manufacturer : ''} (${t.category})`
      }));
  }, [allItems]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        manufacturer: item.manufacturer || '',
        category: item.category || '',
        subcategory: item.subcategory || '',
        size: item.size || '',
        quantity: item.quantity || 0,
        status: item.status || 'i_lager',
        condition: item.condition || 'bra',
        location_id: item.location_id || '',
        location_name: item.location_name || '',
        purchase_date: item.purchase_date || '',
        purchase_price: item.purchase_price || '',
        barcode: item.barcode || '',
        notes: item.notes || '',
      });
      setCustomSubcategory('');
      setShowCustomSubcategory(false);
      setSelectedTemplate('');
    } else {
      const defaultLocation = locations.find(l => l.name === 'Danmarksgatan');
      setFormData({
        name: '',
        manufacturer: '',
        category: '',
        subcategory: '',
        size: '',
        quantity: 0,
        status: 'i_lager',
        condition: 'bra',
        location_id: defaultLocation?.id || '',
        location_name: defaultLocation?.name || '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_price: '',
        barcode: '',
        notes: '',
      });
      setSelectedTemplate('');
    }
  }, [item, isOpen, locations]);

  const loadTemplate = (templateId) => {
    const template = allItems.find(t => t.id === templateId);
    if (template) {
      const defaultLocation = locations.find(l => l.name === 'Danmarksgatan');
      setFormData({
        name: template.name || '',
        manufacturer: template.manufacturer || '',
        category: template.category || '',
        subcategory: template.subcategory || '',
        size: template.size || '',
        quantity: 0,
        status: 'i_lager',
        condition: 'ny',
        location_id: defaultLocation?.id || '',
        location_name: defaultLocation?.name || '',
        purchase_date: '',
        purchase_price: '',
        barcode: '',
        notes: '',
      });
      setSelectedTemplate(templateId);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'location_id') {
        const selectedLocation = locations.find(l => l.id === value);
        updated.location_name = selectedLocation?.name || '';
      }
      if (field === 'category') {
        updated.subcategory = '';
        setShowCustomSubcategory(false);
        setCustomSubcategory('');
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) {
      toast.error('Namn och kategori är obligatoriska');
      return;
    }

    setIsLoading(true);
    try {
      const dataToSubmit = {
        ...formData,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      };

      if (item) {
        await base44.entities.ArbetskläderUtrustning.update(item.id, dataToSubmit);
        toast.success('Artikel uppdaterad');
      } else {
        await base44.entities.ArbetskläderUtrustning.create(dataToSubmit);
        toast.success('Artikel tillagd');
      }
      onClose();
    } catch (error) {
      toast.error('Ett fel uppstod: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Redigera artikel' : 'Ny artikel'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Använd som mall (endast när nya arbetskläder skapas) */}
          {!item && templateOptions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Använd tidigare arbetskläder som mall
              </label>
              <TemplateSearchSelect
                options={templateOptions}
                value={selectedTemplate}
                onChange={loadTemplate}
                placeholder="Sök eller välj arbetskläder att kopiera från"
              />
              <p className="text-xs text-gray-600 mt-2">
                Välj en tidigare artikel för att kopiera dess egenskaper.
              </p>
            </div>
          )}

          {/* Namn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Namn *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="T.ex. Arbetskjorta"
            />
          </div>

          {/* Tillverkare */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tillverkare
            </label>
            <Input
              value={formData.manufacturer}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              placeholder="T.ex. Nike"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori *
            </label>
            <MobileSelect
              value={formData.category || ''}
              onChange={(v) => handleChange('category', v)}
              options={categories.map((cat) => ({
                value: cat,
                label: cat
              }))}
              placeholder="Välj kategori"
            />
          </div>

          {/* Subcategory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ av plagg
            </label>
            {!showCustomSubcategory ? (
              <Select value={formData.subcategory || ''} onValueChange={(v) => {
                if (v === '__custom__') {
                  setShowCustomSubcategory(true);
                  setCustomSubcategory('');
                } else {
                  handleChange('subcategory', v);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  {formData.category && subcategoriesByCategory[formData.category]?.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ Lägg till egen</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={customSubcategory}
                  onChange={(e) => setCustomSubcategory(e.target.value)}
                  placeholder="Ny underkategori"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (customSubcategory.trim()) {
                      handleChange('subcategory', customSubcategory.trim());
                      setShowCustomSubcategory(false);
                    }
                  }}
                  className="whitespace-nowrap"
                >
                  OK
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCustomSubcategory(false);
                    setCustomSubcategory('');
                  }}
                  className="whitespace-nowrap"
                >
                  Avbryt
                </Button>
              </div>
            )}
          </div>

          {/* Storlek */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storlek
            </label>
            <MobileSelect
              value={formData.size || ''}
              onChange={(v) => handleChange('size', v)}
              options={
                (sizesByCategory[formData.subcategory] || sizesByCategory[formData.category] || sizesByCategory['Arbetskläder varsel']).map((size) => ({
                  value: size,
                  label: size
                }))
              }
              placeholder="Välj storlek"
            />
          </div>

          {/* Antal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Antal
            </label>
            <Input
              type="number"
              inputMode="numeric"
              value={formData.quantity === 0 ? '' : formData.quantity}
              onChange={(e) => handleChange('quantity', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
              onFocus={(e) => { if (formData.quantity === 0) handleChange('quantity', ''); }}
              onBlur={(e) => { if (e.target.value === '') handleChange('quantity', 0); }}
              placeholder="0"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <MobileSelect
              value={formData.status || 'i_lager'}
              onChange={(v) => handleChange('status', v)}
              options={statuses.map((status) => ({
                value: status,
                label: statusLabels[status]
              }))}
              placeholder="Välj status"
            />
          </div>

          {/* Skick */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skick
            </label>
            <MobileSelect
              value={formData.condition || 'bra'}
              onChange={(v) => handleChange('condition', v)}
              options={conditions.map((cond) => ({
                value: cond,
                label: conditionLabels[cond]
              }))}
              placeholder="Välj skick"
            />
          </div>

          {/* Plats */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plats
            </label>
            <MobileSelect
              value={formData.location_id || ''}
              onChange={(v) => handleChange('location_id', v)}
              options={[
                { value: '', label: 'Ingen plats' },
                ...locations.map((loc) => ({
                  value: loc.id,
                  label: loc.name
                }))
              ]}
              placeholder="Välj plats"
            />
          </div>

          {/* Köpdata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Köpsdatum
              </label>
              <Input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Köppris
              </label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => handleChange('purchase_price', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Anteckningar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anteckningar
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Lägg till anteckningar..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Sparar...' : 'Spara'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}