import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import SearchFilterBar from '@/components/ui/SearchFilterBar';
import ToolCard from '@/components/ui/ToolCard';
import TransferModal from '@/components/modals/TransferModal';
import ToolFormModal from '@/components/modals/ToolFormModal';
import ToolScanModal from '@/components/modals/ToolScanModal';
import BulkMoveModal from '@/components/modals/BulkMoveModal';
import BulkEditToolsModal from '@/components/modals/BulkEditToolsModal';
import ToolLogTab from '@/components/ToolLogTab';
import ToolImportPreviewModal from '@/components/modals/ToolImportPreviewModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MapPin,
  User,
  MoreVertical,
  ArrowRightLeft,
  Wrench,
  AlertTriangle,
  Loader2,
  Package,
  Download,
  Upload,
  FileSpreadsheet,
  ScanLine,
  CheckSquare,
  Square,
  Tag,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';

const statusConfig = {
  available: { label: "Tillgänglig", color: "bg-emerald-100 text-emerald-700" },
  in_use: { label: "I bruk", color: "bg-blue-100 text-blue-700" },
  i_lager: { label: "I lager", color: "bg-cyan-100 text-cyan-700" },
  maintenance: { label: "Underhåll", color: "bg-amber-100 text-amber-700" },
  missing: { label: "Saknas", color: "bg-red-100 text-red-700" },
  retired: { label: "Kasserad", color: "bg-gray-100 text-gray-600" },
  sålda: { label: "Såld", color: "bg-gray-100 text-gray-600" },
};

const categoryLabels = {
  power_tools: "Power Tools",
  Pover_tools: "Power Tools",
  hand_tools: "Hand Tools",
  measuring: "Measuring",
  safety: "Safety",
  accessories: "Accessories",
  heavy_equipment: "Heavy Equipment",
  vehicles: "Vehicles",
  other: "Other",
};

export default function Inventory() {
   const queryClient = useQueryClient();
   
  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => base44.entities.Tool.list('-updated_date', 2000).then(r => r.filter(t => !t.is_deleted)),
  });

   const { containerRef, isPulling, pullDistance, PULL_THRESHOLD } = usePullToRefresh(
     () => queryClient.invalidateQueries(['tools']),
     isLoading
   );

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [subcategoryFilter, setSubcategoryFilter] = useState([]);
  const [manufacturerFilter, setManufacturerFilter] = useState([]);
  const [conditionFilter, setConditionFilter] = useState([]);
  const [locationFilter, setLocationFilter] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const handleTableSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronsUpDown className="w-3.5 h-3.5 ml-1 text-gray-400 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-[#8B1E1E] inline" />
      : <ChevronDown className="w-3.5 h-3.5 ml-1 text-[#8B1E1E] inline" />;
  };
  const [transferTool, setTransferTool] = useState(null);
  const [editTool, setEditTool] = useState(null);
  const [showAddTool, setShowAddTool] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // { rows, existingTools, fileName }
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedTools, setSelectedTools] = useState(new Set());
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [toolHistory, setToolHistory] = useState(null);

  const toggleSelectTool = (id) => {
    setSelectedTools(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedTools.size === filteredTools.length) {
      setSelectedTools(new Set());
    } else {
      setSelectedTools(new Set(filteredTools.map(t => t.id)));
    }
  };

  const bulkMoveMutation = useMutation({
    mutationFn: (data) => Promise.all(
      data.toolIds.map(id =>
        base44.entities.Tool.update(id, { location_id: data.locationId, location_name: data.locationName })
      )
    ),
    onMutate: async ({ toolIds, locationId, locationName }) => {
      await queryClient.cancelQueries({ queryKey: ['tools'] });
      const prevTools = queryClient.getQueryData(['tools']);
      queryClient.setQueryData(['tools'], (old) =>
        old?.map(t => toolIds.includes(t.id) ? { ...t, location_id: locationId, location_name: locationName } : t) || []
      );
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['tools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setSelectedTools(new Set());
    },
  });

  const bulkEditMutation = useMutation({
    mutationFn: (updates) => Promise.all(
      [...selectedTools].map(id => base44.entities.Tool.update(id, updates))
    ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setSelectedTools(new Set());
      setShowBulkEdit(false);
    },
  });

  const handleBulkMove = (locationId, locationName) => 
    bulkMoveMutation.mutate({ toolIds: [...selectedTools], locationId, locationName });

  const handleBulkEdit = (updates) => bulkEditMutation.mutateAsync(updates);



  // Only display active tools — exclude sold/retired/missing (those go to SåldaRedskap). Include i_lager
  const HIDDEN_STATUSES = ['såld', 'sålda', 'retired', 'missing'];
  const allItems = useMemo(() => tools.filter(t => !HIDDEN_STATUSES.includes(t.status)).map(t => ({ ...t, type: 'tool' })), [tools]);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: huvudmaskiner = [] } = useQuery({
    queryKey: ['huvudmaskiner'],
    queryFn: () => base44.entities.Huvudmaskin.list(),
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  const { data: serviceRecords = [] } = useQuery({
    queryKey: ['serviceRecords'],
    queryFn: () => base44.entities.ServiceRecord.list('-service_date', 1000),
  });

  // Calculate service costs per tool
  const serviceCostsByTool = useMemo(() => {
    const costs = {};
    serviceRecords.forEach(record => {
      if (!costs[record.tool_id]) costs[record.tool_id] = 0;
      costs[record.tool_id] += record.cost || 0;
    });
    return costs;
  }, [serviceRecords]);

  const filteredTools = useMemo(() => {
    const filtered = allItems.filter(item => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        item.name?.toLowerCase().includes(q) ||
        item.model_number?.toLowerCase().includes(q) ||
        item.barcode?.toLowerCase().includes(q) ||
        item.subcategory?.toLowerCase().includes(q);
      
      const hasNoStatus = !item.status || item.status === '';
      const matchesStatus = statusFilter.length === 0 ||
        (!hasNoStatus && statusFilter.includes(item.status)) ||
        (hasNoStatus && statusFilter.includes('__no_status__'));
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(item.category);
      const matchesSubcategory = subcategoryFilter.length === 0 || subcategoryFilter.includes(item.subcategory);
      const matchesManufacturer = manufacturerFilter.length === 0 || manufacturerFilter.includes(item.manufacturer);
      const matchesCondition = conditionFilter.length === 0 || conditionFilter.includes(item.condition);
      const matchesLocation = locationFilter.length === 0 || locationFilter.includes(item.location_name);
      
      return matchesSearch && matchesStatus && matchesCategory && matchesSubcategory && 
             matchesManufacturer && matchesCondition && matchesLocation;
    });

    // Sort the filtered items
    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'model_number') {
        cmp = (a.model_number || '').localeCompare(b.model_number || '');
      } else if (sortBy === 'category') {
        cmp = (a.category || '').localeCompare(b.category || '');
      } else if (sortBy === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      } else if (sortBy === 'location') {
        cmp = (a.location_name || '').localeCompare(b.location_name || '');
      } else if (sortBy === 'assigned') {
        cmp = (a.assigned_to_name || '').localeCompare(b.assigned_to_name || '');
      } else if (sortBy === 'price') {
        cmp = (a.purchase_price || 0) - (b.purchase_price || 0);
      } else { // 'updated'
        cmp = new Date(a.updated_date).getTime() - new Date(b.updated_date).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allItems, searchQuery, statusFilter, categoryFilter, subcategoryFilter, manufacturerFilter, conditionFilter, locationFilter, sortBy, sortDir]);

  const availableCategories = useMemo(() => {
    return [...new Set(allItems.map(t => t.category).filter(Boolean))].sort();
  }, [allItems]);

  const availableSubcategories = useMemo(() => {
    if (categoryFilter.length === 0) {
      return [...new Set(allItems.map(t => t.subcategory).filter(Boolean))].sort();
    }
    return [...new Set(
      allItems.filter(t => categoryFilter.includes(t.category)).map(t => t.subcategory).filter(Boolean)
    )].sort();
  }, [allItems, categoryFilter]);

  const availableManufacturers = useMemo(() => {
    return [...new Set(allItems.map(t => t.manufacturer).filter(Boolean))].sort();
  }, [allItems]);

  const availableLocations = useMemo(() => {
    return [...new Set(allItems.map(t => t.location_name).filter(Boolean))].sort();
  }, [allItems]);

  const transferMutation = useMutation({
    mutationFn: async (transferData) => {
      await base44.entities.Transfer.create(transferData);
      return base44.entities.Tool.update(transferData.tool_id, {
        location_id: transferData.to_location_id,
        location_name: transferData.to_location_name,
        assigned_to_email: transferData.to_person_email,
        assigned_to_name: transferData.to_person_name,
        status: 'in_use',
        last_seen_date: new Date().toISOString(),
      });
    },
    onMutate: async (transferData) => {
      await queryClient.cancelQueries({ queryKey: ['tools'] });
      const prevTools = queryClient.getQueryData(['tools']);
      queryClient.setQueryData(['tools'], (old) =>
        old?.map(t => t.id === transferData.tool_id 
          ? { ...t, location_id: transferData.to_location_id, location_name: transferData.to_location_name, assigned_to_email: transferData.to_person_email, assigned_to_name: transferData.to_person_name, status: 'in_use' }
          : t
        ) || []
      );
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['tools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setTransferTool(null);
    },
  });

  const toolMutation = useMutation({
    mutationFn: async (toolData) => {
      if (editTool?.id) {
        return base44.entities.Tool.update(editTool.id, toolData);
      } else {
        return base44.entities.Tool.create(toolData);
      }
    },
    onMutate: async (toolData) => {
      await queryClient.cancelQueries({ queryKey: ['tools'] });
      const prevTools = queryClient.getQueryData(['tools']);
      if (editTool?.id) {
        queryClient.setQueryData(['tools'], (old) =>
          old?.map(t => t.id === editTool.id ? { ...t, ...toolData } : t) || []
        );
      } else {
        queryClient.setQueryData(['tools'], (old) => [...(old || []), { ...toolData, id: 'temp-' + Date.now() }]);
      }
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['tools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setEditTool(null);
      setShowAddTool(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (data) => base44.entities.Tool.update(data.id, { status: data.newStatus }),
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['tools'] });
      const prevTools = queryClient.getQueryData(['tools']);
      queryClient.setQueryData(['tools'], (old) =>
        old?.map(t => t.id === id ? { ...t, status: newStatus } : t) || []
      );
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['tools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tool.update(id, { is_deleted: true, deleted_at: new Date().toISOString() }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tools'] });
      const prevTools = queryClient.getQueryData(['tools']);
      queryClient.setQueryData(['tools'], (old) =>
        old?.filter(t => t.id !== id) || []
      );
      return { prevTools };
    },
    onError: (err, newData, context) => {
      if (context?.prevTools) queryClient.setQueryData(['tools'], context.prevTools);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
    },
  });

  const handleTransfer = (transferData) => transferMutation.mutate(transferData);
  const handleSaveTool = (toolData) => toolMutation.mutate(toolData);
  const handleStatusChange = (tool, newStatus) => statusMutation.mutate({ id: tool.id, newStatus });
  const handleDeleteTool = (tool) => {
    if (window.confirm(`Är du säker på att du vill ta bort "${tool.name}"? Objektet hamnar i papperskorgen i 30 dagar.`)) {
      deleteMutation.mutate(tool.id);
    }
  };

  const handleSearchImages = async () => {
    try {
      const response = await base44.functions.invoke('batchSearchToolImages', {});
      queryClient.invalidateQueries(['tools']);
      alert(`Bildsökning slutförd: ${response.data?.count || 0} verktyg uppdaterades`);
    } catch (error) {
      console.error('Batch search failed:', error);
      alert('Bildsökningen misslyckades. Försök igen senare.');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter([]);
    setCategoryFilter([]);
    setSubcategoryFilter([]);
    setManufacturerFilter([]);
    setConditionFilter([]);
    setLocationFilter([]);
  };

  const handleDownloadTemplate = () => {
    const headers = ['name', 'manufacturer', 'model_number', 'serial_number', 'tool_number', 'category', 'subcategory', 'status', 'condition', 'barcode', 'purchase_date', 'purchase_price', 'purchase_location', 'invoice_number', 'service_cost', 'location_name', 'assigned_to_name', 'notes'];

    // Add example row and empty rows
    const exampleRow = ['Impact Driver', 'DeWalt', 'DCF887B', 'SN-123456', 'TOOL-001', 'Power Tools', 'Impact Drivers', 'available', 'good', '', '2026-01-01', '199.99', 'Home Depot', 'INV-001', '500', 'Main Warehouse', 'John Smith', 'Example tool'];
    const emptyRows = Array(19).fill(Array(18).fill(''));

    const csvContent = [
      headers.join(','),
      exampleRow.map(cell => `"${cell}"`).join(','),
      ...emptyRows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'tool_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportToExcel = () => {
    // Create CSV content
    const headers = ['Name', 'Manufacturer', 'Model Number', 'Category', 'Subcategory', 'Status', 'Condition', 'Barcode', 'Purchase Date', 'Purchase Price', 'Purchased From', 'Invoice Number', 'Service Costs', 'Location', 'Assigned To', 'Notes'];
    const rows = tools.map(tool => {
      const serviceCost = serviceCostsByTool[tool.id] || 0;
      return [
        tool.name || '',
        tool.manufacturer || '',
        tool.model_number || '',
        tool.category || '',
        tool.subcategory || '',
        tool.status || '',
        tool.condition || '',
        tool.barcode || '',
        tool.purchase_date || '',
        tool.purchase_price || '',
        tool.purchase_location || '',
        tool.invoice_number || '',
        serviceCost,
        tool.location_name || '',
        tool.assigned_to_name || '',
        tool.notes || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFromExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            manufacturer: { type: "string" },
            model_number: { type: "string" },
            serial_number: { type: "string" },
            tool_number: { type: "string" },
            category: { type: "string" },
            subcategory: { type: "string" },
            status: { type: "string" },
            condition: { type: "string" },
            barcode: { type: "string" },
            purchase_date: { type: "string" },
            purchase_price: { type: "number" },
            purchase_location: { type: "string" },
            invoice_number: { type: "string" },
            service_cost: { type: "number" },
            location_name: { type: "string" },
            assigned_to_name: { type: "string" },
            notes: { type: "string" },
          }
        }
      });

      if (result.status === 'success' && result.output) {
        const toolsData = Array.isArray(result.output) ? result.output : [result.output];
        const validTools = toolsData.filter(tool => tool.name && tool.name.trim() !== '');

        if (validTools.length === 0) {
          alert('Inga giltiga verktygsdata hittades i filen. Kontrollera att du har fyllt i minst Namn-kolumnen.');
          return;
        }

        const existingTools = await base44.entities.Tool.list();
        setImportPreview({ rows: validTools, existingTools, fileName: file.name });
      } else {
        const errorMsg = result.details || 'Okänt fel';
        alert(`Kunde inte extrahera data från filen: ${errorMsg}\n\nKontrollera filformatet och att kolumnrubriker matchar mallen.`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Importen misslyckades: ${error.message || error}\n\nKontrollera att filen har rätt format och innehåller giltig data.`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleConfirmImport = async (enrichedRows) => {
    let createdCount = 0;
    let updatedCount = 0;
    const serviceRecordsToCreate = [];

    for (const tool of enrichedRows) {
      const toolData = {
        name: tool.name,
        manufacturer: tool.manufacturer || '',
        model_number: tool.model_number || '',
        serial_number: tool.serial_number || '',
        tool_number: tool.tool_number || '',
        category: tool.category || 'other',
        subcategory: tool.subcategory || '',
        status: tool.status || 'available',
        condition: tool.condition || 'good',
        barcode: tool.barcode || '',
        purchase_date: tool.purchase_date || '',
        purchase_price: tool.purchase_price || null,
        purchase_location: tool.purchase_location || '',
        invoice_number: tool.invoice_number || '',
        location_name: tool.location_name || '',
        assigned_to_name: tool.assigned_to_name || '',
        notes: tool.notes || '',
      };

      if (tool._action === 'update') {
        // Only include fields that are enabled for update
        const enabledFields = tool._enabledFields ? new Set(tool._enabledFields) : null;
        const filteredToolData = enabledFields
          ? Object.fromEntries(Object.entries(toolData).filter(([k]) => enabledFields.has(k)))
          : toolData;
        await base44.entities.Tool.update(tool._existingId, filteredToolData);
        updatedCount++;
        if (tool.service_cost && tool.service_cost > 0) {
          serviceRecordsToCreate.push({
            tool_id: tool._existingId,
            tool_name: toolData.name,
            service_type: 'annual_service',
            cost: tool.service_cost,
            service_date: new Date().toISOString().split('T')[0],
            description: 'Årlig servicekostnad från malluppladdning',
            performed_by: 'System'
          });
        }
      } else {
        const createdTool = await base44.entities.Tool.create(toolData);
        createdCount++;
        if (tool.service_cost && tool.service_cost > 0) {
          serviceRecordsToCreate.push({
            tool_id: createdTool.id,
            tool_name: createdTool.name,
            service_type: 'annual_service',
            cost: tool.service_cost,
            service_date: new Date().toISOString().split('T')[0],
            description: 'Årlig servicekostnad från malluppladdning',
            performed_by: 'System'
          });
        }
      }
    }

    if (serviceRecordsToCreate.length > 0) {
      await base44.entities.ServiceRecord.bulkCreate(serviceRecordsToCreate);
    }

    queryClient.invalidateQueries(['tools']);
    setImportPreview(null);
    alert(`${createdCount} nya verktyg lagda till, ${updatedCount} befintliga verktyg uppdaterade.`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#8B1E1E] animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50/50 dark:bg-gray-950 p-6 lg:p-8 overflow-y-auto" style={{ transform: isPulling ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)', transition: isPulling ? 'none' : 'transform 0.3s ease-out' }}>
      {pullDistance > 0 && (
        <div className="fixed top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none">
          <div style={{ opacity: Math.min(pullDistance / PULL_THRESHOLD, 1) }}>
            {isPulling ? (
              <Loader2 className="w-5 h-5 text-[#8B1E1E] animate-spin" />
            ) : (
              <div className="text-xs text-gray-500">{pullDistance >= PULL_THRESHOLD ? 'Släpp för att uppdatera' : 'Dra för att uppdatera'}</div>
            )}
          </div>
        </div>
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Maskiner</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {filteredTools.length} verktyg
              {(statusFilter.length > 0 || categoryFilter.length > 0 || subcategoryFilter.length > 0 || manufacturerFilter.length > 0 || conditionFilter.length > 0 || locationFilter.length > 0 || searchQuery) && ' matchar filter'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 md:gap-2 shrink-0">
            {selectedTools.size > 0 && (
              <>
                <Button onClick={() => setShowBulkEdit(true)} className="bg-[#8B1E1E] hover:bg-[#6B1515] hidden md:inline-flex" size="sm">
                  <CheckSquare className="w-4 h-4 mr-2" />Redigera ({selectedTools.size})
                </Button>
                <Button onClick={() => setShowBulkMove(true)} variant="outline" className="md:inline-flex hidden" size="sm">
                  <MapPin className="w-4 h-4 mr-2" />Ändra plats
                </Button>
              </>
            )}
            <Button onClick={() => setShowScanModal(true)} variant="outline" size="sm" className="hidden sm:inline-flex">
              <ScanLine className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Inventera (skanna)</span>
            </Button>
            <Button onClick={handleDownloadTemplate} variant="outline" size="sm" className="hidden md:inline-flex">
              <FileSpreadsheet className="w-4 h-4 mr-2" />Ladda ned mall
            </Button>
            <Button onClick={handleExportToExcel} variant="outline" size="sm" className="hidden md:inline-flex" disabled={tools.length === 0}>
              <Download className="w-4 h-4 mr-2" />Exportera data
            </Button>
            <label>
              <Button variant="outline" size="sm" className="hidden md:inline-flex" disabled={importing} asChild>
                <span>{importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importerar...</> : <><Upload className="w-4 h-4 mr-2" />Importera</>}</span>
              </Button>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFromExcel} className="hidden" disabled={importing} />
            </label>
            <Button onClick={() => setShowAddTool(true)} className="bg-[#8B1E1E] hover:bg-[#6B1515] shadow-lg shadow-[#8B1E1E]/25" size="sm">
              <Plus className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Lägg till</span>
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            categoryFilter={categoryFilter}
            onCategoryChange={setCategoryFilter}
            subcategoryFilter={subcategoryFilter}
            onSubcategoryChange={setSubcategoryFilter}
            manufacturerFilter={manufacturerFilter}
            onManufacturerChange={setManufacturerFilter}
            conditionFilter={conditionFilter}
            onConditionChange={setConditionFilter}
            locationFilter={locationFilter}
            onLocationChange={setLocationFilter}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onClearFilters={clearFilters}
            availableCategories={availableCategories}
            availableSubcategories={availableSubcategories}
            availableManufacturers={availableManufacturers}
            availableLocations={availableLocations}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            statusOptions={[
              { value: 'available', label: 'Tillgänglig' },
              { value: 'in_use', label: 'I bruk' },
              { value: 'i_lager', label: 'I lager' },
              { value: 'maintenance', label: 'Underhåll' },
              { value: 'sålda', label: 'Såld' },
              { value: '__no_status__', label: `Ingen status (${allItems.filter(t => !t.status || t.status === '').length})` },
            ]}
          />
        </div>

        {/* Content */}
        {/* Select all bar */}
        {filteredTools.length > 0 && (
          <div className="flex items-center gap-3">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              {selectedTools.size === filteredTools.length && filteredTools.length > 0
                ? <CheckSquare className="w-4 h-4 text-[#8B1E1E]" />
                : <Square className="w-4 h-4" />}
              {selectedTools.size === filteredTools.length && filteredTools.length > 0 ? 'Avmarkera alla' : 'Markera alla'}
            </button>
            {selectedTools.size > 0 && (
              <span className="text-sm text-gray-500">{selectedTools.size} markerade</span>
            )}
          </div>
        )}

        {filteredTools.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {tools.length === 0 ? 'Inga verktyg i inventariet' : 'Inga verktyg matchar dina filter'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {tools.length === 0 
                ? 'Lägg till ditt första verktyg för att komma igång'
                : 'Försök justera din sökning eller dina filter'}
            </p>
            {tools.length === 0 ? (
              <Button
                onClick={() => setShowAddTool(true)}
                className="bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Lägg till första verktyget
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                Rensa filter
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {filteredTools.map((tool) => {
              const serviceCost = serviceCostsByTool[tool.id] || 0;
              const isSelected = selectedTools.has(tool.id);
              return (
                <div key={tool.id} className={`relative rounded-2xl ${isSelected ? 'ring-2 ring-[#8B1E1E]' : ''}`}>
                  {selectedTools.size > 0 && (
                    <button
                      onClick={() => toggleSelectTool(tool.id)}
                      className="absolute top-2 left-2 z-10 bg-white rounded-md shadow p-0.5"
                    >
                      {isSelected
                        ? <CheckSquare className="w-5 h-5 text-[#8B1E1E]" />
                        : <Square className="w-5 h-5 text-gray-400" />}
                    </button>
                  )}
                  <ToolCard
                    tool={tool}
                    serviceCost={serviceCost}
                    onTransfer={setTransferTool}
                    onEdit={setEditTool}
                    onStatusChange={handleStatusChange}
                    onViewHistory={setToolHistory}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                  <TableHead className="w-10 px-2">
                    <button onClick={toggleSelectAll} className="p-1">
                      {selectedTools.size === filteredTools.length && filteredTools.length > 0
                        ? <CheckSquare className="w-5 h-5 text-[#8B1E1E]" />
                        : <Square className="w-5 h-5 text-gray-400" />}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] px-2 py-2 text-xs" onClick={() => handleTableSort('name')}>Verktyg<SortIcon col="name" /></TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] px-1 py-2 text-xs" onClick={() => handleTableSort('status')}>Status<SortIcon col="status" /></TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] px-1 py-2 text-xs hidden md:table-cell" onClick={() => handleTableSort('model_number')}>Modell<SortIcon col="model_number" /></TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] px-1 py-2 text-xs hidden sm:table-cell" onClick={() => handleTableSort('location')}>Plats<SortIcon col="location" /></TableHead>
                  <TableHead className="font-semibold cursor-pointer select-none hover:text-[#8B1E1E] px-1 py-2 text-xs hidden md:table-cell" onClick={() => handleTableSort('price')}>Värde<SortIcon col="price" /></TableHead>
                  <TableHead className="font-semibold px-1 py-2 text-xs hidden lg:table-cell">Service</TableHead>
                  <TableHead className="w-8 px-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTools.map((tool) => {
                  const status = statusConfig[tool.status] || statusConfig.available;
                  const serviceCost = serviceCostsByTool[tool.id] || 0;
                  return (
                    <TableRow 
                     key={tool.id} 
                     className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${selectedTools.has(tool.id) ? 'bg-[#8B1E1E]/5' : ''}`}
                      onClick={() => setEditTool(tool)}
                    >
                      <TableCell onClick={e => { e.stopPropagation(); toggleSelectTool(tool.id); }} className="px-2 py-1">
                        {selectedTools.has(tool.id)
                          ? <CheckSquare className="w-5 h-5 text-[#8B1E1E]" />
                          : <Square className="w-5 h-5 text-gray-400" />}
                      </TableCell>
                       <TableCell className="px-2 py-1 max-w-[160px]">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                             {tool.image_url ? (
                               <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover rounded-lg" />
                             ) : (
                               '🔧'
                             )}
                           </div>
                           <div className="min-w-0">
                             <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{tool.name}</p>
                             {tool.subcategory && (
                               <p className="text-xs text-gray-500 truncate hidden sm:block">{tool.subcategory}</p>
                             )}
                           </div>
                         </div>
                       </TableCell>
                       <TableCell className="px-1 py-1">
                         <Badge className={`${status.color} border-0 text-xs`}>
                           {status.label}
                         </Badge>
                       </TableCell>
                       <TableCell className="px-1 py-1 text-xs hidden md:table-cell">
                          <span className="truncate text-gray-600 dark:text-gray-300">{tool.model_number || '—'}</span>
                        </TableCell>
                       <TableCell className="px-1 py-1 text-xs hidden sm:table-cell">
                          {tool.location_name ? (
                            <span className="truncate text-gray-600 dark:text-gray-300">{tool.location_name}</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">—</span>
                          )}
                         </TableCell>
                         <TableCell className="font-medium text-gray-900 dark:text-gray-100 px-1 py-1 text-xs hidden md:table-cell">
                         {tool.purchase_price ? `${tool.purchase_price.toLocaleString('sv-SE')} kr` : '—'}
                       </TableCell>
                       <TableCell className="font-medium text-gray-900 dark:text-gray-100 px-1 py-1 text-xs hidden lg:table-cell">
                         {serviceCost > 0 ? (
                           <span className="text-[#8B1E1E]">{serviceCost.toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr</span>
                         ) : (
                           '—'
                         )}
                       </TableCell>
                      <TableCell className="px-2 py-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setEditTool(tool);
                            }}>
                              <Wrench className="w-4 h-4 mr-2" />
                              Redigera verktyg
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setTransferTool(tool);
                            }}>
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              Förflytta
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tool.status !== 'missing' && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(tool, 'missing');
                                }}
                                className="text-[#8B1E1E]"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Rapportera saknad
                              </DropdownMenuItem>
                            )}
                            {tool.status !== 'sålda' && (
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(tool, 'sålda');
                                }}
                                className="text-gray-600"
                              >
                                <Tag className="w-4 h-4 mr-2" />
                                Markera som såld
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <BulkMoveModal
        isOpen={showBulkMove}
        onClose={() => setShowBulkMove(false)}
        selectedCount={selectedTools.size}
        locations={locations}
        onSubmit={handleBulkMove}
      />

      <BulkEditToolsModal
        isOpen={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        selectedCount={selectedTools.size}
        selectedTools={tools.filter(t => selectedTools.has(t.id))}
        locations={locations}
        categories={availableCategories}
        huvudmaskiner={huvudmaskiner}
        onSubmit={handleBulkEdit}
      />

      {/* Modals */}
      <TransferModal
        isOpen={!!transferTool}
        onClose={() => setTransferTool(null)}
        tool={transferTool}
        locations={locations}
        teamMembers={teamMembers}
        onSubmit={handleTransfer}
      />

      <ToolScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        tools={tools}
      />

      <ToolFormModal
        isOpen={showAddTool || !!editTool}
        onClose={() => {
          setShowAddTool(false);
          setEditTool(null);
        }}
        tool={editTool}
        locations={locations}
        teamMembers={teamMembers}
        onSubmit={handleSaveTool}
      />

      {importPreview && (
        <ToolImportPreviewModal
          rows={importPreview.rows}
          existingTools={importPreview.existingTools}
          fileName={importPreview.fileName}
          onConfirm={handleConfirmImport}
          onCancel={() => setImportPreview(null)}
        />
      )}

      {/* Mobile bulk action bar */}
      {selectedTools.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 md:hidden px-4 pb-2" style={{ paddingBottom: 'calc(0.5rem + var(--sab))' }}>
          <div className="bg-[#8B1E1E] rounded-2xl shadow-xl flex items-center gap-2 px-4 py-3">
            <span className="text-white text-sm font-medium flex-1">{selectedTools.size} markerade</span>
            <Button onClick={() => setShowBulkMove(true)} variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white">
              <MapPin className="w-4 h-4 mr-1" />Plats
            </Button>
            <Button onClick={() => setShowBulkEdit(true)} size="sm" className="bg-white text-[#8B1E1E] hover:bg-white/90">
              <CheckSquare className="w-4 h-4 mr-1" />Redigera
            </Button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {toolHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="min-w-0 pr-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{toolHistory.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ändringshistorik</p>
              </div>
              <button
                onClick={() => setToolHistory(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
              >
                <span className="text-lg leading-none">✕</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ToolLogTab toolId={toolHistory.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}