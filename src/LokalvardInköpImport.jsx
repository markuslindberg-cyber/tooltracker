import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ToolFormModal from '@/components/modals/ToolFormModal';
import HandToolEditModal from '@/components/modals/HandToolEditModal';
import LocationFormModal from '@/components/modals/LocationFormModal';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Package,
  Shovel,
  MapPin,
  Building2,
  Truck,
  Warehouse,
  Briefcase,
  Loader2,
  User,
  Phone,
  Pencil,
} from 'lucide-react';

const typeConfig = {
  jobsite: { icon: Building2, color: 'bg-blue-100 text-blue-700' },
  warehouse: { icon: Warehouse, color: 'bg-purple-100 text-purple-700' },
  office: { icon: Briefcase, color: 'bg-emerald-100 text-emerald-700' },
  vehicle: { icon: Truck, color: 'bg-amber-100 text-amber-700' },
  other: { icon: MapPin, color: 'bg-gray-100 text-gray-700' },
};

const statusColors = {
  available: 'bg-green-100 text-green-700',
  in_use: 'bg-blue-100 text-blue-700',
  i_lager: 'bg-green-100 text-green-700',
  i_bruk: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  missing: 'bg-red-100 text-red-700',
  saknas: 'bg-red-100 text-red-700',
  retired: 'bg-gray-100 text-gray-500',
  kasserad: 'bg-gray-100 text-gray-500',
};

export default function LocationDetails() {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editTool, setEditTool] = useState(null);
  const [editHandTool, setEditHandTool] = useState(null);
  const [editLocation, setEditLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: location, isLoading: loadingLocation } = useQuery({
    queryKey: ['location', locationId],
    queryFn: async () => {
      const all = await base44.entities.Location.list();
      return all.find(l => l.id === locationId) || null;
    },
  });

  const { data: tools = [], isLoading: loadingTools } = useQuery({
    queryKey: ['tools-for-location', locationId],
    queryFn: async () => {
      const all = await base44.entities.Tool.list();
      return all.filter(t => t.location_id === locationId);
    },
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const updateLocationMutation = useMutation({
    mutationFn: (data) => base44.entities.Location.update(locationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['location', locationId]);
      queryClient.invalidateQueries(['locations']);
      setEditLocation(null);
    },
  });

  const handleSaveLocation = async (locationData) => {
    setIsSaving(true);
    try {
      await updateLocationMutation.mutateAsync(locationData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTool = async (toolData) => {
    if (editTool?.id) {
      await base44.entities.Tool.update(editTool.id, toolData);
    }
    queryClient.invalidateQueries(['tools-for-location', locationId]);
    queryClient.invalidateQueries(['tools']);
    setEditTool(null);
  };

  const handleHandToolSuccess = () => {
    queryClient.invalidateQueries(['handtools-for-location', locationId]);
    setEditHandTool(null);
  };

  const { data: handTools = [], isLoading: loadingHandTools } = useQuery({
    queryKey: ['handtools-for-location', locationId],
    queryFn: async () => {
      const all = await base44.entities.HandTool.list();
      return all.filter(t => t.location_id === locationId);
    },
  });

  if (loadingLocation) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1E1E] animate-spin" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Platsen hittades inte.</p>
          <Button onClick={() => navigate('/Locations')}>Tillbaka till platser</Button>
        </div>
      </div>
    );
  }

  const type = typeConfig[location.type] || typeConfig.other;
  const Icon = type.icon;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
         {/* Header */}
         <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/Locations')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className={`p-3 rounded-xl ${type.color.split(' ')[0]}`}>
              <Icon className={`w-6 h-6 ${type.color.split(' ')[1]}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{location.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${type.color} border-0 text-xs`}>{location.type?.replace('_', ' ')}</Badge>
                {!location.is_active && <Badge variant="secondary" className="text-xs">Inaktiv</Badge>}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditLocation(location)}
            className="gap-2"
          >
            <Pencil className="w-4 h-4" />
            Redigera
          </Button>
        </div>

         {/* Info card */}
         {(location.address || location.team_member_names?.length > 0) && (
           <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
             {location.address && (
               <div className="flex items-start gap-2 text-sm text-gray-600">
                 <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                 <span>{location.address}</span>
               </div>
             )}
             {location.team_member_names && location.team_member_names.length > 0 && (
               <div className="flex items-start gap-2">
                 <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                 <div className="flex flex-wrap gap-2">
                   {location.team_member_names.map((name, idx) => (
                     <Badge key={idx} variant="secondary" className="text-xs">
                       {name}
                     </Badge>
                   ))}
                 </div>
               </div>
             )}
           </div>
         )}

        {/* Tabs */}
        <Tabs defaultValue="tools">
          <TabsList className="bg-white border border-gray-100 shadow-sm">
            <TabsTrigger value="tools" className="gap-2">
              <Package className="w-4 h-4" />
              Maskiner ({tools.length})
            </TabsTrigger>
            <TabsTrigger value="handtools" className="gap-2">
              <Shovel className="w-4 h-4" />
              Handredskap ({handTools.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="mt-4">
            {loadingTools ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : tools.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">Inga maskiner på denna plats.</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {tools.map(tool => (
                    <div key={tool.id} className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setEditTool(tool)}>
                      {tool.image_url ? (
                        <img src={tool.image_url} alt={tool.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{tool.name}</p>
                        <p className="text-sm text-gray-500 truncate">{tool.manufacturer} {tool.model_number}</p>
                      </div>
                      {tool.status && (
                        <Badge className={`${statusColors[tool.status] || 'bg-gray-100 text-gray-600'} border-0 text-xs`}>
                          {tool.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="handtools" className="mt-4">
            {loadingHandTools ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : handTools.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">Inga handredskap på denna plats.</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {handTools.map(tool => (
                    <div key={tool.id} className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setEditHandTool(tool)}>
                      {tool.image_url ? (
                        <img src={tool.image_url} alt={tool.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Shovel className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{tool.name}</p>
                        <p className="text-sm text-gray-500 truncate">{tool.category} {tool.subcategory ? `– ${tool.subcategory}` : ''}</p>
                      </div>
                      {tool.status && (
                        <Badge className={`${statusColors[tool.status] || 'bg-gray-100 text-gray-600'} border-0 text-xs`}>
                          {tool.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ToolFormModal
        isOpen={!!editTool}
        onClose={() => setEditTool(null)}
        tool={editTool}
        locations={allLocations}
        teamMembers={teamMembers}
        onSubmit={handleSaveTool}
      />

      <HandToolEditModal
        isOpen={!!editHandTool}
        onClose={() => setEditHandTool(null)}
        tool={editHandTool}
        locations={allLocations}
        onSuccess={handleHandToolSuccess}
      />

      <LocationFormModal
        isOpen={!!editLocation}
        onClose={() => setEditLocation(null)}
        location={editLocation}
        onSubmit={handleSaveLocation}
        isLoading={isSaving}
      />
    </div>
  );
}