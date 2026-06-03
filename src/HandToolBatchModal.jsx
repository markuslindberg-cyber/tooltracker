import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBarcodeCamera } from "@/hooks/useBarcodeCamera";
import ScannerOverlay from "@/components/ScannerOverlay";
import TorchButton from "@/components/ui/TorchButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
  Camera, CheckCircle2, Loader2, Search, Package, MapPin, X,
} from 'lucide-react';

export default function ArbetskläderScanModal({ isOpen, onClose, items, onRefresh }) {
  const queryClient = useQueryClient();
  const [scannerActive, setScannerActive] = useState(false);
  const [scannedItem, setScannedItem] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [tempStatus, setTempStatus] = useState('');
  const [tempCondition, setTempCondition] = useState('');

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => 
      base44.entities.ArbetskläderUtrustning.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arbetskläder'] });
      onRefresh();
    },
  });

  const { torchOn, torchSupported, toggleTorch } = useBarcodeCamera("barcode-scanner", scannerActive && isOpen, (barcode) => {
    handleScan(barcode);
  });

  const handleScan = (barcode) => {
    setManualBarcode(barcode);
    const item = items.find(i => i.barcode === barcode);
    if (item) {
      setScannedItem(item);
      setTempStatus(item.status);
      setTempCondition(item.condition);
    } else {
      alert(`Inget föremål hittades med streckkod: ${barcode}`);
    }
  };

  const handleConfirm = async () => {
    if (!scannedItem) return;
    const updates = {};
    if (tempStatus !== scannedItem.status) updates.status = tempStatus;
    if (tempCondition !== scannedItem.condition) updates.condition = tempCondition;
    updates.last_seen_date = new Date().toISOString();
    await updateMutation.mutateAsync({ id: scannedItem.id, data: updates });
    setScannedItem(null);
  };

  const handleClose = () => {
    setScannerActive(false);
    setScannedItem(null);
    setManualBarcode('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inventera arbetskläder</DialogTitle>
        </DialogHeader>

        {!scannedItem ? (
          <div className="space-y-4">
            {!scannerActive ? (
               <div className="flex gap-2">
                 <Button onClick={() => setScannerActive(true)} className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515] h-10">
                   <Camera className="w-5 h-5 mr-2" />Kamera
                 </Button>
                 <div className="flex-1 flex gap-1">
                   <Input placeholder="Streckkod" value={manualBarcode}
                     onChange={e => setManualBarcode(e.target.value)}
                     onKeyPress={e => e.key === 'Enter' && (handleScan(manualBarcode), setManualBarcode(''))}
                     className="text-sm"
                   />
                   <Button onClick={() => { handleScan(manualBarcode); setManualBarcode(''); }} disabled={!manualBarcode} size="sm">
                     <Search className="w-4 h-4" />
                   </Button>
                 </div>
               </div>
             ) : (
               <div className="space-y-2">
                 <div className="relative">
                   <div id="barcode-scanner" className="rounded-xl overflow-hidden bg-black" style={{ minHeight: '250px' }} />
                   <ScannerOverlay />
                 </div>
                 <div className="flex gap-2">
                   <div className="flex-1 flex gap-1">
                     <Input placeholder="Manuell streckkod" value={manualBarcode}
                       onChange={e => setManualBarcode(e.target.value)}
                       onKeyPress={e => e.key === 'Enter' && (handleScan(manualBarcode), setManualBarcode(''))}
                       className="text-sm"
                     />
                     <Button onClick={() => { handleScan(manualBarcode); setManualBarcode(''); }} disabled={!manualBarcode} size="sm">
                       <Search className="w-4 h-4" />
                     </Button>
                   </div>
                   <TorchButton torchOn={torchOn} torchSupported={torchSupported} toggleTorch={toggleTorch} />
                   <Button onClick={() => setScannerActive(false)} variant="outline" size="sm">Stäng</Button>
                 </div>
               </div>
             )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scanned item */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  {scannedItem.image_url
                    ? <img src={scannedItem.image_url} alt={scannedItem.name} className="w-full h-full object-cover rounded-lg" />
                    : <Package className="w-8 h-8 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{scannedItem.name}</h3>
                  <p className="text-sm text-gray-500">{scannedItem.subcategory}</p>
                  {scannedItem.location_name && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4" />{scannedItem.location_name}
                    </div>
                  )}
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={tempStatus} onValueChange={setTempStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="i_lager">I lager</SelectItem>
                      <SelectItem value="i_bruk">I bruk</SelectItem>
                      <SelectItem value="saknas">Saknas</SelectItem>
                      <SelectItem value="kasserad">Kasserad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Skick</Label>
                  <Select value={tempCondition} onValueChange={setTempCondition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ny">Ny</SelectItem>
                      <SelectItem value="bra">Bra</SelectItem>
                      <SelectItem value="okej">Okej</SelectItem>
                      <SelectItem value="dålig">Dålig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={() => setScannedItem(null)} variant="outline" className="flex-1">Avbryt</Button>
                <Button onClick={handleConfirm} className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Bekräfta</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose}>Stäng</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}