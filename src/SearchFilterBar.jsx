import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, Search, Package, MapPin, Loader2, AlertTriangle, BarChart2, X } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from '@tanstack/react-query';
import { useBarcodeCamera } from "@/hooks/useBarcodeCamera";
import ScannerOverlay from "@/components/ScannerOverlay";
import TorchButton from "@/components/ui/TorchButton";

export default function ToolScanModal({ isOpen, onClose, tools }) {
  const queryClient = useQueryClient();
  const [scannerActive, setScannerActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scannedList, setScannedList] = useState([]); // { tool, status, condition, saved }
  const [notFoundCode, setNotFoundCode] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setScannerActive(false);
      setManualBarcode('');
      setScannedList([]);
      setNotFoundCode(null);
    }
  }, [isOpen]);

  const handleScan = useCallback((barcode) => {
    setNotFoundCode(null);
    // Skip if already in scanned list
    if (scannedList.some(s => s.tool.barcode === barcode)) return;

    const tool = tools.find(t => t.barcode === barcode);
    if (tool) {
      setScannedList(prev => [{
        tool,
        status: tool.status || 'available',
        condition: tool.condition || 'good',
        saved: false,
        saving: false,
      }, ...prev]);
    } else {
      setNotFoundCode(barcode);
    }
  }, [tools, scannedList]);

  // Camera stays active — no setScannerActive(false) on scan
  const { torchOn, torchSupported, toggleTorch } = useBarcodeCamera("tool-barcode-scanner", scannerActive, handleScan);

  const handleManualSearch = () => {
    if (!manualBarcode.trim()) return;
    handleScan(manualBarcode.trim());
    setManualBarcode('');
  };

  const handleSaveItem = async (index) => {
    const item = scannedList[index];
    if (!item || item.saved) return;
    setScannedList(prev => prev.map((s, i) => i === index ? { ...s, saving: true } : s));
    await base44.entities.Tool.update(item.tool.id, {
      status: item.status,
      condition: item.condition,
      last_seen_date: new Date().toISOString(),
    });
    setScannedList(prev => prev.map((s, i) => i === index ? { ...s, saving: false, saved: true } : s));
    queryClient.invalidateQueries(['tools']);
  };

  const handleSaveAll = async () => {
    const unsaved = scannedList.filter(s => !s.saved);
    await Promise.all(unsaved.map((item, _) => {
      const idx = scannedList.indexOf(item);
      return handleSaveItem(idx);
    }));
  };

  const updateItem = (index, field, value) => {
    setScannedList(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeItem = (index) => {
    setScannedList(prev => prev.filter((_, i) => i !== index));
  };

  const savedCount = scannedList.filter(s => s.saved).length;
  const totalWithBarcode = tools.filter(t => t.barcode).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#8B1E1E]" />
            Inventera maskiner
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between text-sm">
          <span className="text-gray-600">Kontrollerade</span>
          <span className="font-bold text-[#8B1E1E]">{savedCount} / {totalWithBarcode}</span>
        </div>

        {/* Camera — always visible when active */}
        <div className="space-y-3">
          {!scannerActive ? (
            <div className="flex gap-2">
              <Button
                onClick={() => setScannerActive(true)}
                className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515] h-10"
              >
                <Camera className="w-5 h-5 mr-2" />
                Kamera
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
                <div id="tool-barcode-scanner" className="rounded-xl overflow-hidden bg-black" style={{ minHeight: '250px' }} />
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
                <Button onClick={() => setScannerActive(false)} variant="outline" size="sm">
                  Stäng
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Not found */}
        {notFoundCode && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Ingen maskin med streckkod: <span className="font-mono">{notFoundCode}</span>
          </div>
        )}

        {/* Scanned list */}
        {scannedList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Skannade ({scannedList.length})</p>
              {scannedList.some(s => !s.saved) && (
                <Button size="sm" onClick={handleSaveAll} className="bg-[#8B1E1E] hover:bg-[#6B1515] h-8 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Spara alla
                </Button>
              )}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {scannedList.map((item, idx) => (
                <div key={item.tool.id} className={`rounded-xl border p-3 space-y-2 ${item.saved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      {item.tool.image_url
                        ? <img src={item.tool.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                        : <Package className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{item.tool.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.tool.manufacturer}{item.tool.location_name ? ` · ${item.tool.location_name}` : ''}
                      </p>
                    </div>
                    {item.saved ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">Sparad</Badge>
                    ) : (
                      <div className="flex items-center gap-1">
                        {item.saving ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeItem(idx)}>
                              <X className="w-3.5 h-3.5 text-gray-400" />
                            </Button>
                            <Button size="sm" className="h-7 bg-[#8B1E1E] hover:bg-[#6B1515] text-xs px-2" onClick={() => handleSaveItem(idx)}>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {!item.saved && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={item.status}
                        onChange={e => updateItem(idx, 'status', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                      >
                        <option value="available">Tillgänglig</option>
                        <option value="in_use">I bruk</option>
                        <option value="i_lager">I lager</option>
                        <option value="maintenance">Underhåll</option>
                        <option value="missing">Saknas</option>
                        <option value="retired">Kasserad</option>
                      </select>
                      <select
                        value={item.condition}
                        onChange={e => updateItem(idx, 'condition', e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                      >
                        <option value="new">Ny</option>
                        <option value="good">Bra</option>
                        <option value="fair">Okej</option>
                        <option value="poor">Dålig</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}