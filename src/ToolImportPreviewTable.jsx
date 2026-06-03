import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Plus, AlertCircle } from 'lucide-react';

export default function ManualScanDialog({ isOpen, onClose, allItems, onManualAdd }) {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState('1');
  const [foundItem, setFoundItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setBarcodeInput('');
      setQuantityInput('1');
      setFoundItem(null);
      setError('');
    }
  }, [isOpen]);

  const handleSearch = () => {
    setError('');
    setFoundItem(null);
    const trimmed = barcodeInput.trim();
    if (!trimmed) {
      setError('Ange en streckkod eller artikelnummer.');
      return;
    }

    let item = allItems.find(i =>
      i.streckkod === trimmed ||
      i.old_streckkod === trimmed ||
      i.artikelnummer === trimmed
    );

    if (!item) {
      item = allItems.find(i => (i.benamning || i.name || '').toLowerCase().includes(trimmed.toLowerCase()));
    }

    if (!item) {
      setError(`Artikel med '${trimmed}' hittades inte.`);
      return;
    }

    setFoundItem(item);
  };

  const handleAdd = () => {
    const quantity = parseInt(quantityInput, 10);
    if (isNaN(quantity) || quantity <= 0) {
      setError('Antal måste vara ett positivt nummer.');
      return;
    }

    if (!foundItem) {
      setError('Sök och välj en artikel först.');
      return;
    }

    onManualAdd(foundItem, quantity);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manuell inmatning</DialogTitle>
          <DialogDescription>
            Ange streckkod eller artikelnummer och önskat antal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="manualBarcode">Streckkod / Artikelnummer</Label>
            <div className="flex space-x-2">
              <Input
                id="manualBarcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="col-span-3"
              />
              <Button onClick={handleSearch}><Search className="w-4 h-4" /></Button>
            </div>
          </div>
          {foundItem && (
            <div className="p-3 border rounded-md bg-green-50 text-green-700">
              <p className="font-medium">{foundItem.benamning || foundItem.name}</p>
              <p className="text-sm">Streckkod: {foundItem.streckkod || foundItem.barcode}</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="manualQuantity">Antal</Label>
            <Input
              id="manualQuantity"
              type="number"
              min="1"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleAdd} disabled={!foundItem || !quantityInput || parseInt(quantityInput, 10) <= 0}>
            <Plus className="w-4 h-4 mr-2" /> Lägg till
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}