import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Calendar, Barcode, Camera } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBarcodeCamera } from '@/hooks/useBarcodeCamera';

export default function LoanRequestModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTools, setSelectedTools] = useState([]);
  const [defaultReturnDate, setDefaultReturnDate] = useState('');
  const [assignedTo, setAssignedTo] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [comment, setComment] = useState('');
  const [useIndividualDates, setUseIndividualDates] = useState(false);
  const [individualDates, setIndividualDates] = useState({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [itemType, setItemType] = useState('tools');
  const [itemQuantities, setItemQuantities] = useState({});
  const [cameraActive, setCameraActive] = useState(false);
  const [assignedToOpen, setAssignedToOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [approverOpen, setApproverOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState(null);

  const { data: tools } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list(),
    initialData: []
  });

  const { data: handTools } = useQuery({
    queryKey: ['handTools'],
    queryFn: () => base44.entities.HandTool.list(),
    initialData: []
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
    initialData: []
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
    initialData: []
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const availableItems = itemType === 'tools' ? tools : handTools;

  useBarcodeCamera("loan-barcode-scanner", cameraActive && scanMode, (barcode) => {
    const trimmedBarcode = barcode.trim();
    setBarcodeInput(trimmedBarcode);
    const scannedItem = availableItems.find(t => t.barcode?.trim() === trimmedBarcode);
    if (scannedItem) {
      handleAddTool(scannedItem);
      setBarcodeInput('');
      setCameraActive(false);
    } else {
      setCameraActive(false);
    }
  });

  const createLoanMutation = useMutation({
    mutationFn: async () => {
      const toolDetails = selectedTools.map(tool => ({
        tool_id: tool.id,
        tool_name: tool.name,
        location_id: tool.location_id,
        location_name: tool.location_name,
        return_date: useIndividualDates && individualDates[tool.id] ? individualDates[tool.id] : defaultReturnDate
      }));

      // Approver = manually selected by user
      const approverEmail = selectedApprover?.email || null;

      // Get destination location manager
      const destLocManager = destinationLocation?.team_member_ids?.[0] ? 
        teamMembers.find(tm => tm.id === destinationLocation.team_member_ids[0]) : null;

      return base44.functions.invoke('createLoanRequest', {
        tool_ids: selectedTools.map(t => t.id),
        tool_names: selectedTools.map(t => t.name),
        tool_details: toolDetails.map(td => ({
          ...td,
          quantity: itemType === 'handtools' ? (itemQuantities[td.tool_id] || 1) : 1
        })),
        assigned_to_email: assignedTo.email,
        assigned_to_name: assignedTo.full_name,
        destination_location_id: destinationLocation.id,
        destination_location_name: destinationLocation.name,
        default_return_date: defaultReturnDate,
        requester_comment: comment,
        approver_email: approverEmail,
        approver_name: selectedApprover?.name || '',
        destination_location_manager_email: destLocManager?.email,
        destination_location_manager_name: destLocManager?.name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setSelectedTools([]);
      setDefaultReturnDate('');
      setAssignedTo(null);
      setDestinationLocation(null);
      setComment('');
      setUseIndividualDates(false);
      setIndividualDates({});
      setItemType('tools');
      setItemQuantities({});
      onClose();
      navigate('/Transfers');
    }
  });

  const handleAddTool = (tool) => {
    if (!selectedTools.find(t => t.id === tool.id)) {
      setSelectedTools([...selectedTools, tool]);
      // För handredskap, initiera antal till 1
      if (itemType === 'handtools') {
        setItemQuantities(prev => ({ ...prev, [tool.id]: 1 }));
      }
    }
    setSearchOpen(false);
  };

  const handleRemoveTool = (toolId) => {
    setSelectedTools(selectedTools.filter(t => t.id !== toolId));
    const newIndividualDates = { ...individualDates };
    delete newIndividualDates[toolId];
    setIndividualDates(newIndividualDates);
    const newQuantities = { ...itemQuantities };
    delete newQuantities[toolId];
    setItemQuantities(newQuantities);
  };

  const handleBarcodeScan = (e) => {
    e.preventDefault();
    const trimmedBarcode = barcodeInput.trim();
    const scannedItem = availableItems.find(t => t.barcode?.trim() === trimmedBarcode);
    if (scannedItem) {
      handleAddTool(scannedItem);
      setBarcodeInput('');
    } else {
      alert(`Inget verktyg/redskap hittad med streckkod: ${trimmedBarcode}`);
    }
  };

  const handleSubmit = () => {
    if (!selectedTools.length || !defaultReturnDate || !assignedTo || !destinationLocation || !selectedApprover) {
      alert('Vänligen fyll i alla obligatoriska fält (inkl. godkännare)');
      return;
    }
    createLoanMutation.mutate();
  };

  // Auto-set approver based on source location of first selected tool
  useEffect(() => {
    if (selectedTools.length > 0 && locations.length > 0 && teamMembers.length > 0) {
      const sourceLoc = locations.find(l => l.id === selectedTools[0].location_id);
      if (sourceLoc?.team_member_ids?.length > 0) {
        // Find the first team member with an email
        const manager = sourceLoc.team_member_ids
          .map(id => teamMembers.find(tm => tm.id === id))
          .find(tm => tm?.email);
        if (manager) setSelectedApprover(manager);
      }
    }
  }, [selectedTools, locations, teamMembers]);

  useEffect(() => {
    if (!isOpen) {
      setCameraActive(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Skicka förfrågan om lån</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Type Selection */}
          <Tabs value={itemType} onValueChange={setItemType} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tools">Maskiner</TabsTrigger>
              <TabsTrigger value="handtools">Handredskap</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Tool Selection */}
          <div>
            <Label className="block mb-2">{itemType === 'tools' ? 'Maskiner' : 'Handredskap'} *</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                   <PopoverTrigger asChild>
                     <Button variant="outline" className="flex-1 justify-start">
                       <Plus className="w-4 h-4 mr-2" />
                       Lägg till {itemType === 'tools' ? 'maskin' : 'handredskap'}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-full p-0">
                     <Command>
                       <CommandInput placeholder={`Sök ${itemType === 'tools' ? 'maskin' : 'handredskap'}...`} />
                       <CommandList>
                         <CommandEmpty>Ingen {itemType === 'tools' ? 'maskin' : 'handredskap'} hittad</CommandEmpty>
                         <CommandGroup>
                           {availableItems.map(item => (
                             <CommandItem key={item.id} onSelect={() => handleAddTool(item)}>
                               <div className="flex-1">
                                 <div className="font-medium">{item.name}</div>
                                 <div className="text-xs text-gray-500">{item.location_name}</div>
                               </div>
                             </CommandItem>
                           ))}
                         </CommandGroup>
                       </CommandList>
                     </Command>
                   </PopoverContent>
                 </Popover>
                <Button 
                  variant={scanMode ? "default" : "outline"} 
                  size="icon"
                  onClick={() => setScanMode(!scanMode)}
                  title="Skanna streckkod"
                >
                  <Barcode className="w-4 h-4" />
                </Button>
              </div>

              {scanMode && (
                <div className="space-y-2">
                  {!cameraActive ? (
                    <>
                      <form onSubmit={handleBarcodeScan} className="space-y-2">
                        <Input
                          placeholder="Skanna streckkod här..."
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          autoFocus
                        />
                        <p className="text-xs text-gray-500">Streckkoden läses in automatiskt när du skannar</p>
                      </form>
                      <Button onClick={() => setCameraActive(true)} variant="outline" className="w-full">
                        <Camera className="w-4 h-4 mr-2" />Öppna kamera
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div id="loan-barcode-scanner" className="rounded-xl overflow-hidden" style={{ minHeight: '300px', backgroundColor: '#000' }} />
                      <Button onClick={() => setCameraActive(false)} variant="outline" className="w-full">
                        Stäng kamera
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {selectedTools.map(tool => (
                <div key={tool.id} className={`flex items-center gap-2 p-2 rounded border ${itemType === 'handtools' ? 'bg-gray-50' : 'bg-blue-50'}`}>
                  <div className="flex-1">
                    <Badge variant="secondary">{tool.name}</Badge>
                  </div>
                  {itemType === 'handtools' && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-600">Antal:</Label>
                      <Input
                        type="number"
                        min="1"
                        value={itemQuantities[tool.id] || 1}
                        onChange={(e) => setItemQuantities(prev => ({ ...prev, [tool.id]: parseInt(e.target.value) || 1 }))}
                        className="w-16 text-sm"
                      />
                    </div>
                  )}
                  <button onClick={() => handleRemoveTool(tool.id)} className="text-red-500 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <Label className="block mb-2">Vem ska låna *</Label>
            <Popover open={assignedToOpen} onOpenChange={setAssignedToOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {assignedTo ? assignedTo.name : 'Välj person'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Sök person..." />
                  <CommandList>
                    <CommandEmpty>Ingen person hittad</CommandEmpty>
                    <CommandGroup>
                      {teamMembers.map(member => (
                        <CommandItem key={member.id} onSelect={() => { setAssignedTo(member); setAssignedToOpen(false); }}>
                          {member.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Approver – auto-set from source location, can be changed manually */}
          <div>
            <Label className="block mb-2">Godkännare (ansvarig för källplatsen) *</Label>
            {selectedTools.length === 0 ? (
              <p className="text-sm text-gray-400 italic border border-dashed border-gray-200 rounded-md px-3 py-2">
                Välj maskiner ovan — godkännare sätts automatiskt
              </p>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex-1">
                    {selectedApprover ? (
                      <>
                        <p className="text-sm font-medium text-green-800">{selectedApprover.name}</p>
                        <p className="text-xs text-green-600">{selectedApprover.email}</p>
                      </>
                    ) : (
                      <p className="text-sm text-amber-700">Ingen ansvarig hittad för källplatsen — välj manuellt</p>
                    )}
                  </div>
                  <Popover open={approverOpen} onOpenChange={setApproverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-gray-700">
                        Ändra
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0">
                      <Command>
                        <CommandInput placeholder="Sök person..." />
                        <CommandList>
                          <CommandEmpty>Ingen person hittad</CommandEmpty>
                          <CommandGroup>
                            {teamMembers.filter(m => m.email).map(member => (
                              <CommandItem key={member.id} onSelect={() => { setSelectedApprover(member); setApproverOpen(false); }}>
                                <div>
                                  <div className="font-medium">{member.name}</div>
                                  <div className="text-xs text-gray-500">{member.email}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* Destination Location */}
          <div>
            <Label className="block mb-2">Destination (plats där maskinen lånas till) *</Label>
            <Popover open={destinationOpen} onOpenChange={setDestinationOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  {destinationLocation ? destinationLocation.name : 'Välj plats'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Sök plats..." />
                  <CommandList>
                    <CommandEmpty>Ingen plats hittad</CommandEmpty>
                    <CommandGroup>
                      {locations.map(loc => (
                        <CommandItem key={loc.id} onSelect={() => { setDestinationLocation(loc); setDestinationOpen(false); }}>
                          {loc.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Return Date Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Använd samma återlämningsdatum för alla</Label>
              <Switch checked={!useIndividualDates} onCheckedChange={(v) => setUseIndividualDates(!v)} />
            </div>

            {!useIndividualDates && (
              <div>
                <Label className="block mb-2">Återlämningsdatum *</Label>
                <Calendar className="w-4 h-4 inline text-gray-400 mr-2" />
                <Input
                  type="date"
                  value={defaultReturnDate}
                  onChange={(e) => setDefaultReturnDate(e.target.value)}
                  required
                />
              </div>
            )}

            {useIndividualDates && selectedTools.length > 0 && (
               <div className="space-y-3 border rounded-lg p-4">
                 <p className="text-sm font-medium">Individuella återlämningsdatum per {itemType === 'tools' ? 'maskin' : 'handredskap'}:</p>
                {selectedTools.map(tool => (
                  <div key={tool.id}>
                    <Label className="text-sm">{tool.name}</Label>
                    <Input
                      type="date"
                      value={individualDates[tool.id] || ''}
                      onChange={(e) => setIndividualDates({ ...individualDates, [tool.id]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment */}
          <div>
            <Label className="block mb-2">Kommentar/Anteckning</Label>
            <Textarea
              placeholder="Lägg till eventuell anteckning..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={createLoanMutation.isPending}>
            {createLoanMutation.isPending ? 'Skickar...' : 'Skicka förfrågan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}