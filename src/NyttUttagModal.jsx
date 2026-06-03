import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScanLine, Search, X, Package, MapPin, ArrowRight } from 'lucide-react';
import { useBarcodeCamera } from '@/hooks/useBarcodeCamera';
import ScannerOverlay from '@/components/ScannerOverlay';
import TorchButton from '@/components/ui/TorchButton';

export default function DashboardScanSearch({ tools, onSelectTool }) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [scanResult, setScanResult] = useState(null);

  const handleScan = useCallback((code) => {
    setScanning(false);
    const found = tools.find(
      t => t.barcode === code || t.serial_number === code || t.tool_number === code
    );
    if (found) {
      setScanResult(found);
    } else {
      setSearchText(code);
      setScanResult(null);
    }
  }, [tools]);

  const { torchOn, torchSupported, toggleTorch } = useBarcodeCamera('dashboard-scanner', scanning, handleScan);

  const filteredTools = searchText.trim().length >= 2
    ? tools.filter(t => {
        const q = searchText.toLowerCase();
        return (
          t.name?.toLowerCase().includes(q) ||
          t.manufacturer?.toLowerCase().includes(q) ||
          t.model_number?.toLowerCase().includes(q) ||
          t.serial_number?.toLowerCase().includes(q) ||
          t.tool_number?.toLowerCase().includes(q) ||
          t.barcode?.toLowerCase().includes(q)
        );
      }).slice(0, 10)
    : [];

  const handleClose = () => {
    setOpen(false);
    setScanning(false);
    setSearchText('');
    setScanResult(null);
  };

  const handleSelect = (tool) => {
    handleClose();
    onSelectTool(tool);
  };

  return (
    <>
      <Button
         onClick={() => setOpen(true)}
         size="sm"
         variant="outline"
         className="sm:gap-1"
       >
         <ScanLine className="w-4 h-4" />
         <span className="hidden sm:inline">Sök maskin</span>
       </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sök maskin</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setScanResult(null); }}
                placeholder="Sök namn, serienr, streckkod..."
                className="pl-10 pr-10"
                autoFocus
              />
              {searchText && (
                <button onClick={() => { setSearchText(''); setScanResult(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Scan button */}
            <Button
              onClick={() => { setScanning(!scanning); setScanResult(null); }}
              variant={scanning ? 'default' : 'outline'}
              className="w-full gap-2"
            >
              <ScanLine className="w-4 h-4" />
              {scanning ? 'Stäng kamera' : 'Skanna QR-kod / streckkod'}
            </Button>

            {/* Camera */}
            {scanning && (
              <div className="space-y-2">
                <div className="relative">
                  <div
                    id="dashboard-scanner"
                    className="rounded-xl overflow-hidden border border-gray-200"
                  />
                  <ScannerOverlay />
                </div>
                <div className="flex justify-end">
                  <TorchButton torchOn={torchOn} torchSupported={torchSupported} toggleTorch={toggleTorch} />
                </div>
              </div>
            )}

            {/* Scan result */}
            {scanResult && (
              <div
                onClick={() => handleSelect(scanResult)}
                className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {scanResult.image_url ? (
                    <img src={scanResult.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center">
                      <Package className="w-6 h-6 text-emerald-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{scanResult.name}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {scanResult.manufacturer}{scanResult.model_number ? ` · ${scanResult.model_number}` : ''}
                    </p>
                    {scanResult.location_name && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {scanResult.location_name}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>
              </div>
            )}

            {/* Search results */}
            {!scanResult && filteredTools.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTools.map(tool => (
                  <div
                    key={tool.id}
                    onClick={() => handleSelect(tool)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  >
                    {tool.image_url ? (
                      <img src={tool.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">{tool.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {tool.manufacturer}{tool.serial_number ? ` · ${tool.serial_number}` : ''}
                      </p>
                    </div>
                    {tool.location_name && (
                      <span className="text-xs text-gray-400 shrink-0 max-w-[80px] truncate">{tool.location_name}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!scanResult && searchText.trim().length >= 2 && filteredTools.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-4">Inga maskiner hittades</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}