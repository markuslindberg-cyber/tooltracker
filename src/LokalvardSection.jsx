import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wrench } from 'lucide-react';

const defaultServiceRecord = {
  service_type: 'repair',
  cost: '',
  service_date: new Date().toISOString().split('T')[0],
  description: '',
  performed_by: '',
  notes: '',
};

export default function ServiceRecordModal({ isOpen, onClose, tool, onSubmit }) {
  const [formData, setFormData] = useState(defaultServiceRecord);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!tool?.id || !formData.cost || !formData.service_date) return;

    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        tool_id: tool.id,
        tool_name: tool.name,
        cost: parseFloat(formData.cost),
      });
      setFormData(defaultServiceRecord);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#8B1E1E]" />
            Lägg till servicepost
          </DialogTitle>
        </DialogHeader>

        {tool && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-500">Verktyg</p>
            <p className="font-semibold text-gray-900">{tool.name}</p>
            {tool.model_number && (
              <p className="text-sm text-gray-600">{tool.model_number}</p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Servicetyp *</Label>
              <Select value={formData.service_type} onValueChange={(v) => handleChange('service_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Reparation</SelectItem>
                  <SelectItem value="maintenance">Underhåll</SelectItem>
                  <SelectItem value="inspection">Inspektion</SelectItem>
                  <SelectItem value="calibration">Kalibrering</SelectItem>
                  <SelectItem value="replacement_parts">Reservdelar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kostnad *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Servicedatum *</Label>
              <Input
                type="date"
                value={formData.service_date}
                onChange={(e) => handleChange('service_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Utförd av</Label>
              <Input
                placeholder="t.ex. Internt team, Extern service"
                value={formData.performed_by}
                onChange={(e) => handleChange('performed_by', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Beskrivning *</Label>
            <Textarea
              placeholder="Beskriv utförd service..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Anteckningar</Label>
            <Textarea
              placeholder="Ytterligare anteckningar..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.cost || !formData.service_date || !formData.description || isLoading}
            className="bg-[#8B1E1E] hover:bg-[#6B1515]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              'Lägg till servicepost'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}