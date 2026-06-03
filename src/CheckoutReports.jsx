import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, X, Check, Camera, Search } from 'lucide-react';
import { useBarcodeCamera } from '@/hooks/useBarcodeCamera';
import ScannerOverlay from '@/components/ScannerOverlay';
import TorchButton from '@/components/ui/TorchButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ArbetskläderRequestWorkwear() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    recipient_first_name: '',
    recipient_last_name: '',
    project: '',
    requested_items: [],
    notes: '',
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [user, setUser] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const { torchOn, torchSupported, toggleTorch } = useBarcodeCamera(
    'workwear-request-scanner',
    scannerActive,
    (barcode) => handleBarcodeScan(barcode)
  );

  const handleBarcodeScan = (barcode) => {
    const found = items.find(i => i.barcode === barcode);
    if (found) {
      setSelectedItem(found);
      setSelectedQty(1);
      setScannerActive(false);
      setManualBarcode('');
    } else {
      alert(`Ingen artikel hittades med streckkod: ${barcode}`);
    }
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: items = [] } = useQuery({
    queryKey: ['arbetskläder'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list('-updated_date', 500).catch(() => []),
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('createWorkwearRequest', data);
      return res.data;
    },
    onSuccess: () => {
      setFormData({
        recipient_first_name: '',
        recipient_last_name: '',
        project: '',
        requested_items: [],
        notes: '',
      });
      setSelectedItem(null);
      setSelectedQty(1);
      queryClient.invalidateQueries({ queryKey: ['workwearRequests'] });
      alert('Begäran skickad till Admin-Lokalvård för godkännande!');
    },
  });

  const addItem = () => {
    if (!selectedItem) return;
    const existingItem = formData.requested_items.find(i => i.id === selectedItem.id);
    if (existingItem) {
      setFormData(prev => ({
        ...prev,
        requested_items: prev.requested_items.map(i =>
          i.id === selectedItem.id ? { ...i, quantity: i.quantity + selectedQty } : i
        )
      }));
    } else {
     setFormData(prev => ({
       ...prev,
       requested_items: [...prev.requested_items, {
         id: selectedItem.id,
         name: selectedItem.name,
         subcategory: selectedItem.subcategory,
         size: selectedItem.size,
         quantity: selectedQty,
       }]
     }));
    }
    setSelectedItem(null);
    setSelectedQty(1);
  };

  const removeItem = (id) => {
    setFormData(prev => ({
      ...prev,
      requested_items: prev.requested_items.filter(i => i.id !== id)
    }));
  };

  const handleSubmit = () => {
    if (!formData.recipient_first_name || !formData.recipient_last_name || formData.requested_items.length === 0) {
      alert('Fyll i namn och lägg till minst en artikel');
      return;
    }

    const customerName = `${formData.recipient_first_name} ${formData.recipient_last_name}`.trim();
    
    const submitData = {
      customer_id: user?.id || '',
      customer_name: customerName,
      requested_items: formData.requested_items,
      request_date: new Date().toISOString(),
      requested_by_email: user?.email || '',
      requested_by_name: user?.full_name || '',
      notes: formData.notes,
      status: 'pending',
    };

    createRequestMutation.mutate(submitData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold dark:text-gray-100">Begäran om arbetskläder och skyddsutrustning</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Fyll i formuläret för att göra en begäran</p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Recipient Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Förnamn *</Label>
            <Input
              value={formData.recipient_first_name}
              onChange={(e) => setFormData(prev => ({ ...prev, recipient_first_name: e.target.value }))}
              placeholder="Förnamn"
            />
          </div>
          <div className="space-y-2">
            <Label>Efternamn *</Label>
            <Input
              value={formData.recipient_last_name}
              onChange={(e) => setFormData(prev => ({ ...prev, recipient_last_name: e.target.value }))}
              placeholder="Efternamn"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Projektnummer</Label>
          <Input
            value={formData.project}
            onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
            placeholder="t.ex. PROJ-2024-001"
          />
        </div>

        {/* Item Selection */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold text-lg">Artiklar</h3>
          
          <div className="space-y-2">
            <Label>Välj artikel</Label>
            <Select value={selectedItem?.id || ''} onValueChange={(id) => {
              const item = items.find(i => i.id === id);
              setSelectedItem(item);
              setSelectedQty(1);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sök och välj artikel..." />
              </SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}, {item.subcategory || 'Okänd'}, {item.size || '-'} - {item.location_name || 'Okänd plats'} (Tillgängligt: {item.quantity || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Barcode Scanner */}
          {!scannerActive ? (
            <div className="flex gap-2">
              <Button onClick={() => setScannerActive(true)} variant="outline" className="flex-1 h-10">
                <Camera className="w-5 h-5 mr-2" />Skanna streckkod
              </Button>
              <div className="flex-1 flex gap-1">
                <Input
                  placeholder="Ange streckkod manuellt"
                  value={manualBarcode}
                  onChange={e => setManualBarcode(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && manualBarcode) { handleBarcodeScan(manualBarcode); } }}
                  className="text-sm"
                />
                <Button onClick={() => handleBarcodeScan(manualBarcode)} disabled={!manualBarcode} size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <div id="workwear-request-scanner" className="rounded-xl overflow-hidden bg-black" style={{ minHeight: '250px' }} />
                <ScannerOverlay />
              </div>
              <div className="flex gap-2">
                <div className="flex-1 flex gap-1">
                  <Input
                    placeholder="Manuell streckkod"
                    value={manualBarcode}
                    onChange={e => setManualBarcode(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && manualBarcode) { handleBarcodeScan(manualBarcode); } }}
                    className="text-sm"
                  />
                  <Button onClick={() => handleBarcodeScan(manualBarcode)} disabled={!manualBarcode} size="sm">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                <TorchButton torchOn={torchOn} torchSupported={torchSupported} toggleTorch={toggleTorch} />
                <Button onClick={() => setScannerActive(false)} variant="outline" size="sm">Stäng</Button>
              </div>
            </div>
          )}

          {selectedItem && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>Antal</Label>
                <Input
                  type="number"
                  min="1"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <Button
                onClick={addItem}
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till
              </Button>
            </div>
          )}

          {/* Selected Items List */}
          {formData.requested_items.length > 0 && (
            <div className="space-y-2">
              <Label>Valda artiklar</Label>
              <div className="space-y-2">
                {formData.requested_items.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <div>
                      <p className="font-medium dark:text-gray-100">{item.name}, {item.subcategory || 'Okänd'}, {item.size || '-'}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Antal: {item.quantity}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Anteckningar</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Lägg till eventuella kommentarer..."
            rows={3}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={createRequestMutation.isPending}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {createRequestMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Skicka begäran
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}