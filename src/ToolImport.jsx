import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Wrench, Package } from 'lucide-react';
import { toast } from 'sonner';

const SERVICE_TYPE_LABELS = {
  repair: 'Reparation',
  maintenance: 'Underhåll',
  inspection: 'Inspektion',
  calibration: 'Kalibrering',
  replacement_parts: 'Reservdelar',
  annual_service: 'Årlig service',
};

const SERVICE_TYPE_COLORS = {
  repair: 'bg-red-100 text-red-700',
  maintenance: 'bg-blue-100 text-blue-700',
  inspection: 'bg-purple-100 text-purple-700',
  calibration: 'bg-yellow-100 text-yellow-700',
  replacement_parts: 'bg-green-100 text-green-700',
  annual_service: 'bg-orange-100 text-orange-700',
};

const EMPTY_TEMPLATE = {
  name: '',
  description: '',
  cost: '',
  service_type: 'maintenance',
  parts_used: [],
};

function TemplateFormDialog({ open, onClose, initial }) {
  const queryClient = useQueryClient();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(initial || EMPTY_TEMPLATE);
  const [newPart, setNewPart] = useState({ part_name: '', quantity: 1 });

  React.useEffect(() => {
    setForm(initial || EMPTY_TEMPLATE);
    setNewPart({ part_name: '', quantity: 1 });
  }, [initial, open]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.ServiceTemplate.update(initial.id, data)
        : base44.entities.ServiceTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceTemplates'] });
      toast.success(isEdit ? 'Mall uppdaterad' : 'Mall skapad');
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ServiceTemplate.delete(initial.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceTemplates'] });
      toast.success('Mall borttagen');
      onClose();
    },
  });

  const addPart = () => {
    if (!newPart.part_name.trim()) return;
    setForm(f => ({ ...f, parts_used: [...(f.parts_used || []), { ...newPart }] }));
    setNewPart({ part_name: '', quantity: 1 });
  };

  const removePart = (idx) => {
    setForm(f => ({ ...f, parts_used: f.parts_used.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Namn krävs'); return; }
    saveMutation.mutate({
      ...form,
      cost: form.cost === '' ? null : Number(form.cost),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Redigera mall' : 'Skapa servicemall'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Namn *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex. Oljebyte motor" />
          </div>
          <div className="space-y-1">
            <Label>Typ av service</Label>
            <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Beskrivning / vad som utförs</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Beskriv serviceåtgärden..."
            />
          </div>
          <div className="space-y-1">
            <Label>Kostnad (kr)</Label>
            <Input
              type="number"
              value={form.cost}
              onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label>Delar/komponenter</Label>
            {(form.parts_used || []).map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Package className="w-4 h-4 text-gray-400" />
                <span className="flex-1 text-sm">{p.part_name}</span>
                <span className="text-sm text-gray-500">× {p.quantity}</span>
                <button onClick={() => removePart(i)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Delnamn..."
                value={newPart.part_name}
                onChange={e => setNewPart(p => ({ ...p, part_name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') addPart(); }}
                className="flex-1"
              />
              <Input
                type="number"
                min="1"
                value={newPart.quantity}
                onChange={e => setNewPart(p => ({ ...p, quantity: Number(e.target.value) }))}
                className="w-20"
              />
              <Button type="button" variant="outline" onClick={addPart}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {isEdit && (
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              <Trash2 className="w-4 h-4 mr-1" /> Ta bort
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
            {saveMutation.isPending ? 'Sparar...' : isEdit ? 'Spara' : 'Skapa mall'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ServiceMallar() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['serviceTemplates'],
    queryFn: () => base44.entities.ServiceTemplate.list('name'),
  });

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (t) => { setEditing(t); setDialogOpen(true); };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-7 h-7 text-[#8B1E1E]" /> Service Mallar
          </h1>
          <p className="text-gray-500 text-sm mt-1">Skapa mallar för vanliga serviceåtgärder</p>
        </div>
        <Button onClick={openNew} className="bg-[#8B1E1E] hover:bg-[#6B1515]">
          <Plus className="w-4 h-4 mr-2" /> Ny mall
        </Button>
      </div>

      {isLoading && <div className="text-center py-12 text-gray-500">Laddar mallar...</div>}

      {!isLoading && templates.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Inga mallar skapade än.</p>
          <Button onClick={openNew} className="mt-4 bg-[#8B1E1E] hover:bg-[#6B1515]">
            <Plus className="w-4 h-4 mr-2" /> Skapa första mallen
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map(t => (
          <div
            key={t.id}
            onClick={() => openEdit(t)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{t.name}</h3>
                {t.cost != null && (
                  <p className="text-sm text-gray-500 mt-0.5">{Number(t.cost).toLocaleString('sv-SE')} kr</p>
                )}
              </div>
              <Badge className={SERVICE_TYPE_COLORS[t.service_type] || 'bg-gray-100 text-gray-700'}>
                {SERVICE_TYPE_LABELS[t.service_type] || t.service_type}
              </Badge>
            </div>
            {t.description && <p className="text-sm text-gray-600 line-clamp-2">{t.description}</p>}
            {t.parts_used?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {t.parts_used.map((p, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                    {p.part_name} × {p.quantity}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Redigera
              </button>
            </div>
          </div>
        ))}
      </div>

      <TemplateFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        initial={editing}
      />
    </div>
  );
}