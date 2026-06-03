import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LocationFormModal from '@/components/modals/LocationFormModal';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus,
  MapPin,
  Building2,
  Truck,
  Warehouse,
  Briefcase,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Phone,
  User,
  Grid,
  List,
  Shovel,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const typeConfig = {
  jobsite: { icon: Building2, color: 'bg-blue-100 text-blue-700' },
  warehouse: { icon: Warehouse, color: 'bg-purple-100 text-purple-700' },
  office: { icon: Briefcase, color: 'bg-emerald-100 text-emerald-700' },
  vehicle: { icon: Truck, color: 'bg-amber-100 text-amber-700' },
  other: { icon: MapPin, color: 'bg-gray-100 text-gray-700' },
};

export default function Locations() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [editLocation, setEditLocation] = useState(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [locationToDelete, setLocationToDelete] = useState(null);

  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list('-created_date'),
  });

  const navigate = useNavigate();

  const { data: tools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list(),
  });

  const { data: handTools = [] } = useQuery({
    queryKey: ['handtools'],
    queryFn: () => base44.entities.HandTool.list(),
  });

  const filteredLocations = locations.filter(location =>
    (location.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    !location.parent_location_id // Only show main locations, not sub-locations
  );

  const getSubLocations = (locationId) => {
    return locations.filter(l => l.parent_location_id === locationId);
  };

  const getToolCount = (locationId) => {
    return tools.filter(t => t.location_id === locationId).length;
  };

  const getHandToolCount = (locationId) => {
    return handTools.filter(t => t.location_id === locationId).length;
  };

  const saveLocationMutation = useMutation({
    mutationFn: async (locationData) => {
      if (editLocation?.id) {
        return base44.entities.Location.update(editLocation.id, locationData);
      } else {
        return base44.entities.Location.create(locationData);
      }
    },
    onMutate: async (locationData) => {
      await queryClient.cancelQueries({ queryKey: ['locations'] });
      const prevLocations = queryClient.getQueryData(['locations']);
      if (editLocation?.id) {
        queryClient.setQueryData(['locations'], (old) =>
          old?.map(l => l.id === editLocation.id ? { ...l, ...locationData } : l) || []
        );
      } else {
        queryClient.setQueryData(['locations'], (old) => [...(old || []), { ...locationData, id: 'temp-' + Date.now() }]);
      }
      return { prevLocations };
    },
    onError: (err, newData, context) => {
      if (context?.prevLocations) queryClient.setQueryData(['locations'], context.prevLocations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setEditLocation(null);
      setShowAddLocation(false);
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (data) => {
      if (data.unassign) {
        await base44.functions.invoke('unassignToolsFromEntity', { entityType: 'Location', entityId: data.locationId });
      }
      return base44.entities.Location.delete(data.locationId);
    },
    onMutate: async ({ locationId }) => {
      await queryClient.cancelQueries({ queryKey: ['locations'] });
      const prevLocations = queryClient.getQueryData(['locations']);
      queryClient.setQueryData(['locations'], (old) =>
        old?.filter(l => l.id !== locationId) || []
      );
      return { prevLocations };
    },
    onError: (err, newData, context) => {
      if (context?.prevLocations) queryClient.setQueryData(['locations'], context.prevLocations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['handtools'] });
      setLocationToDelete(null);
    },
  });

  const handleSaveLocation = (locationData) => saveLocationMutation.mutate(locationData);

  const handleDeleteLocation = (location) => {
    setLocationToDelete(location);
  };

  const confirmDeleteLocation = (unassign) => {
    if (!locationToDelete) return;
    deleteLocationMutation.mutate({ locationId: locationToDelete.id, unassign });
  };

  if (loadingLocations) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1E1E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Platser</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {locations.length} {locations.length !== 1 ? 'platser' : 'plats'}
            </p>
          </div>
          <Button
            onClick={() => setShowAddLocation(true)}
            className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25"
          >
            <Plus className="w-5 h-5 mr-2" />
            Lägg till plats
          </Button>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 space-y-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Sök platser..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-gray-200 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ml-auto">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className={`h-9 w-9 rounded-none ${viewMode === 'grid' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><Grid className="w-4 h-4" /></Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className={`h-9 w-9 rounded-none ${viewMode === 'list' ? 'bg-[#8B1E1E] hover:bg-[#6B1515]' : ''}`}><List className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>

        {/* Locations */}
        {filteredLocations.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {locations.length === 0 ? 'Inga platser ännu' : 'Inga matchande platser'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {locations.length === 0 
                ? 'Lägg till din första plats för att organisera verktyg'
                : 'Prova ett annat sökord'}
            </p>
            {locations.length === 0 && (
              <Button
                onClick={() => setShowAddLocation(true)}
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till första platsen
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((location) => {
              const type = typeConfig[location.type] || typeConfig.other;
              const Icon = type.icon;
              const toolCount = getToolCount(location.id);
              const subLocations = getSubLocations(location.id);

              return (
                <div key={location.id}>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${type.color.split(' ')[0]}`}>
                          <Icon className={`w-6 h-6 ${type.color.split(' ')[1]}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          {!location.is_active && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-500">Inaktiv</Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditLocation(location); }}><Pencil className="w-4 h-4 mr-2" />Redigera</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteLocation(location); }} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Ta bort</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <h3 onClick={() => navigate(`/locations/${location.id}`)} className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1 cursor-pointer hover:text-[#8B1E1E] transition-colors">{location.name}</h3>
                      <Badge className={`${type.color} border-0 text-xs`}>{location.type?.replace('_', ' ')}</Badge>
                      {location.address && <p className="text-sm text-gray-500 mt-3 line-clamp-2">{location.address}</p>}
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Package className="w-4 h-4" /><span>Maskiner</span></div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{toolCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400"><Shovel className="w-4 h-4" /><span>Handredskap</span></div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{getHandToolCount(location.id)}</span>
                        </div>
                        {location.contacts && location.contacts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {location.contacts.map(contact => (
                              <div key={contact.id} className="text-xs">
                                {contact.is_primary && <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-1">Huvudansvarig</span>}
                                <span className="text-gray-600">{contact.name}</span>
                                {contact.phone && <span className="text-gray-500"> • {contact.phone}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {subLocations.length > 0 && (
                    <div className="mt-3 space-y-2 ml-4">
                      {subLocations.map((subLoc) => {
                        const subType = typeConfig[subLoc.type] || typeConfig.other;
                        const SubIcon = subType.icon;
                        return (
                          <div
                            key={subLoc.id}
                            onClick={() => navigate(`/locations/${subLoc.id}`)}
                            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all cursor-pointer flex items-start gap-3"
                          >
                            <div className={`p-2 rounded-lg ${subType.color.split(' ')[0]} flex-shrink-0`}>
                              <SubIcon className={`w-4 h-4 ${subType.color.split(' ')[1]}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{subLoc.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{getToolCount(subLoc.id)} maskiner</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredLocations.map((location) => {
                const type = typeConfig[location.type] || typeConfig.other;
                const Icon = type.icon;
                const toolCount = getToolCount(location.id);
                return (
                  <div key={location.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className={`p-2 rounded-lg ${type.color.split(' ')[0]}`}>
                      <Icon className={`w-5 h-5 ${type.color.split(' ')[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/locations/${location.id}`)}>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100 hover:text-[#8B1E1E] transition-colors">{location.name}</p>
                        {!location.is_active && <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">Inaktiv</Badge>}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{location.address || location.type}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                      {location.contact_person && <span className="hidden sm:block">{location.contact_person}</span>}
                      <span className="flex items-center gap-1"><Package className="w-4 h-4" />{toolCount}</span>
                      <span className="flex items-center gap-1"><Shovel className="w-4 h-4" />{getHandToolCount(location.id)}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditLocation(location); }}><Pencil className="w-4 h-4 mr-2" />Redigera</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteLocation(location); }} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Ta bort</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <LocationFormModal
        isOpen={showAddLocation || !!editLocation}
        onClose={() => {
          setShowAddLocation(false);
          setEditLocation(null);
        }}
        location={editLocation}
        onSubmit={handleSaveLocation}
        isLoading={saveLocationMutation.isPending}
      />
      <DeleteConfirmationModal
        isOpen={!!locationToDelete}
        onClose={() => setLocationToDelete(null)}
        title={`Ta bort ${locationToDelete?.name}?`}
        description={
          locationToDelete && (getToolCount(locationToDelete.id) + getHandToolCount(locationToDelete.id)) > 0
            ? `Platsen har ${getToolCount(locationToDelete.id) + getHandToolCount(locationToDelete.id)} verktyg/handredskap kopplade. Vad vill du göra med dessa?`
            : `Är du säker på att du vill ta bort ${locationToDelete?.name}? Åtgärden kan inte ångras.`
        }
        hasTools={locationToDelete ? (getToolCount(locationToDelete.id) + getHandToolCount(locationToDelete.id)) > 0 : false}
        onUnassignAndDelete={() => confirmDeleteLocation(true)}
        onDeleteOnly={() => confirmDeleteLocation(false)}
        onConfirmNoTools={() => confirmDeleteLocation(false)}
      />
    </div>
  );
}