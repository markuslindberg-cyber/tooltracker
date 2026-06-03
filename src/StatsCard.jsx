import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MobileSelect from "@/components/ui/mobile-select";
import { ArrowRight, MapPin, User, Loader2, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TransferModal({
  isOpen,
  onClose,
  tool,
  locations,
  teamMembers,
  onSubmit,
  isLoading,
}) {
  const [toLocationId, setToLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');

  const selectedLocation = locations?.find(l => l.id === toLocationId);

  const handleSubmit = () => {
    onSubmit({
      tool_id: tool.id,
      tool_name: tool.name,
      from_location_id: tool.location_id,
      from_location_name: tool.location_name,
      to_location_id: toLocationId,
      to_location_name: selectedLocation?.name || '',
      from_person_email: '',
      from_person_name: '',
      to_person_email: '',
      to_person_name: '',
      transfer_date: new Date().toISOString(),
      expected_return_date: expectedReturnDate || null,
      status: 'active',
      notes,
    });
  };

  const handleClose = () => {
    setToLocationId('');
    setNotes('');
    setExpectedReturnDate('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Förflytta verktyg</DialogTitle>
        </DialogHeader>

        {tool && (
          <div className="space-y-6">
            {/* Tool Info */}
            <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-3xl shadow-sm">
                {tool.image_url ? (
                  <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  "🔧"
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{tool.name}</h4>
                <p className="text-sm text-gray-500">{tool.model_number || 'Inget modellnummer'}</p>
              </div>
            </div>

            {/* Current Location */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex-1 p-3 bg-[#8B1E1E]/5 rounded-xl border border-[#8B1E1E]/20">
                <p className="text-xs text-gray-500 mb-1">Nuvarande plats</p>
                <p className="font-medium text-gray-900">{tool.location_name || 'Ej tilldelad'}</p>
                {tool.assigned_to_name && (
                  <p className="text-gray-600 mt-1">hos {tool.assigned_to_name}</p>
                )}
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-gray-500 mb-1">Ny plats</p>
                <p className="font-medium text-gray-900">
                  {selectedLocation?.name || 'Välj destination'}
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Ny plats
                  </Label>
                  <MobileSelect
                    value={toLocationId}
                    onChange={setToLocationId}
                    options={
                      locations?.filter(l => l.is_active !== false).map((location) => ({
                        value: location.id,
                        label: `${location.name} (${location.type?.replace('_', ' ')})`
                      })) || []
                    }
                    placeholder="Välj destinationsplats"
                  />
                </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Förväntat återlämningsdatum (valfritt)
                </Label>
                <Input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-500">Ange när verktyget ska återlämnas</p>
              </div>

              <div className="space-y-2">
                <Label>Anteckningar (valfritt)</Label>
                <Textarea
                  placeholder="Lägg till anteckningar om denna förflyttning..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={handleClose}>
            Avbryt
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!toLocationId || isLoading}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Förflyttar...
              </>
            ) : (
              'Bekräfta förflyttning'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}