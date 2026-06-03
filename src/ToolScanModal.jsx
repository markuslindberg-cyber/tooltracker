import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, CheckCircle2, Search, Package, MapPin, Loader2, AlertTriangle, BarChart2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from '@tanstack/react-query';
import { useBarcodeCamera } from "@/hooks/useBarcodeCamera";
import ScannerOverlay from "@/components/ScannerOverlay";
import TorchButton from "@/components/ui/TorchButton";

export default function HandToolScanModal({ isOpen, onClose, handTools, locations = [] }) {
  const queryClient = useQueryClient();

  // Phase: 'setup' or 'scanning'
  const [phase, setPhase] = useState('setup');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [typeSearch, setTypeSearch] = useState('');

  const [scannerActive, setScannerActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [foundGroup, setFoundGroup] = useState(null);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [checkedBarcodes, setCheckedBarcodes] = useState(new Set());
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPhase('setup');
      setSelectedLocationId('');
      setTypeSearch('');
      setScannerActive(false);
      setFoundGroup(null);
      setManualBarcode('');
      setNotFound(false);
      setCheckedBarcodes(new Set());
    }
  }, [isOpen]);

  const { torchOn, torchSupported, toggleTorch } = useBarcodeCamera("ht-barcode-scanner", scannerActive, (barcode) => {
    handleScan(barcode);
  });

  // Scoped tools: filter by location + typeSearch
  const scopedTools = handTools.filter(t => {
    if (selectedLocationId && t.location_id !== selectedLocationId) return false;
    if (typeSearch) {
      const q = typeSearch.toLowerCase();
      if (!`${t.name} ${t.category} ${t.subcategory} ${t.barcode || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleScan = (barcode) => {
    setManualBarcode(barcode);
    const tools = scopedTools.filter(t => t.barcode === barcode);
    if (tools.length > 0) {
      if (foundGroup && foundGroup.barcode === barcode) {
        setFoundGroup(prev => ({ ...prev, countFound: prev.countFound + 1 }));
      } else {
        setFoundGroup({ barcode, tools, countFound: 1 });
      }
      setNotFound(false);
    } else {
      setFoundGroup(null);
      setNotFound(true);
    }
  };

  const handleManualSearch = () => {
    if (!manualBarcode.trim()) return;
    handleScan(manualBarcode.trim());
    setManualBarcode('');
  };

  const handleConfirm = async () => {
    if (!foundGroup) return;
    setSaving(true);
    await Promise.all(foundGroup.tools.map(t =>
      base44.entities.HandTool.update(t.id, {
        last_seen_date: new Date().toISOString(),
        status: 'i_lager',
      })
    ));
    setCheckedBarcodes(prev => new Set([...prev, foundGroup.barcode]));
    queryClient.invalidateQueries(['handtools']);
    setSaving(false);
    setFoundGroup(null);
  };

  const handleFinish = async () => {
    setFinishing(true);
    let user = null;
    try { user = await base44.auth.me(); } catch {}

    const selectedLocation = locations.find(l => l.id === selectedLocationId);
    const allBarcodes = [...new Set(scopedTools.filter(t => t.barcode).map(t => t.barcode))];
    const uncheckedBarcodes = allBarcodes.filter(b => !checkedBarcodes.has(b));

    const checkedArr = scopedTools
      .filter(t => t.barcode && checkedBarcodes.has(t.barcode))
      .map(t => ({
        id: t.id,
        name: t.name,
        type: 'handtool',
        category: t.category || '',
        barcode: t.barcode || '',
        location_name: t.location_name || '',
        status: t.status || '',
      }));

    const uncheckedArr = scopedTools
      .filter(t => t.barcode && uncheckedBarcodes.includes(t.barcode))
      .map(t => ({
        id: t.id,
        name: t.name,
        type: 'handtool',
        category: t.category || '',
        barcode: t.barcode || '',
        location_name: t.location_name || '',
        status: t.status || '',
      }));

    await base44.entities.InventoryReport.create({
      location_name: selectedLocation?.name || null,
      location_id: selectedLocationId || null,
      tool_type: 'handtools',
      mode: selectedLocationId ? 'location' : 'open',
      performed_by_name: user?.full_name || null,
      performed_by_email: user?.email || null,
      performed_at: new Date().toISOString(),
      total_items: scopedTools.length,
      checked_items: checkedBarcodes.size,
      unchecked_items: uncheckedBarcodes.length,
      checked_list: checkedArr,
      unchecked_list: uncheckedArr,
    });

    queryClient.invalidateQueries(['inventoryReports']);
    setFinishing(false);
    onClose();
  };

  const allBarcodes = [...new Set(scopedTools.filter(t => t.barcode).map(t => t.barcode))];
  const uncheckedBarcodes = allBarcodes.filter(b => !checkedBarcodes.has(b));

  const getGroupLabel = (tools) => {
    const name = tools[0]?.category || tools[0]?.name || '';
    const location = tools[0]?.location_name || '';
    return { name, location, count: tools.length };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#8B1E1E]" />
            Inventera handredskap
          </DialogTitle>
        </DialogHeader>

        {phase === 'setup' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plats (valfritt)</Label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Alla platser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Alla platser</SelectItem>
                  {locations.filter(l => l.is_active !== false).map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Sök redskapstyp eller streckkod (valfritt)</Label>
              <Input
                placeholder="T.ex. Räfsor, Krattor eller streckkod..."
                value={typeSearch}
                onChange={e => setTypeSearch(e.target.value)}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              {scopedTools.length} redskap matchar dina val
            </div>

            <Button
              onClick={() => setPhase('scanning')}
              className="w-full bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              Starta inventering
            </Button>
          </div>
        ) : (
          <>
            {/* Back + Progress */}
            <div className="flex items-center gap-2">
              <button onClick={() => setPhase('setup')} className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">Kontrollerade grupper</span>
                <span className="font-bold text-[#8B1E1E]">{checkedBarcodes.size} / {allBarcodes.length}</span>
              </div>
            </div>

            {/* Scanner */}
            <div className="space-y-3">
              {!scannerActive ? (
                <div className="flex gap-2">
                  <Button onClick={() => setScannerActive(true)} className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515] h-10">
                    <Camera className="w-5 h-5 mr-2" />Kamera
                  </Button>
                  <div className="flex-1 flex gap-1">
                    <Input
                      placeholder="Streckkod"
                      value={manualBarcode}
                      onChange={e => setManualBarcode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                      className="text-sm"
                    />
                    <Button onClick={handleManualSearch} disabled={!manualBarcode.trim()} size="sm">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <div id="ht-barcode-scanner" className="rounded-xl overflow-hidden bg-black" style={{ minHeight: '300px', height: '40vh' }} />
                    <ScannerOverlay />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex gap-1">
                      <Input
                        placeholder="Manuell streckkod"
                        value={manualBarcode}
                        onChange={e => setManualBarcode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                        className="text-sm"
                      />
                      <Button onClick={handleManualSearch} disabled={!manualBarcode.trim()} size="sm">
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>
                    <TorchButton torchOn={torchOn} torchSupported={torchSupported} toggleTorch={toggleTorch} />
                    <Button onClick={() => setScannerActive(false)} variant="outline" size="sm">Stäng</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Not found */}
            {notFound && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Ingen grupp hittades med den streckkoden.
              </div>
            )}

            {/* Found group */}
            {foundGroup && (() => {
              const { name, location, count } = getGroupLabel(foundGroup.tools);
              return (
                <div className="border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{name}</p>
                      {location && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{location}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Förväntat antal: <span className="font-semibold text-gray-700">{count} st</span></p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                  </div>

                  <div className="space-y-1">
                    <Label>Antal hittade</Label>
                    <p className="text-xs text-gray-500">Skanna streckkoden igen för att räkna upp, eller ange manuellt</p>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" onClick={() => setFoundGroup(prev => ({ ...prev, countFound: Math.max(0, prev.countFound - 1) }))}>
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number" min="0"
                        className="text-center text-xl font-bold w-24"
                        value={foundGroup.countFound}
                        onChange={e => setFoundGroup(prev => ({ ...prev, countFound: Math.max(0, parseInt(e.target.value) || 0) }))}
                      />
                      <Button variant="outline" size="icon" onClick={() => setFoundGroup(prev => ({ ...prev, countFound: prev.countFound + 1 }))}>
                        <Plus className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-gray-500">av {count} st</span>
                    </div>
                    {foundGroup.countFound < count && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" />{count - foundGroup.countFound} redskap saknas
                      </p>
                    )}
                    {foundGroup.countFound === count && (
                      <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3" />Alla redskap bekräftade!
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setFoundGroup(null)}>Avbryt</Button>
                    <Button onClick={handleConfirm} disabled={saving} className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]">
                      {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Bekräfta</>}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Unchecked groups */}
            {uncheckedBarcodes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Ej kontrollerade grupper ({uncheckedBarcodes.length})
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {uncheckedBarcodes.map(barcode => {
                    const tools = scopedTools.filter(t => t.barcode === barcode);
                    const { name, location, count } = getGroupLabel(tools);
                    return (
                      <div key={barcode} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                        <div>
                          <span className="text-gray-900 font-medium">{name}</span>
                          {location && <span className="text-gray-400 ml-1">· {location}</span>}
                        </div>
                        <span className="text-xs text-gray-400">{count} st · <span className="font-mono">{barcode}</span></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Finish button */}
            <Button
              onClick={handleFinish}
              disabled={finishing}
              variant="outline"
              className="w-full"
            >
              {finishing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar rapport...</> : 'Avsluta & spara inventeringsrapport'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}