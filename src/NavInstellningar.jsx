import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Barcode, X, Check, AlertCircle, Mail } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MobileSelect from '@/components/ui/mobile-select';

export default function LokalvardNyttUttag() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
   const [selectedRequest, setSelectedRequest] = useState(null);
   const [scannedItems, setScannedItems] = useState([]);
   const [barcodeInput, setBarcodeInput] = useState('');
   const [error, setError] = useState('');
   const [success, setSuccess] = useState('');
   const [notifyPersonal, setNotifyPersonal] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: approvedRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['approvedLokalvardRequests'],
    queryFn: async () => {
      const requests = await base44.entities.LokalvardArtikelRequest.list('-request_date', 10000);
      return requests.filter(r => r.status === 'approved');
    },
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['lokalvardArtiklar'],
    queryFn: () => base44.entities.LokalvardsArtikel.list(null, 10000),
  });

  const { data: personal = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(null, 10000).catch(() => []),
  });

  const personalMap = useMemo(() => {
    const map = {};
    personal.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [personal]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('requestId');
    if (requestId && approvedRequests.length > 0) {
      const req = approvedRequests.find(r => r.id === requestId);
      if (req) setSelectedRequest(req);
    }
  }, [approvedRequests]);

  const createCheckoutMutation = useMutation({
    mutationFn: async (data) => {
      const { notify_personal, ...checkoutData } = data;
      const checkout = await base44.entities.LokalvardCheckout.create(checkoutData);
      // Uppdatera request status till completed
      if (selectedRequest?.id) {
        await base44.entities.LokalvardArtikelRequest.update(selectedRequest.id, { status: 'completed' });
      }
      // Skicka meddelande till personal om kryssrutan var ikryssad
      if (notify_personal && selectedRequest?.id) {
        await base44.functions.invoke('notifyCheckoutComplete', {
          request_id: selectedRequest.id,
          checked_out_items: data.checked_out_items,
          customer_name: data.customer_name,
          checked_out_by_name: data.checked_out_by_name,
          checked_out_date: data.checked_out_date,
        }).catch(err => console.error('Kunde inte skicka meddelande:', err));
      }
      return checkout;
    },
    onSuccess: () => {
      setSelectedRequest(null);
      setScannedItems([]);
      setBarcodeInput('');
      setNotifyPersonal(false);
      queryClient.invalidateQueries(['approvedLokalvardRequests']);
      setSuccess(notifyPersonal ? 'Uttag registrerat och meddelande skickat!' : 'Uttag registrerat!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Fel vid registrering av uttag');
    },
  });

  const handleBarcodeInput = (barcode) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    const item = allItems.find(i => 
      i.streckkod === trimmed || 
      i.old_streckkod === trimmed || 
      i.artikelnummer === trimmed
    );
    
    if (!item) {
      setError(`Streckkod ${trimmed} hittades inte i lagret`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const requestedItem = selectedRequest?.requested_items.find(ri => 
      ri.id === item.id || 
      ri.name === item.benamning ||
      ri.name === item.name
    );
    if (!requestedItem) {
      setError(`${item.benamning || item.name} är inte på begäran`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const existingScanned = scannedItems.find(si => si.item_id === item.id);
    if (existingScanned) {
      if (existingScanned.scanned_quantity >= requestedItem.quantity) {
        setError(`${item.benamning || item.name} är redan skannad i rätt mängd`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      setScannedItems(prev =>
        prev.map(si =>
          si.item_id === item.id
            ? { ...si, scanned_quantity: si.scanned_quantity + 1 }
            : si
        )
      );
    } else {
      setScannedItems(prev => [...prev, {
        item_id: item.id,
        name: item.benamning || item.name,
        barcode: item.streckkod,
        quantity: requestedItem.quantity,
        scanned_quantity: 1,
        replacement_items: [],
      }]);
    }
    
    setBarcodeInput('');
    setError('');
  };

  const removeScannedItem = (itemId) => {
    setScannedItems(prev => prev.filter(si => si.item_id !== itemId));
  };

  const handleSubmit = async () => {
    if (!selectedRequest || scannedItems.length === 0) {
      setError('Välj en begäran och skanna minst en artikel');
      return;
    }

    const submitData = {
      request_id: selectedRequest.id,
      customer_id: selectedRequest.customer_id,
      customer_name: selectedRequest.customer_name,
      checked_out_items: scannedItems,
      checked_out_date: new Date().toISOString(),
      checked_out_by_email: user?.email || '',
      checked_out_by_name: personalMap[user?.id] || user?.full_name || '',
      requested_by_name: selectedRequest.requested_by_name || '',
      notify_personal: notifyPersonal,
    };

    createCheckoutMutation.mutate(submitData);
  };



  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Skanna uttag – Lokalvård</h1>
        <p className="text-gray-600 mt-2">Välja godkänd begäran och skanna artiklar via streckkod</p>
      </div>

      {/* Request Selection */}
      <Card className="p-6 space-y-4 dark:bg-gray-900 dark:border-gray-800">
        <div className="space-y-2">
          <Label className="dark:text-gray-100">Välj begäran att utföra *</Label>
          {loadingRequests ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Laddar begäranden...
            </div>
          ) : (
           <MobileSelect
             value={selectedRequest?.id || ''}
             onChange={(id) => {
               const request = approvedRequests.find(r => r.id === id);
               setSelectedRequest(request);
               setScannedItems([]);
               setBarcodeInput('');
               setError('');
             }}
             options={approvedRequests.map(request => ({
               value: request.id,
               label: `${request.customer_name} - ${request.requested_items.length} artikel(r)`
             }))}
             placeholder="Sök och välj godkänd begäran..."
           />
          )}
        </div>
      </Card>

      {selectedRequest && (
        <Card className="p-6 space-y-6 dark:bg-gray-900 dark:border-gray-800">
          {/* Begärad items info */}
          <div>
            <h3 className="font-semibold text-lg mb-3 dark:text-gray-100">Begärda artiklar</h3>
            <div className="space-y-2">
              {selectedRequest.requested_items.map((item) => {
                const scanned = scannedItems.find(si => si.item_id === item.id);
                const isComplete = scanned && scanned.scanned_quantity >= item.quantity;
                
                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    isComplete ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div>
                         <p className="font-medium dark:text-gray-100">{item.name}</p>
                         <p className="text-sm text-gray-600 dark:text-gray-400">{item.subcategory}</p>
                       </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {scanned?.scanned_quantity || 0}/{item.quantity}
                      </p>
                      {isComplete && (
                        <Check className="w-5 h-5 text-green-600 ml-auto" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Barcode Scanner */}
          <div className="border-t dark:border-gray-700 pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 dark:text-gray-100">
                <Barcode className="w-4 h-4" />
                Skanna streckkod
              </Label>
              <Input
               type="text"
               placeholder="Scanna streckkod här..."
               value={barcodeInput}
               onChange={(e) => setBarcodeInput(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   handleBarcodeInput(barcodeInput);
                 }
               }}
               autoFocus
               className="text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Scanned Items */}
            {scannedItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold dark:text-gray-100">Skannde artiklar</h4>
                <div className="space-y-2">
                  {scannedItems.map(item => (
                    <div key={item.item_id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">{item.name}</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Streckkod: {item.barcode} • Antal: {item.scanned_quantity}/{item.quantity}</p>
                      </div>
                      <button
                        onClick={() => removeScannedItem(item.item_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Kryssruta: meddela personal */}
          <div className="flex items-center gap-3 pt-4 border-t dark:border-gray-700">
            <Checkbox
              id="notifyPersonalNyttUttag"
              checked={notifyPersonal}
              onCheckedChange={(checked) => setNotifyPersonal(!!checked)}
            />
            <label htmlFor="notifyPersonalNyttUttag" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              Meddela personal att begäran är klar för upphämtning
            </label>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={createCheckoutMutation.isPending || scannedItems.length === 0}
              className="bg-[#8B1E1E] hover:bg-[#6B1515]"
            >
              {createCheckoutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrerar...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Registrera uttag
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setSelectedRequest(null);
                setScannedItems([]);
                setBarcodeInput('');
                setError('');
              }}
              variant="outline"
            >
              Avbryt
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}