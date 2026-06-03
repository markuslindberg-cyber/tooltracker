import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, ChevronDown, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MASKIN_TYPER = [
  'Traktor',
  'Redskapsbärare',
  'Hjullastare',
  'Grävmaskin',
  'Lastbil',
  'Minidumper',
  'Övrigt',
];
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function Huvudmaskiner() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    typ: '',
    manufacturer: '',
    model: '',
    year_model: '',
    registration_number: '',
    project_number: '',
    location_id: '',
    location_name: '',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: huvudmaskiner = [] } = useQuery({
    queryKey: ['huvudmaskiner'],
    queryFn: () => base44.entities.Huvudmaskin.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Huvudmaskin.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huvudmaskiner'] });
      resetForm();
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Huvudmaskin.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huvudmaskiner'] });
      resetForm();
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Huvudmaskin.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['huvudmaskiner'] });
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (maskin) => {
    setFormData(maskin);
    setEditingId(maskin.id);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      typ: '',
      manufacturer: '',
      model: '',
      year_model: '',
      registration_number: '',
      project_number: '',
      location_id: '',
      location_name: '',
      notes: '',
    });
    setEditingId(null);
  };

  const getRelatedTools = (maskinId) => {
    return tools.filter(
      (tool) =>
        (tool.main_machine_id === maskinId ||
          tool.compatible_with_main_machine_ids?.includes(maskinId)) &&
        tool.category === 'Redskap'
    );
  };

  const getOwnedTools = (maskinId) => {
    return tools.filter(
      (tool) => tool.main_machine_id === maskinId && tool.category === 'Redskap'
    );
  };

  const getCompatibleTools = (maskinId) => {
    return tools.filter(
      (tool) =>
        tool.compatible_with_main_machine_ids?.includes(maskinId) &&
        tool.category === 'Redskap'
    );
  };

  const filteredMaskiner = huvudmaskiner.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold">Huvudmaskiner</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="gap-2">
              <Plus className="w-4 h-4" />
              Ny huvudmaskin
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-16px)] sm:w-auto sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Redigera huvudmaskin' : 'Ny huvudmaskin'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Typ</Label>
                <Select
                  value={formData.typ}
                  onValueChange={(value) => setFormData({ ...formData, typ: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj typ" />
                  </SelectTrigger>
                  <SelectContent>
                    {MASKIN_TYPER.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Projektnamn *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Projektnamn"
                />
              </div>
              <div>
                <Label>Tillverkare</Label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) =>
                    setFormData({ ...formData, manufacturer: e.target.value })
                  }
                  placeholder="Tillverkare"
                />
              </div>
              <div>
                <Label>Modell</Label>
                <Input
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="Modell"
                />
              </div>
              <div>
                <Label>Årsmodell</Label>
                <Input
                  type="number"
                  value={formData.year_model}
                  onChange={(e) =>
                    setFormData({ ...formData, year_model: e.target.value })
                  }
                  placeholder="År"
                />
              </div>
              <div>
                <Label>Regnummer</Label>
                <Input
                  value={formData.registration_number}
                  onChange={(e) =>
                    setFormData({ ...formData, registration_number: e.target.value })
                  }
                  placeholder="Regnummer"
                />
              </div>
              <div>
                <Label>Projektnummer</Label>
                <Input
                  value={formData.project_number}
                  onChange={(e) =>
                    setFormData({ ...formData, project_number: e.target.value })
                  }
                  placeholder="Projektnummer"
                />
              </div>
              <div>
                <Label>Plats</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) => {
                    const loc = locations.find((l) => l.id === value);
                    setFormData({
                      ...formData,
                      location_id: value,
                      location_name: loc?.name || '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj plats" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Anteckningar</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Anteckningar"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Avbryt
                </Button>
                <Button onClick={handleSubmit}>
                  {editingId ? 'Uppdatera' : 'Skapa'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Sök huvudmaskiner..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="grid gap-4">
        {filteredMaskiner.map((maskin) => {
          const ownedTools = getOwnedTools(maskin.id);
          const compatibleTools = getCompatibleTools(maskin.id);
          const isExpanded = expandedId === maskin.id;

          return (
            <Card key={maskin.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : maskin.id)
                      }
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div>
                      <h3 className="font-semibold text-lg">{maskin.name}</h3>
                      {maskin.typ && (
                        <span className="inline-block text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5 mb-1">{maskin.typ}</span>
                      )}
                      {maskin.manufacturer && (
                        <p className="text-sm text-gray-600">
                          {maskin.manufacturer}
                          {maskin.model && ` - ${maskin.model}`}
                          {maskin.year_model && ` (${maskin.year_model})`}
                        </p>
                      )}
                      {maskin.registration_number && (
                        <p className="text-sm text-gray-600">
                          Regnummer: {maskin.registration_number}
                        </p>
                      )}
                      {maskin.project_number && (
                        <p className="text-sm text-gray-600">
                          Projektnummer: {maskin.project_number}
                        </p>
                      )}
                      {maskin.location_name && (
                        <p className="text-sm text-gray-500">
                          Plats: {maskin.location_name}
                        </p>
                      )}
                      {tools.find(t => t.main_machine_id === maskin.id)?.assigned_to_name && (
                        <p className="text-sm text-gray-500">
                          Ansvarig: {tools.find(t => t.main_machine_id === maskin.id)?.assigned_to_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(maskin)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteMutation.mutate(maskin.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 ml-8 space-y-4 border-t pt-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      Redskap som tillhör denna maskin ({ownedTools.length})
                    </h4>
                    {ownedTools.length > 0 ? (
                      <ul className="space-y-1">
                        {ownedTools.map((tool) => (
                         <li key={tool.id} className="text-sm text-gray-700">
                           •{' '}
                           <button
                             onClick={() => setSelectedTool(tool)}
                             className="text-blue-600 hover:text-blue-800 underline"
                           >
                             {tool.name}
                           </button>
                           {tool.subcategory && ` - ${tool.subcategory}`}
                           {tool.location_name && <span className="text-gray-500"> ({tool.location_name})</span>}
                         </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">Inga redskap</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      Kompatibla redskap ({compatibleTools.length})
                    </h4>
                    {compatibleTools.length > 0 ? (
                      <ul className="space-y-1">
                        {compatibleTools.map((tool) => (
                           <li key={tool.id} className="text-sm text-gray-700">
                             •{' '}
                             <button
                               onClick={() => setSelectedTool(tool)}
                               className="text-blue-600 hover:text-blue-800 underline"
                             >
                               {tool.name}
                             </button>
                             {tool.subcategory && ` - ${tool.subcategory}`}
                             {tool.location_name && <span className="text-gray-500"> ({tool.location_name})</span>}
                           </li>
                         ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Inga kompatibla redskap
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Tool Detail Popup */}
      {selectedTool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">{selectedTool.name}</h2>
              <button
                onClick={() => setSelectedTool(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {selectedTool.manufacturer && (
                <p><span className="font-medium">Tillverkare:</span> {selectedTool.manufacturer}</p>
              )}
              {selectedTool.model_number && (
                <p><span className="font-medium">Modell:</span> {selectedTool.model_number}</p>
              )}
              {selectedTool.category && (
                <p><span className="font-medium">Kategori:</span> {selectedTool.category}</p>
              )}
              {selectedTool.subcategory && (
                <p><span className="font-medium">Underkategori:</span> {selectedTool.subcategory}</p>
              )}
              {selectedTool.status && (
                <p><span className="font-medium">Status:</span> {selectedTool.status}</p>
              )}
              {selectedTool.location_name && (
                <p><span className="font-medium">Plats:</span> {selectedTool.location_name}</p>
              )}
              {selectedTool.assigned_to_name && (
                <p><span className="font-medium">Tilldelad:</span> {selectedTool.assigned_to_name}</p>
              )}
            </div>
            <Button
              onClick={() => setSelectedTool(null)}
              className="w-full"
            >
              Stäng
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}