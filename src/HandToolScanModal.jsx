import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Loader2 } from 'lucide-react';

export default function BulkMoveModal({ isOpen, onClose, selectedCount, locations, onSubmit }) {
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedLocation = locations.find(l => l.id === locationId);

  const handleSubmit = async () => {
    if (!locationId) return;
    setLoading(true);
    await onSubmit(locationId, selectedLocation?.name || '');
    setLoading(false);
    setLocationId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ändra plats för {selectedCount} maskiner</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Ny plats</label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Välj plats..." />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {loc.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Avbryt</Button>
            <Button
              disabled={!locationId || loading}
              onClick={handleSubmit}
              className="bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Flytta maskiner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}