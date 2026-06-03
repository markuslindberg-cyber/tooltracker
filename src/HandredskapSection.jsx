import React, { useState, useEffect } from 'react'; // v2
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronsUpDown, Check, X } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const defaultLocation = {
  name: '',
  type: 'jobsite',
  address: '',
  team_member_ids: [],
  team_member_names: [],
  parent_location_id: '',
  parent_location_name: '',
  is_active: true,
  notes: '',
};

export default function LocationFormModal({
  isOpen,
  onClose,
  location,
  onSubmit,
  isLoading,
}) {
  const [formData, setFormData] = useState(defaultLocation);

  const { data: allLocations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
    enabled: isOpen,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (location) {
      setFormData({ ...defaultLocation, ...location });
    } else {
      setFormData(defaultLocation);
    }
  }, [location, isOpen]);

  const handleChange = (field, value) => {
    if (field === 'parent_location_id') {
      const parentLoc = allLocations.find(l => l.id === value);
      const primaryContact = parentLoc?.contacts?.find(c => c.is_primary);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        parent_location_name: parentLoc?.name || '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleAddTeamMember = (teamMemberId) => {
    const member = teamMembers.find(m => m.id === teamMemberId);
    if (!member || formData.team_member_ids.includes(teamMemberId)) return;
    
    setFormData(prev => ({
      ...prev,
      team_member_ids: [...prev.team_member_ids, teamMemberId],
      team_member_names: [...prev.team_member_names, member.name]
    }));
  };

  const handleRemoveTeamMember = (teamMemberId) => {
    setFormData(prev => {
      const idx = prev.team_member_ids.indexOf(teamMemberId);
      return {
        ...prev,
        team_member_ids: prev.team_member_ids.filter(id => id !== teamMemberId),
        team_member_names: prev.team_member_names.filter((_, i) => i !== idx)
      };
    });
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData(defaultLocation);
    onClose();
  };

  const isEditing = !!location?.id;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Redigera plats' : 'Lägg till ny plats'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Platsnamn *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="t.ex. Huvudlager"
            />
          </div>

          <div className="space-y-2">
            <Label>Typ *</Label>
            <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jobsite">Arbetsplats</SelectItem>
                <SelectItem value="warehouse">Lager</SelectItem>
                <SelectItem value="office">Kontor</SelectItem>
                <SelectItem value="vehicle">Fordon</SelectItem>
                <SelectItem value="other">Övrigt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Huvudplats (för fordon/satelliter)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {formData.parent_location_name || "Ingen huvudplats"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Sök plats..." />
                  <CommandEmpty>Ingen plats hittades.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    <CommandItem
                      value="none"
                      onSelect={() => handleChange('parent_location_id', '')}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !formData.parent_location_id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Ingen huvudplats
                    </CommandItem>
                    {allLocations.filter(l => l.id !== location?.id).map((loc) => (
                      <CommandItem
                        key={loc.id}
                        value={loc.name}
                        onSelect={() => handleChange('parent_location_id', loc.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.parent_location_id === loc.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {loc.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Adress</Label>
            <Textarea
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Ange fullständig adress"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Ansvarig (för lånegodkännanden)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {formData.team_member_ids[0]
                    ? teamMembers.find(m => m.id === formData.team_member_ids[0])?.name || 'Okänd'
                    : 'Välj ansvarig...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Sök person..." />
                  <CommandEmpty>Ingen person hittades.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    <CommandItem value="none" onSelect={() => setFormData(prev => ({ ...prev, team_member_ids: prev.team_member_ids.slice(1), team_member_names: prev.team_member_names.slice(1) }))}>
                      <Check className={cn("mr-2 h-4 w-4", !formData.team_member_ids[0] ? "opacity-100" : "opacity-0")} />
                      Ingen ansvarig
                    </CommandItem>
                    {teamMembers.map((member) => (
                      <CommandItem
                        key={member.id}
                        value={member.name}
                        onSelect={() => {
                          setFormData(prev => {
                            const rest = prev.team_member_ids.filter((id, i) => i !== 0);
                            const restNames = prev.team_member_names.filter((_, i) => i !== 0);
                            return {
                              ...prev,
                              team_member_ids: [member.id, ...rest.filter(id => id !== member.id)],
                              team_member_names: [member.name, ...restNames.filter((_, i) => rest[i] !== member.id)]
                            };
                          });
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", formData.team_member_ids[0] === member.id ? "opacity-100" : "opacity-0")} />
                        {member.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Arbetande på denna plats</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.team_member_ids.map((id) => {
                const member = teamMembers.find(m => m.id === id);
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {member?.name || 'Okänd'}
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamMember(id)}
                      className="hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  Lägg till personlig...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Sök personlig..." />
                  <CommandEmpty>Ingen personlig hittades.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {teamMembers.map((member) => (
                      <CommandItem
                        key={member.id}
                        value={member.name}
                        onSelect={() => handleAddTeamMember(member.id)}
                        disabled={formData.team_member_ids.includes(member.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.team_member_ids.includes(member.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {member.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Anteckningar</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Lägg till anteckningar..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label>Aktiv plats</Label>
              <p className="text-sm text-gray-500">Inaktiva platser visas inte i förflyttningar</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
          </div>
        </div>

        <DialogFooter className="gap-3 flex-col-reverse sm:flex-row">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.type || isLoading}
            className="bg-[#8B1E1E] hover:bg-[#6B1515] w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              isEditing ? 'Spara ändringar' : 'Lägg till plats'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}