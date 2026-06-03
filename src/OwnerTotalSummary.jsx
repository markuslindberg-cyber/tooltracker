import React from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, X, Wrench, Check, ChevronsUpDown } from "lucide-react";
import MobileSelect from "@/components/ui/mobile-select";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ServiceHistoryPanel from '@/components/ServiceHistoryPanel';
import ServiceRecordModal from '@/components/modals/ServiceRecordModal';
import ToolLogTab from '@/components/ToolLogTab';
import { useMemo, useState, useEffect } from 'react';

const defaultTool = {
name: '',
manufacturer: '',
model_number: '',
serial_number: '',
tool_number: '',
category: 'power_tools',
subcategory: '',
status: 'available',
condition: 'good',
purchase_date: '',
purchase_price: '',
purchase_location: '',
invoice_number: '',
location_id: '',
location_name: '',
assigned_to_email: '',
assigned_to_name: '',
notes: '',
barcode: '',
image_url: '',
suggested_image_url: '',
main_machine_id: '',
main_machine_name: '',
compatible_with_main_machine_ids: [],
compatible_with_main_machine_names: [],
};

export default function ToolFormModal({
  isOpen,
  onClose,
  tool,
  locations,
  teamMembers,
  onSubmit,
  isLoading,
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(defaultTool);
  const [uploading, setUploading] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [templateToolId, setTemplateToolId] = useState('');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [searchingImage, setSearchingImage] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);
  const [customSubcategory, setCustomSubcategory] = useState('');

  const { data: allTools = [] } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 500),
    enabled: isOpen,
  });

  const { data: huvudmaskiner = [] } = useQuery({
    queryKey: ['huvudmaskiner'],
    queryFn: () => base44.entities.Huvudmaskin.list(),
    enabled: isOpen,
  });

  const availableCategories = useMemo(() => {
    const categories = [...new Set(allTools.map(t => t.category).filter(Boolean))];
    // Remove old categories and ensure required ones exist
    const filtered = categories.filter(cat => !['0', 'ah', 'safety', 'Power_tools', 'Hand_tools'].includes(cat));
    if (!filtered.includes('Redskap')) {
      filtered.push('Redskap');
    }
    if (!filtered.includes('Övrigt')) {
      filtered.push('Övrigt');
    }
    return filtered.sort();
  }, [allTools]);

  const availableSubcategories = useMemo(() => {
    if (!formData.category) return [];
    const categoryToUse = formData.category === 'Redskap' ? 'power_tools' : formData.category;
    return [...new Set(
      allTools.filter(t => t.category === categoryToUse).map(t => t.subcategory).filter(Boolean)
    )].sort();
  }, [allTools, formData.category]);

  const { data: serviceRecords = [] } = useQuery({
    queryKey: ['serviceRecords', tool?.id],
    queryFn: () => tool?.id ? base44.entities.ServiceRecord.filter({ tool_id: tool.id }, '-service_date') : Promise.resolve([]),
    enabled: !!tool?.id && isOpen,
  });

  const createServiceRecordMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['serviceRecords']);
      setShowServiceModal(false);
    },
  });

  useEffect(() => {
    if (tool) {
      setFormData({ ...defaultTool, ...tool });
    } else {
      setFormData(defaultTool);
      setTemplateToolId('');
    }
  }, [tool, isOpen]);

  const handleTemplateSelect = (toolId) => {
    setTemplateToolId(toolId);
    setTemplateOpen(false);
    if (toolId) {
      const templateTool = allTools.find(t => t.id === toolId);
      if (templateTool) {
        setFormData({
          ...defaultTool,
          category: templateTool.category,
          subcategory: templateTool.subcategory,
          condition: templateTool.condition,
          location_id: templateTool.location_id,
          location_name: templateTool.location_name,
        });
      }
    } else {
      setFormData(defaultTool);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-fill location/person names
    if (field === 'location_id') {
      const location = locations?.find(l => l.id === value);
      setFormData(prev => ({ ...prev, [field]: value, location_name: location?.name || '' }));
    }
    if (field === 'assigned_to_email') {
      const member = teamMembers?.find(m => m.email === value);
      setFormData(prev => ({ ...prev, [field]: value || '', assigned_to_name: member?.name || '' }));
    }
    // Reset subcategory when category changes
    if (field === 'category') {
      setFormData(prev => ({ ...prev, [field]: value, subcategory: '' }));
    }
    // Auto-fill parent tool name when parent_tool_id changes
    if (field === 'parent_tool_id') {
      const parentTool = allTools.find(t => t.id === value);
      setFormData(prev => ({ ...prev, [field]: value, parent_tool_name: parentTool?.name || '' }));
    }
    // Auto-fill main machine name when main_machine_id changes
    if (field === 'main_machine_id') {
      const maskin = huvudmaskiner.find(m => m.id === value);
      setFormData(prev => ({ ...prev, [field]: value, main_machine_name: maskin?.name || '' }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSearchImage = async () => {
    setSearchingImage(true);
    try {
      const response = await base44.functions.invoke('findToolImage', { tool_id: tool?.id });
      if (response.data?.image_url) {
        setFormData(prev => ({ ...prev, suggested_image_url: response.data.image_url }));
      }
      queryClient.invalidateQueries(['tools']);
    } catch (error) {
      console.error('Image search failed:', error);
    } finally {
      setSearchingImage(false);
    }
  };

  const handleApproveImage = async () => {
    if (formData.suggested_image_url) {
      setFormData(prev => ({
        ...prev,
        image_url: prev.suggested_image_url,
        suggested_image_url: ''
      }));

      // Ask if user wants to update all tools with same model
      if (formData.manufacturer && formData.model_number) {
        const shouldUpdateAll = window.confirm(
          `Vill du uppdatera alla maskiner av typ "${formData.manufacturer} ${formData.model_number}" med denna bild?`
        );

        if (shouldUpdateAll) {
          try {
            const matchingTools = allTools.filter(
              t => t.manufacturer === formData.manufacturer &&
                   t.model_number === formData.model_number &&
                   t.id !== tool?.id
            );

            // Update all matching tools in bulk
            await Promise.all(
              matchingTools.map(t =>
                base44.entities.Tool.update(t.id, { image_url: formData.suggested_image_url })
              )
            );

            queryClient.invalidateQueries(['tools']);
          } catch (error) {
            console.error('Bulk update failed:', error);
          }
        }
      }
    }
  };

  const handleRejectImage = async () => {
    setFormData(prev => ({
      ...prev,
      suggested_image_url: ''
    }));
    // Search for next image automatically
    setSearchingImage(true);
    try {
      await base44.functions.invoke('findToolImage', { tool_id: tool?.id });
      queryClient.invalidateQueries(['tools']);
    } catch (error) {
      console.error('Image search failed:', error);
    } finally {
      setSearchingImage(false);
    }
  };

  const handleSubmit = async () => {
    const data = {
      ...formData,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
    };
    onSubmit(data);

    // After saving, check if model number changed and ask about updating matching tools
    if (isEditing && tool?.id && formData.model_number !== tool.model_number && formData.manufacturer && tool.model_number) {
      const matchingTools = allTools.filter(
        t => t.manufacturer === formData.manufacturer &&
             t.model_number === tool.model_number &&
             t.id !== tool.id
      );

      if (matchingTools.length > 0) {
        const shouldUpdateAll = window.confirm(
          `Hittade ${matchingTools.length} andra maskiner av typ "${formData.manufacturer} ${tool.model_number}". Vill du uppdatera deras modellnummer till "${formData.model_number}"?`
        );

        if (shouldUpdateAll) {
          try {
            await Promise.all(
              matchingTools.map(t =>
                base44.entities.Tool.update(t.id, { model_number: formData.model_number })
              )
            );
            queryClient.invalidateQueries(['tools']);
          } catch (error) {
            console.error('Bulk update failed:', error);
          }
        }
      }
    }

    // Check if image changed and ask about updating matching tools
    if (isEditing && tool?.id && formData.image_url && formData.image_url !== tool.image_url && formData.manufacturer && formData.model_number) {
      const shouldUpdateAll = window.confirm(
        `Vill du uppdatera bilden på alla andra maskiner av typ "${formData.manufacturer} ${formData.model_number}"?`
      );

      if (shouldUpdateAll) {
        try {
          const matchingTools = allTools.filter(
            t => t.manufacturer === formData.manufacturer &&
                 t.model_number === formData.model_number &&
                 t.id !== tool.id &&
                 !t.image_url
          );

          if (matchingTools.length > 0) {
            await Promise.all(
              matchingTools.map(t =>
                base44.entities.Tool.update(t.id, { image_url: formData.image_url })
              )
            );

            queryClient.invalidateQueries(['tools']);
          }
        } catch (error) {
          console.error('Bulk update failed:', error);
        }
      }
    }

    // Check if category changed and ask about updating matching tools
    if (isEditing && tool?.id && formData.category !== tool.category && formData.manufacturer && formData.model_number) {
      const matchingTools = allTools.filter(
        t => t.manufacturer === formData.manufacturer &&
             t.model_number === formData.model_number &&
             t.id !== tool.id
      );

      if (matchingTools.length > 0) {
        const shouldUpdateAll = window.confirm(
          `Vill du uppdatera kategorin på ${matchingTools.length} andra maskiner av typ "${formData.manufacturer} ${formData.model_number}" till "${formData.category}"?`
        );

        if (shouldUpdateAll) {
          try {
            await Promise.all(
              matchingTools.map(t =>
                base44.entities.Tool.update(t.id, { category: formData.category })
              )
            );
            queryClient.invalidateQueries(['tools']);
          } catch (error) {
            console.error('Bulk update failed:', error);
          }
        }
      }
    }

    // Check if name changed and ask about updating matching tools
    if (isEditing && tool?.id && formData.name !== tool.name && formData.manufacturer && formData.model_number) {
      const matchingTools = allTools.filter(
        t => t.manufacturer === formData.manufacturer &&
             t.model_number === formData.model_number &&
             t.id !== tool.id
      );

      if (matchingTools.length > 0) {
        const shouldUpdateAll = window.confirm(
          `Vill du uppdatera namnet på ${matchingTools.length} andra maskiner av typ "${formData.manufacturer} ${formData.model_number}" till "${formData.name}"?`
        );

        if (shouldUpdateAll) {
          try {
            await Promise.all(
              matchingTools.map(t =>
                base44.entities.Tool.update(t.id, { name: formData.name })
              )
            );
            queryClient.invalidateQueries(['tools']);
          } catch (error) {
            console.error('Bulk update failed:', error);
          }
        }
      }
    }

    // Check if subcategory changed and ask about updating matching tools
    if (isEditing && tool?.id && formData.subcategory !== tool.subcategory && formData.manufacturer && formData.model_number) {
      const matchingTools = allTools.filter(
        t => t.manufacturer === formData.manufacturer &&
             t.model_number === formData.model_number &&
             t.id !== tool.id
      );

      if (matchingTools.length > 0) {
        const shouldUpdateAll = window.confirm(
          `Vill du uppdatera underkategorin på ${matchingTools.length} andra maskiner av typ "${formData.manufacturer} ${formData.model_number}" till "${formData.subcategory}"?`
        );

        if (shouldUpdateAll) {
          try {
            await Promise.all(
              matchingTools.map(t =>
                base44.entities.Tool.update(t.id, { subcategory: formData.subcategory })
              )
            );
            queryClient.invalidateQueries(['tools']);
          } catch (error) {
            console.error('Bulk update failed:', error);
          }
        }
      }
    }
  };

  const handleClose = () => {
    setFormData(defaultTool);
    setTemplateToolId('');
    onClose();
  };

  const isEditing = !!tool?.id;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[calc(100vw-16px)] sm:w-auto sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isEditing ? 'Redigera verktyg' : 'Lägg till nytt verktyg'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Verktygsdetaljer</TabsTrigger>
              {isEditing && <TabsTrigger value="service">Servicehistorik</TabsTrigger>}
              {isEditing && <TabsTrigger value="log">Logg</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="space-y-6 py-4">
              {/* Template Selection - only show when adding new tool */}
              {!isEditing && (
                <div className="space-y-2 pb-4 border-b border-gray-200">
                  <Label>Starta från mall (valfritt)</Label>
                  <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={templateOpen}
                        className="w-full justify-between"
                      >
                        {templateToolId
                          ? allTools?.find((t) => t.id === templateToolId)?.name + 
                            (allTools?.find((t) => t.id === templateToolId)?.model_number 
                              ? ` - ${allTools?.find((t) => t.id === templateToolId)?.model_number}` 
                              : '')
                          : "Start from scratch or search existing tool..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Sök verktyg..." />
                        <CommandEmpty>Inget verktyg hittades.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          <CommandItem
                            value="scratch"
                            onSelect={() => handleTemplateSelect('')}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                templateToolId === '' ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Börja från grunden
                          </CommandItem>
                          {allTools?.map((t) => (
                            <CommandItem
                              key={t.id}
                              value={`${t.name} ${t.model_number || ''}`}
                              onSelect={() => handleTemplateSelect(t.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  templateToolId === t.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {t.name} {t.model_number ? `- ${t.model_number}` : ''}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {templateToolId && (
                    <p className="text-xs text-gray-500">Kategori, underkategori, skick och plats kopierades från mallen</p>
                  )}
                </div>
              )}

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Verktygsbild</Label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {formData.image_url ? (
                      <div className="relative w-full h-full">
                        <img src={formData.image_url} alt="Tool" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleChange('image_url', '')}
                          className="absolute top-1 right-1 p-1 bg-[#8B1E1E] rounded-full text-white hover:bg-[#6B1515]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : uploading ? (
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      {uploading ? 'Laddar upp...' : 'Ladda upp bild'}
                    </Button>
                    {isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSearchImage}
                        disabled={searchingImage || !formData.name}
                      >
                        {searchingImage ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Söker...
                          </>
                        ) : (
                          'Sök bild (AI)'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Suggested Image Approval */}
              {formData.suggested_image_url && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-blue-900">AI hittade en bild - godkänn eller avslå:</p>
                  <div className="w-full h-48 bg-white rounded-lg overflow-hidden border border-blue-100">
                    <img src={formData.suggested_image_url} alt="Suggested" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApproveImage}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Godkänn bild
                    </Button>
                    <Button
                      onClick={handleRejectImage}
                      variant="outline"
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Avslå
                    </Button>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Verktygsnamn *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="t.ex. Slagskruvdragare"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tillverkare</Label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => handleChange('manufacturer', e.target.value)}
                    placeholder="t.ex. DeWalt, Milwaukee, Makita"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modellnummer</Label>
                  <Input
                    value={formData.model_number}
                    onChange={(e) => handleChange('model_number', e.target.value)}
                    placeholder="t.ex. 2857-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serienummer</Label>
                  <Input
                    value={formData.serial_number}
                    onChange={(e) => handleChange('serial_number', e.target.value)}
                    placeholder="t.ex. SN-123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Verktygsnummer</Label>
                  <Input
                    value={formData.tool_number}
                    onChange={(e) => handleChange('tool_number', e.target.value)}
                    placeholder="t.ex. TN-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  {!showCustomCategory ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {formData.category || "Välj kategori..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Sök kategori..." />
                          <CommandEmpty>Ingen kategori hittades.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {availableCategories.map((cat) => (
                              <CommandItem
                                key={cat}
                                value={cat}
                                onSelect={() => handleChange('category', cat)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.category === cat ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cat}
                              </CommandItem>
                            ))}
                            <CommandItem
                              value="__custom__"
                              onSelect={() => setShowCustomCategory(true)}
                            >
                              + Lägg till egen
                            </CommandItem>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Ny kategori"
                        autoFocus
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (customCategory.trim()) {
                            handleChange('category', customCategory.trim());
                            setShowCustomCategory(false);
                            setCustomCategory('');
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        OK
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowCustomCategory(false);
                          setCustomCategory('');
                        }}
                        className="whitespace-nowrap"
                      >
                        Avbryt
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                    <Label>Underkategori</Label>
                  {!showCustomSubcategory ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {formData.subcategory || "Välj underkategori..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Sök underkategori..." />
                          <CommandEmpty>Ingen underkategori hittades.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {availableSubcategories.map((sub) => (
                              <CommandItem
                                key={sub}
                                value={sub}
                                onSelect={() => handleChange('subcategory', sub)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.subcategory === sub ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {sub}
                              </CommandItem>
                            ))}
                            <CommandItem
                              value="__custom__"
                              onSelect={() => setShowCustomSubcategory(true)}
                            >
                              + Lägg till egen
                            </CommandItem>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={customSubcategory}
                        onChange={(e) => setCustomSubcategory(e.target.value)}
                        placeholder="Ny underkategori"
                        autoFocus
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (customSubcategory.trim()) {
                            handleChange('subcategory', customSubcategory.trim());
                            setShowCustomSubcategory(false);
                            setCustomSubcategory('');
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        OK
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowCustomSubcategory(false);
                          setCustomSubcategory('');
                        }}
                        className="whitespace-nowrap"
                      >
                        Avbryt
                      </Button>
                    </div>
                  )}
                  </div>
                  </div>

                  {formData.category === 'Redskap' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tillhör Huvudmaskin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {formData.main_machine_id ? (
                            huvudmaskiner.find(m => m.id === formData.main_machine_id)?.name || "Välj huvudmaskin..."
                          ) : "Välj huvudmaskin..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Sök huvudmaskin..." />
                          <CommandEmpty>Ingen huvudmaskin hittades.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {huvudmaskiner.map((maskin) => (
                              <CommandItem
                                key={maskin.id}
                                value={maskin.name}
                                onSelect={() => handleChange('main_machine_id', maskin.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.main_machine_id === maskin.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {maskin.name} {maskin.manufacturer ? `- ${maskin.manufacturer}` : ''}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Passar till (Huvudmaskiner)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {(formData.compatible_with_main_machine_ids || []).length > 0
                            ? (formData.compatible_with_main_machine_ids || []).map(id => huvudmaskiner.find(m => m.id === id)?.name).filter(Boolean).join(", ")
                            : "Välj huvudmaskiner..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Sök huvudmaskin..." />
                          <CommandEmpty>Ingen huvudmaskin hittades.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {huvudmaskiner.map((maskin) => (
                              <CommandItem
                                key={maskin.id}
                                value={maskin.name}
                                onSelect={() => {
                                  const currentIds = formData.compatible_with_main_machine_ids || [];
                                  const currentNames = formData.compatible_with_main_machine_names || [];
                                  const isSelected = currentIds.includes(maskin.id);

                                  const newIds = isSelected 
                                    ? currentIds.filter(id => id !== maskin.id)
                                    : [...currentIds, maskin.id];
                                  const newNames = isSelected 
                                    ? currentNames.filter(name => name !== maskin.name)
                                    : [...currentNames, maskin.name];

                                  setFormData(prev => ({
                                    ...prev,
                                    compatible_with_main_machine_ids: newIds,
                                    compatible_with_main_machine_names: newNames
                                  }));
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    (formData.compatible_with_main_machine_ids || []).includes(maskin.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {maskin.name} {maskin.manufacturer ? `- ${maskin.manufacturer}` : ''}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {formData.compatible_with_main_machine_names?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.compatible_with_main_machine_names.map((name) => (
                          <span key={name} className="px-2 py-1 bg-gray-100 rounded-md text-sm">
                            {name}
                            <button
                              onClick={() => {
                                const newNames = formData.compatible_with_main_machine_names.filter(n => n !== name);
                                const newIds = formData.compatible_with_main_machine_ids.filter((_, i) => formData.compatible_with_main_machine_names[i] !== name);
                                setFormData(prev => ({
                                  ...prev,
                                  compatible_with_main_machine_names: newNames,
                                  compatible_with_main_machine_ids: newIds
                                }));
                              }}
                              className="ml-1 text-gray-500 hover:text-gray-700"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label>Status</Label>
                       <MobileSelect
                         value={formData.status}
                         onChange={(v) => handleChange('status', v)}
                         options={[
                          { value: 'available', label: 'Tillgänglig' },
                          { value: 'in_use', label: 'I bruk' },
                          { value: 'i_lager', label: 'I lager' },
                          { value: 'maintenance', label: 'Underhåll' },
                          { value: 'missing', label: 'Saknas' },
                          { value: 'retired', label: 'Kasserad' },
                          { value: 'sålda', label: 'Såld' },
                         ]}
                         placeholder="Välj status"
                       />
                     </div>

                     <div className="space-y-2">
                       <Label>Skick</Label>
                       <MobileSelect
                         value={formData.condition}
                         onChange={(v) => handleChange('condition', v)}
                         options={[
                           { value: 'new', label: 'Ny' },
                           { value: 'good', label: 'Bra' },
                           { value: 'fair', label: 'Okej' },
                           { value: 'poor', label: 'Dålig' },
                         ]}
                         placeholder="Välj skick"
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Streckkod / Tag-ID</Label>
                       <Input
                         value={formData.barcode}
                         onChange={(e) => handleChange('barcode', e.target.value)}
                         placeholder="Skanna eller ange streckkod"
                       />
                     </div>
                   </div>

              {/* Purchase Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inköpsdatum</Label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => handleChange('purchase_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inköpspris (kr)</Label>
                  <Input
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => handleChange('purchase_price', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Köpt från</Label>
                  <Input
                    value={formData.purchase_location}
                    onChange={(e) => handleChange('purchase_location', e.target.value)}
                    placeholder="t.ex. Bauhaus, Clas Ohlson, lokalt järnhandel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fakturanummer</Label>
                  <Input
                    value={formData.invoice_number}
                    onChange={(e) => handleChange('invoice_number', e.target.value)}
                    placeholder="t.ex. FAK-12345"
                  />
                </div>
              </div>

              {/* Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Plats</Label>
                    <MobileSelect
                      value={formData.location_id}
                      onChange={(v) => handleChange('location_id', v)}
                      options={[
                        { value: '', label: 'Ej tilldelad' },
                        ...(locations?.map((location) => ({ value: location.id, label: location.name })) || [])
                      ]}
                      placeholder="Välj plats"
                    />
                  </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Anteckningar</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Lägg till eventuella anteckningar..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {isEditing && (
              <>
                <TabsContent value="service" className="space-y-4 py-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Service- och reparationshistorik</h3>
                    <Button
                      onClick={() => setShowServiceModal(true)}
                      size="sm"
                      className="bg-[#8B1E1E] hover:bg-[#6B1515]"
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      Lägg till servicepost
                    </Button>
                  </div>
                  <ServiceHistoryPanel serviceRecords={serviceRecords} />
                </TabsContent>
                <TabsContent value="log" className="space-y-4 py-4">
                  <h3 className="text-lg font-semibold">Ändringshistorik</h3>
                  <ToolLogTab toolId={tool?.id} />
                </TabsContent>
              </>
            )}
          </Tabs>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={handleClose}>
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.category || isLoading}
              className="bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sparar...
                </>
              ) : (
                isEditing ? 'Spara ändringar' : 'Lägg till verktyg'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ServiceRecordModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        tool={tool}
        onSubmit={(data) => createServiceRecordMutation.mutate(data)}
      />
    </>
  );
}