import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Camera, Check, Loader2, Search, Package, MapPin, Trash2, X,
} from 'lucide-react';

export default function CheckoutModal({ isOpen, onClose, items }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1: info, 2: scan items, 3: confirm
  const [project, setProject] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [listSearch, setListSearch] = useState('');
  const [showList, setShowList] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      // Create checkout report
      const reportData = {
        project,
        recipient_first_name: firstName,
        recipient_last_name: lastName,
        checked_out_items: checkoutItems.map(item => ({
          id: item.id,
          name: item.name,
          subcategory: item.subcategory,
          quantity: item.checkoutQty,
        })),
        checked_out_date: new Date().toISOString(),
      };
      
      await base44.entities.CheckoutReport.create(reportData);
      
      // Update inventory quantities
      await Promise.all(updates.map(({ id, quantity }) =>
        base44.entities.ArbetskläderUtrustning.update(id, { quantity })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arbetskläder'] });
      handleClose();
    },
  });

  useEffect(() => {
    if (!scannerActive || !isOpen) return;
    const scanner = new Html5QrcodeScanner("checkout-scanner", { 
      fps: 10, 
      qrbox: { width: 350, height: 150 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ]
    }, false);
    scanner.render(
      (text) => { handleScan(text); scanner.clear(); setScannerActive(false); },
      () => {}
    );
    return () => { scanner.clear().catch(() => {}); };
  }, [scannerActive, isOpen]);

  const handleScan = (barcode) => {
    const item = items.find(i => i.barcode === barcode);
    if (item) {
      const existing = checkoutItems.find(c => c.id === item.id);
      if (existing) {
        setCheckoutItems(checkoutItems.map(c =>
          c.id === item.id ? { ...c, checkoutQty: c.checkoutQty + 1 } : c
        ));
      } else {
        setCheckoutItems([...checkoutItems, { ...item, checkoutQty: 1 }]);
      }
    } else {
      alert(`Inget föremål hittades med streckkod: ${barcode}`);
    }
  };

  const canProceedStep1 = project.trim() && firstName.trim() && lastName.trim();

  const handleClose = () => {
    setStep(1);
    setProject('');
    setFirstName('');
    setLastName('');
    setScannerActive(false);
    setManualBarcode('');
    setCheckoutItems([]);
    setListSearch('');
    setShowList(false);
    onClose();
  };

  const addItemFromList = (item) => {
    const existing = checkoutItems.find(c => c.id === item.id);
    if (existing) {
      setCheckoutItems(checkoutItems.map(c =>
        c.id === item.id ? { ...c, checkoutQty: c.checkoutQty + 1 } : c
      ));
    } else {
      setCheckoutItems([...checkoutItems, { ...item, checkoutQty: 1 }]);
    }
  };

  const filteredListItems = items.filter(i => {
    if (!listSearch.trim()) return true;
    const q = listSearch.toLowerCase();
    return (
      i.name?.toLowerCase().includes(q) ||
      i.subcategory?.toLowerCase().includes(q) ||
      i.barcode?.toLowerCase().includes(q) ||
      i.manufacturer?.toLowerCase().includes(q)
    );
  });

  const removeItem = (id) => {
    setCheckoutItems(checkoutItems.filter(i => i.id !== id));
  };

  const updateQty = (id, qty) => {
    if (qty <= 0) {
      removeItem(id);
    } else {
      setCheckoutItems(checkoutItems.map(i => 
        i.id === id ? { ...i, checkoutQty: qty } : i
      ));
    }
  };

  const handleConfirm = async () => {
    const updates = checkoutItems.map(item => ({
      id: item.id,
      quantity: (item.quantity || 0) - item.checkoutQty,
    }));
    await updateMutation.mutateAsync(updates);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Plocka ut arbetskläder</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Projektnummer</Label>
              <Input placeholder="T.ex. PRJ-2024-001" value={project} onChange={e => setProject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Förnamn mottagare</Label>
              <Input placeholder="T.ex. Anders" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Efternamn mottagare</Label>
              <Input placeholder="T.ex. Andersson" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">Avbryt</Button>
              <Button 
                onClick={() => setStep(2)} 
                disabled={!canProceedStep1}
                className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                Nästa
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-900">Mottagare: {firstName} {lastName}</p>
              <p className="text-blue-800">Projekt: {project}</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold mb-4">Skanna eller sök kläder</h3>
              {!scannerActive ? (
                <div className="space-y-4">
                  <Button onClick={() => setScannerActive(true)} className="w-full bg-[#8B1E1E] hover:bg-[#6B1515] h-12" size="lg">
                    <Camera className="w-5 h-5 mr-2" />Starta kameraskanner
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-500">ELLER</span></div>
                  </div>
                  <div className="flex gap-2">
                   <Input placeholder="Ange streckkod manuellt" value={manualBarcode}
                     onChange={e => setManualBarcode(e.target.value)}
                     onKeyPress={e => e.key === 'Enter' && (handleScan(manualBarcode), setManualBarcode(''))} />
                   <Button onClick={() => { handleScan(manualBarcode); setManualBarcode(''); }} disabled={!manualBarcode}>
                     <Search className="w-4 h-4" />
                   </Button>
                  </div>
                  <div className="relative">
                   <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                   <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-500">ELLER</span></div>
                  </div>
                  <Button onClick={() => setShowList(!showList)} variant="outline" className="w-full">
                   <Package className="w-4 h-4 mr-2" />{showList ? 'Dölj lista' : 'Välj från lista'}
                  </Button>
                  {showList && (
                   <div className="space-y-2">
                     <Input
                       placeholder="Filtrera namn, kategori, streckkod..."
                       value={listSearch}
                       onChange={e => setListSearch(e.target.value)}
                     />
                     <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                       {filteredListItems.length === 0 ? (
                         <p className="text-sm text-gray-400 text-center py-4">Inga artiklar hittades</p>
                       ) : (
                         filteredListItems.map(item => {
                           const alreadyAdded = checkoutItems.find(c => c.id === item.id);
                           return (
                             <div
                               key={item.id}
                               onClick={() => addItemFromList(item)}
                               className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                             >
                               <div className="min-w-0 flex-1">
                                 <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                                 <p className="text-xs text-gray-500 truncate">{item.subcategory}{item.size ? ` • ${item.size}` : ''} • Lager: {item.quantity ?? 0}</p>
                               </div>
                               {alreadyAdded ? (
                                 <Badge className="shrink-0 ml-2 bg-emerald-100 text-emerald-700">{alreadyAdded.checkoutQty} st</Badge>
                               ) : (
                                 <span className="text-xs text-[#8B1E1E] font-medium shrink-0 ml-2">+ Lägg till</span>
                               )}
                             </div>
                           );
                         })
                       )}
                     </div>
                   </div>
                  )}
                  </div>
              ) : (
                <div className="space-y-4">
                  <div id="checkout-scanner" className="rounded-lg overflow-hidden" />
                  <Button onClick={() => setScannerActive(false)} variant="outline" className="w-full">Avbryt skanning</Button>
                </div>
              )}
            </div>

            {checkoutItems.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Utplockade föremål ({checkoutItems.length})</h3>
                <div className="space-y-2">
                  {checkoutItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.subcategory}{item.size && ` • Storlek: ${item.size}`} • Tillgängligt: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="1" 
                          value={item.checkoutQty}
                          onChange={e => updateQty(item.id, parseInt(e.target.value))}
                          className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                        <button onClick={() => removeItem(item.id)} className="p-1 hover:bg-gray-200 rounded">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Tillbaka</Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={checkoutItems.length === 0}
                className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                Bekräfta
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-900">Mottagare: {firstName} {lastName}</p>
              <p className="text-blue-800">Projekt: {project}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Sammanfattning</h3>
              <div className="border rounded-lg divide-y">
                {checkoutItems.map(item => (
                  <div key={item.id} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.subcategory}{item.size && ` • Storlek: ${item.size}`}</p>
                    </div>
                    <Badge variant="outline">{item.checkoutQty} st</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Tillbaka</Button>
              <Button 
                onClick={handleConfirm}
                disabled={updateMutation.isPending}
                className="flex-1 bg-[#8B1E1E] hover:bg-[#6B1515]"
              >
                {updateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sparar...</> : <><Check className="w-4 h-4 mr-2" />Bekräfta utplockering</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}