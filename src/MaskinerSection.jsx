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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Loader2, ChevronsUpDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileSelect from "@/components/ui/mobile-select";

const defaultMember = {
  name: '',
  email: '',
  phone: '',
  role: 'admin lokalvård',
  default_location_id: '',
  default_location_name: '',
  location_ids: [],
  location_names: [],
  is_active: true,
  send_invitation: true,
  send_new_invitation: false,
  subscribed_to_emails: true,
};

export default function TeamMemberFormModal({
  isOpen,
  onClose,
  member,
  locations,
  onSubmit,
  isLoading,
}) {
  const [formData, setFormData] = useState(defaultMember);

  useEffect(() => {
    if (member) {
      // Auto-set default location if member is responsible for any location
      const responsibleLocation = locations?.find(l => l.responsible_person_id === member.id);
      if (responsibleLocation && !member.default_location_id) {
        setFormData({ 
          ...defaultMember, 
          ...member,
          default_location_id: responsibleLocation.id,
          default_location_name: responsibleLocation.name
        });
      } else {
        setFormData({ ...defaultMember, ...member });
      }
    } else {
      setFormData(defaultMember);
    }
  }, [member, locations, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'default_location_id') {
      const location = locations?.find(l => l.id === value);
      if (location?.responsible_person_id === member?.id) {
        setFormData(prev => ({ ...prev, [field]: value, default_location_name: location?.name || '' }));
      } else {
        setFormData(prev => ({ ...prev, [field]: value, default_location_name: location?.name || '' }));
      }
    }
  };

  const handleAddLocation = (locationId) => {
    const location = locations?.find(l => l.id === locationId);
    if (!location || formData.location_ids.includes(locationId)) return;
    
    setFormData(prev => ({
      ...prev,
      location_ids: [...prev.location_ids, locationId],
      location_names: [...prev.location_names, location.name]
    }));
  };

  const handleRemoveLocation = (locationId) => {
    setFormData(prev => {
      const idx = prev.location_ids.indexOf(locationId);
      return {
        ...prev,
        location_ids: prev.location_ids.filter(id => id !== locationId),
        location_names: prev.location_names.filter((_, i) => i !== idx)
      };
    });
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData(defaultMember);
    onClose();
  };

  const isEditing = !!member?.id;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEditing ? 'Redigera teammedlem' : 'Lägg till teammedlem'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
           <div className="space-y-2">
             <Label className="text-sm sm:text-base">Fullständigt namn *</Label>
             <Input
               value={formData.name}
               onChange={(e) => handleChange('name', e.target.value)}
               placeholder="Anna Svensson"
               className="text-sm"
             />
           </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">E-post</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="anna@exempel.se"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Telefon</Label>
              <Input
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="070-123 45 67"
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roll</Label>
            <MobileSelect
              value={formData.role}
              onChange={(v) => handleChange('role', v)}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'admin lokalvård', label: 'Admin Lokalvård' },
                { value: 'lokalvårdare', label: 'Lokalvårdare' },
                { value: 'verktygsförvaltare', label: 'Verktygsförvaltare' },
                { value: 'ägare', label: 'Ägare' },
              ]}
              placeholder="Välj roll"
            />
          </div>

          {!isEditing && (
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label>Skicka inbjudan via e-post</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Skicka inbjudningslänk till användaren</p>
              </div>
              <Switch
                checked={formData.send_invitation}
                onCheckedChange={(checked) => handleChange('send_invitation', checked)}
              />
            </div>
          )}

          {isEditing && formData.email && (
            <>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Skicka ny inbjudningslänk</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Skicka uppdaterad inbjudningslänk till e-postadressen</p>
                </div>
                <Switch
                  checked={formData.send_new_invitation}
                  onCheckedChange={(checked) => handleChange('send_new_invitation', checked)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Mottar notifikationsmails</Label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Få mail om låneförfrågningar och statusuppdateringar</p>
                </div>
                <Switch
                  checked={formData.subscribed_to_emails}
                  onCheckedChange={(checked) => handleChange('subscribed_to_emails', checked)}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Standardplats</Label>
            <MobileSelect
              value={formData.default_location_id}
              onChange={(v) => handleChange('default_location_id', v)}
              options={[
                { value: '', label: 'Ingen' },
                ...(locations?.map((location) => ({ value: location.id, label: location.name })) || [])
              ]}
              placeholder="Välj standardplats"
            />
          </div>

          <div className="space-y-2">
            <Label>Platser där personen arbetar</Label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {locations?.map((location) => {
                const isSelected = formData.location_ids.includes(location.id);
                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => isSelected ? handleRemoveLocation(location.id) : handleAddLocation(location.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors text-left",
                      isSelected ? "bg-[#8B1E1E]/8 text-[#8B1E1E] font-medium" : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <span>{location.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#8B1E1E] flex-shrink-0" />}
                  </button>
                );
              })}
              {(!locations || locations.length === 0) && (
                <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">Inga platser tillgängliga</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <Label>Aktiv medlem</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inaktiva medlemmar visas inte i tilldelningar</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
           <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto text-sm">
             Avbryt
           </Button>
           <Button
             onClick={handleSubmit}
             disabled={!formData.name || isLoading}
             className="w-full sm:w-auto bg-[#8B1E1E] hover:bg-[#6B1515] text-sm"
           >
             {isLoading ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Sparar...
               </>
             ) : (
               isEditing ? 'Spara ändringar' : 'Lägg till medlem'
             )}
           </Button>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}