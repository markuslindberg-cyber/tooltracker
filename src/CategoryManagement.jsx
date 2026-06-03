import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Check, X, AlertCircle, Barcode, ChevronRight, ChevronDown, Clock, Plus, Ban } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function ArbetskladerBegaranAttGodkanna() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [step, setStep] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [user, setUser] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedRequest && step === 3) {
      const saved = localStorage.getItem(`scanned_workwear_${selectedRequest.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setScannedItems(parsed);
        } catch (e) {}
      }
    }
  }, [selectedRequest, step]);

  useEffect(() => {
    if (selectedRequest && step === 3 && scannedItems.length > 0) {
      localStorage.setItem(`scanned_workwear_${selectedRequest.id}`, JSON.stringify(scannedItems));
    }
  }, [scannedItems, selectedRequest, step]);

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['workwearRequests'],
    queryFn: () => base44.entities.WorkwearRequest.list('-request_date', 10000),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['arbetskläderUtrustning'],
    queryFn: () => base44.entities.ArbetskläderUtrustning.list(null, 10000).catch(() => []),
  });

  const pendingRequests = allRequests.filter(r => r.status === 'pending');
  const historyRequests = allRequests.filter(r => ['approved', 'rejected', 'completed'].includes(r.status));

  const approveMutation = useMutation({
    mutationFn: (requestId) =>
      base44.entities.WorkwearRequest.update(requestId, {
        status: 'approved',
        approved_by_email: user?.email,
        approved_by_name: user?.full_name,
        approved_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workwearRequests']);
      setStep(3);
      setScannedItems([]);
      setBarcodeInput('');
      setError('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId) =>
      base44.entities.WorkwearRequest.update(requestId, {
        status: 'rejected',
        notes: rejectNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workwearRequests']);
      setSelectedRequest(null);
      setRejectNotes('');
      setStep(1);
    },
  });

  const createCheckoutMutation = useMutation({
    mutationFn: async (data) => {
      // Uppdatera lagret för varje artikel
      for (const item of data.checked_out_items) {
        const artikel = allItems.find(a => a.id === item.item_id);
        if (artikel) {
          const newQuantity = (artikel.quantity || 0) - item.scanned_quantity;
          await base44.entities.ArbetskläderUtrustning.update(item.item_id, { 
            quantity: Math.max(0, newQuantity) 
          });
        }
      }
      
      // Skapa checkout-post
      const checkout = await base44.entities.LokalvardCheckout.create(data);
      await base44.entities.WorkwearRequest.update(selectedRequest.id, { status: 'completed' });
      return checkout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workwearRequests']);
      queryClient.invalidateQueries(['arbetskläderUtrustning']);
      setSuccess('Uttag registrerat!');
      setTimeout(() => {
        setSuccess('');
        setSelectedRequest(null);
        setScannedItems([]);
        setStep(1);
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || 'Fel vid registrering av uttag');
    },
  });

  const handleBarcodeInput = (barcode) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    const item = allItems.find(i => 
      i.barcode === trimmed || 
      i.name === trimmed
    );

    if (!item) {
      setError(`Artikel ${trimmed} hittades inte i lagret`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const requestedItem = selectedRequest?.requested_items.find(ri => 
      ri.id === item.id || 
      ri.name === item.name
    );

    if (!requestedItem) {
      setError(`${item.name} är inte på begäran`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newScannedItem = {
      item_id: item.id,
      name: item.name,
      barcode: item.barcode,
      subcategory: item.subcategory || '',
      size: item.size || '',
      quantity: requestedItem.quantity,
      scanned_quantity: 1,
    };

    const existingScanned = scannedItems.find(si => si.item_id === item.id);
    if (existingScanned) {
      const newQty = existingScanned.scanned_quantity + 1;
      if (newQty > requestedItem.quantity) {
        setError(`Kan inte ta ut mer än ${requestedItem.quantity} st`);
        setTimeout(() => setError(''), 3000);
        setBarcodeInput('');
        return;
      }
      setScannedItems(prev =>
        prev.map(si => si.item_id === item.id
          ? { ...si, scanned_quantity: newQty }
          : si
        )
      );
    } else {
      setScannedItems(prev => [...prev, newScannedItem]);
    }

    setBarcodeInput('');
    setError('');
    setTimeout(() => barcodeInputRef.current?.focus(), 0);
  };

  const handleCheckoutSubmit = () => {
    if (!selectedRequest || scannedItems.length === 0) {
      setError('Skanna minst en artikel');
      return;
    }

    createCheckoutMutation.mutate({
      request_id: selectedRequest.id,
      customer_id: selectedRequest.customer_id,
      customer_name: selectedRequest.customer_name,
      checked_out_items: scannedItems,
      checked_out_date: new Date().toISOString(),
      checked_out_by_email: user?.email || '',
      checked_out_by_name: user?.full_name || '',
    });
  };

  const StepIndicator = () => (
    <div className="flex items-center gap-1 sm:gap-2 mb-6 overflow-x-auto">
      {[{ n: 1, label: 'Välj' }, { n: 2, label: 'Granska' }, { n: 3, label: 'Uttag' }].map(({ n, label }, i) => (
        <React.Fragment key={n}>
          <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
            step === n ? 'bg-[#8B1E1E] text-white' : step > n ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {step > n ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span>{n}</span>}
            {label}
          </div>
          {i < 2 && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );

  const statusBadge = (status) => {
    const map = {
      pending:   { label: 'Väntande',   cls: 'bg-yellow-100 text-yellow-800' },
      approved:  { label: 'Godkänd',    cls: 'bg-blue-100 text-blue-800' },
      rejected:  { label: 'Nekad',      cls: 'bg-red-100 text-red-700' },
      completed: { label: 'Utförd',     cls: 'bg-green-100 text-green-700' },
    };
    const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
  };

  // Bara admin_lokalvård och ägare får se denna sida
  const allowedRoles = ['admin_lokalvård', 'ägare', 'admin'];
  if (user && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center py-20">
        <Ban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-600">Du har inte behörighet att se denna sida</p>
        <p className="text-sm text-gray-400 mt-1">Kontakta din Admin Lokalvård</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-3xl font-bold dark:text-gray-100">Begäran – Arbetskläder</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Granska, godkänn och registrera uttag</p>
      </div>

      {step === 1 && (
        <div className="flex gap-1 border-b dark:border-gray-800">
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'pending' ? 'border-[#8B1E1E] text-[#8B1E1E]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            Väntande {pendingRequests.length > 0 && <span className="ml-1 bg-[#8B1E1E] text-white text-xs rounded-full px-1.5">{pendingRequests.length}</span>}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'history' ? 'border-[#8B1E1E] text-[#8B1E1E]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            Historik
          </button>
        </div>
      )}

      {step !== 1 && <StepIndicator />}

      {step === 1 && tab === 'pending' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">Inga väntande begäranden</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() => { setSelectedRequest(request); setRejectNotes(''); setStep(2); }}
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-[#8B1E1E] hover:bg-[#8B1E1E]/5 bg-white dark:bg-gray-900 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {request.request_number ? `#${request.request_number} — ` : ''}{request.customer_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {request.requested_items?.length} artikel(r) • Begärd av: {request.requested_by_name || request.requested_by_email}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {format(new Date(request.request_date), 'dd MMM HH:mm', { locale: sv })}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 1 && tab === 'history' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : historyRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Ingen historik ännu</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {historyRequests.map((request) => (
                <div key={request.id} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                  <button
                    onClick={() => setExpandedHistory(expandedHistory === request.id ? null : request.id)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {statusBadge(request.status)}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {request.request_number ? `#${request.request_number} — ` : ''}{request.customer_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {request.projektnummer && <span>{request.projektnummer} • </span>}{request.requested_items?.length} artikel(r) • {format(new Date(request.request_date), 'dd MMM yyyy', { locale: sv })}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedHistory === request.id ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedHistory === request.id && (
                    <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">Artiklar</p>
                        <div className="space-y-1">
                          {request.requested_items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm p-2 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-700">
                              <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                              <span className="font-medium text-gray-600 dark:text-gray-400">{item.quantity} st</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {step === 2 && selectedRequest && (
        <Card className="p-6 space-y-6">
          <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Tillbaka</button>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Begäran detaljer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Person</p>
                <p className="font-semibold">{selectedRequest.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Begärd av</p>
                <p className="font-semibold">{selectedRequest.requested_by_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Datum</p>
                <p className="font-semibold">{format(new Date(selectedRequest.request_date), 'dd MMMM yyyy HH:mm', { locale: sv })}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Begärda artiklar</h3>
            <div className="space-y-2">
              {selectedRequest.requested_items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium dark:text-gray-100">{item.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.subcategory}{item.size ? ` • Stl: ${item.size}` : ''}</p>
                  </div>
                  <p className="font-semibold">{item.quantity} st</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Anteckningar vid avslag (valfritt)</label>
              <Textarea
                placeholder="Förklara varför begäran avslås..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => approveMutation.mutate(selectedRequest.id)}
                disabled={approveMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-base"
              >
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Godkänn & Gå till uttag
              </Button>
              <Button
                onClick={() => rejectMutation.mutate(selectedRequest.id)}
                disabled={rejectMutation.isPending}
                variant="outline"
                className="flex-1 text-red-600 hover:bg-red-50 border-red-200 h-12 text-base"
              >
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                Avslå
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && selectedRequest && (
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Skanna uttag</h2>
            <p className="text-sm text-gray-600">{selectedRequest.customer_name}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Begärda artiklar</h3>
            <div className="space-y-2">
              {selectedRequest.requested_items?.map((item) => {
                const scanned = scannedItems.find(si => si.item_id === item.id || si.name === item.name);
                const isComplete = scanned && scanned.scanned_quantity >= item.quantity;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    isComplete ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div>
                      <p className="font-medium dark:text-gray-100">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.subcategory}{item.size ? ` • Stl: ${item.size}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{scanned?.scanned_quantity || 0}/{item.quantity}</p>
                      {isComplete && <Check className="w-5 h-5 text-green-600" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <Label className="flex items-center gap-2">
              <Barcode className="w-4 h-4" />
              Skanna streckkod
            </Label>
            <Input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scanna streckkod här..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && barcodeInput.trim()) handleBarcodeInput(barcodeInput); }}
              autoFocus
              className="text-lg"
            />
          </div>

          {scannedItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold">Skannade artiklar</h4>
              {scannedItems.map(item => (
                <div key={item.item_id} className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">{item.name}</p>
                    <p className="text-sm text-blue-700">{item.subcategory}{item.size ? ` • Stl: ${item.size}` : ''} • Antal: {item.scanned_quantity}/{item.quantity}</p>
                  </div>
                  <button onClick={() => setScannedItems(prev => prev.filter(si => si.item_id !== item.item_id))} className="text-red-500 hover:text-red-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <Check className="w-4 h-4" />{success}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
            <Button
              onClick={handleCheckoutSubmit}
              disabled={createCheckoutMutation.isPending || scannedItems.length === 0}
              className="bg-[#8B1E1E] hover:bg-[#6B1515] h-12 text-base"
            >
              {createCheckoutMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Registrera uttag
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { 
                localStorage.setItem(`scanned_workwear_${selectedRequest.id}`, JSON.stringify(scannedItems));
                setSelectedRequest(null); 
                setScannedItems([]); 
                setStep(1);
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 h-12 text-base"
            >
              Pausa (sparad)
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { 
                localStorage.removeItem(`scanned_workwear_${selectedRequest.id}`);
                setSelectedRequest(null); 
                setScannedItems([]); 
                setStep(1); 
              }}
              className="h-12 text-base"
            >
              Avbryt & rensa
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}