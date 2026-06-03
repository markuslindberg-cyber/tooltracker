import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, X, Check, Copy, Clock, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';

export default function LokalvardRequestArtikel() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    requested_items: [],
    notes: '',
    customer_id: '',
    customer_name: '',
    ordernummer: '',
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [user, setUser] = useState(null);
  const [artikelOpen, setArtikelOpen] = useState(false);
  const [kundOpen, setKundOpen] = useState(false);
  const [kundSearch, setKundSearch] = useState('');
  const [artikelSearch, setArtikelSearch] = useState('');
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('form');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: kunder = [] } = useQuery({
    queryKey: ['kunder'],
    queryFn: async () => {
      const result = await base44.entities.Kund.list(null, 500);
      return result.filter(k => k.status === 'aktiv');
    },
  });

  const { data: artiklar = [] } = useQuery({
    queryKey: ['lokalvardArtiklar'],
    queryFn: async () => {
      const result = await base44.entities.LokalvardsArtikel.list(null, 1000);
      return result.filter(a => !a.is_deleted && !((a.current_quantity === 0 || !a.current_quantity) && a.utgaende));
    },
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myLokalvardRequests'],
    queryFn: async () => {
      const result = await base44.entities.LokalvardArtikelRequest.list(null, 100);
      return result.filter(r => r.requested_by_email === user?.email);
    },
    enabled: !!user,
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke('createLokalvardRequest', data);
      return res.data;
    },
    onSuccess: () => {
      setFormData({
        requested_items: [],
        notes: '',
        customer_id: '',
        customer_name: '',
        ordernummer: '',
      });
      setSelectedItem(null);
      setSelectedQty(1);
      queryClient.invalidateQueries(['myLokalvardRequests']);
      alert('Begäran skickad!');
    },
  });

  const addItem = () => {
    if (!selectedItem) return;
    const existingItem = formData.requested_items.find(i => i.id === selectedItem.id);
    if (existingItem) {
      setFormData(prev => ({
        ...prev,
        requested_items: prev.requested_items.map(i =>
          i.id === selectedItem.id ? { ...i, quantity: i.quantity + selectedQty } : i
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        requested_items: [...prev.requested_items, {
          id: selectedItem.id,
          name: selectedItem.benamning,
          quantity: selectedQty,
        }]
      }));
    }
    setSelectedItem(null);
    setSelectedQty(1);
  };

  const handleCopyRequest = (request) => {
    setFormData(prev => ({
      ...prev,
      requested_items: request.requested_items || [],
    }));
    setShowCopyModal(false);
  };

  const removeItem = (id) => {
    setFormData(prev => ({
      ...prev,
      requested_items: prev.requested_items.filter(i => i.id !== id)
    }));
  };

  const handleSubmit = () => {
    if (!formData.customer_id) {
      alert('Välj en kund');
      return;
    }
    if (formData.requested_items.length === 0) {
      alert('Lägg till minst en artikel');
      return;
    }

    const submitData = {
      requested_items: formData.requested_items,
      notes: formData.notes,
      customer_id: formData.customer_id,
      customer_name: formData.customer_name,
      ordernummer: formData.ordernummer || null,
      request_date: new Date().toISOString(),
      requested_by_email: user?.email || '',
      requested_by_name: user?.full_name || '',
      status: 'pending',
    };

    createRequestMutation.mutate(submitData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Begäran om uttag av lokalvårdsartiklar</h1>
        <p className="text-gray-600 mt-2">Fyll i formuläret för att göra en begäran</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('form')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'form' ? 'border-[#8B1E1E] text-[#8B1E1E]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Ny begäran
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-[#8B1E1E] text-[#8B1E1E]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Mina begäranden {myRequests.length > 0 && <span className="ml-1 bg-gray-200 text-gray-700 text-xs rounded-full px-1.5">{myRequests.length}</span>}
        </button>
      </div>

      {/* Kopiera modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Kopiera från tidigare begäran</h2>
              <button onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {myRequests.filter(r => r.requested_items?.length > 0).length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Inga tidigare begäranden hittades</p>
              ) : (
                myRequests.filter(r => r.requested_items?.length > 0).map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleCopyRequest(r)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[#8B1E1E] hover:bg-[#8B1E1E]/5 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">
                        {r.request_number && <span className="font-mono font-bold text-gray-600 mr-1">#{r.request_number}</span>}
                        {format(new Date(r.request_date), 'dd MMM yyyy', { locale: sv })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{r.requested_items?.length} artikel(r): {r.requested_items?.map(i => `${i.name} (${i.quantity}st)`).join(', ')}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {myRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Inga begäranden ännu</p>
            </Card>
          ) : (
            myRequests.map(r => {
              const statusMap = {
                pending:   { label: 'Väntande',  cls: 'bg-yellow-100 text-yellow-800' },
                approved:  { label: 'Godkänd',   cls: 'bg-blue-100 text-blue-800' },
                rejected:  { label: 'Nekad',     cls: 'bg-red-100 text-red-700' },
                completed: { label: 'Utförd',    cls: 'bg-green-100 text-green-700' },
              };
              const s = statusMap[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-600' };
              const isExpanded = expandedRequest === r.id;
              return (
                <div key={r.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setExpandedRequest(isExpanded ? null : r.id)}
                    className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {r.request_number && <span className="text-xs font-mono font-bold text-gray-700">#{r.request_number}</span>}
                          <p className="text-xs text-gray-500">{format(new Date(r.request_date), 'dd MMM yyyy HH:mm', { locale: sv })} • {r.requested_items?.length} artikel(r)</p>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3 text-sm">
                      <div className="space-y-1">
                        {r.requested_items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between p-2 bg-white rounded border border-gray-100">
                            <span className="text-gray-800">{item.name}</span>
                            <span className="font-medium">{item.quantity} st</span>
                          </div>
                        ))}
                      </div>
                      {r.notes && (
                        <div className="p-2 bg-white rounded border border-gray-100">
                          <p className="text-xs text-gray-500 mb-0.5">Anteckningar</p>
                          <p className="text-gray-700">{r.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'form' && <Card className="p-6 space-y-6">
         {/* Requester Info */}
         <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
           <p className="text-sm text-gray-600">Begäran från</p>
           <p className="font-semibold text-gray-900">{user?.full_name}</p>
           <p className="text-sm text-gray-600">{user?.email}</p>
         </div>

         {/* Kund */}
         <div className="space-y-2">
           <Label>Kund <span className="text-red-500">*</span></Label>
           <div className="relative">
             <Button
               variant="outline"
               className="w-full justify-start text-left font-normal"
               onClick={() => { setKundOpen(!kundOpen); setKundSearch(''); }}
             >
               {formData.customer_name || "Välj kund..."}
               <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
             </Button>
             {kundOpen && (
               <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                 <div className="flex items-center border-b px-3">
                   <Search className="w-4 h-4 text-gray-400 shrink-0" />
                   <input
                     autoFocus
                     placeholder="Sök kund..."
                     value={kundSearch}
                     onChange={(e) => setKundSearch(e.target.value)}
                     className="w-full px-2 py-2.5 text-sm bg-transparent outline-none"
                   />
                 </div>
                 <div className="max-h-64 overflow-y-auto p-1">
                   {kunder
                     .filter(k => {
                       const s = kundSearch.toLowerCase();
                       return !s || k.namn?.toLowerCase().includes(s) || k.projektnummer?.toLowerCase().includes(s);
                     })
                     .map(k => (
                       <button
                         key={k.id}
                         onClick={() => {
                           setFormData(prev => ({ ...prev, customer_id: k.id, customer_name: k.namn }));
                           setKundOpen(false);
                         }}
                         className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                       >
                         {k.namn}{k.projektnummer ? ` (${k.projektnummer})` : ''}
                       </button>
                     ))
                   }
                   {kunder.filter(k => {
                     const s = kundSearch.toLowerCase();
                     return !s || k.namn?.toLowerCase().includes(s) || k.projektnummer?.toLowerCase().includes(s);
                   }).length === 0 && (
                     <p className="text-sm text-gray-500 text-center py-4">Ingen kund hittad.</p>
                   )}
                 </div>
               </div>
             )}
           </div>
         </div>

         {/* Ordernummer */}
         <div className="space-y-2">
           <Label>Ordernummer <span className="text-gray-400 text-xs">(frivilligt)</span></Label>
           <Input
             value={formData.ordernummer}
             onChange={(e) => setFormData(prev => ({ ...prev, ordernummer: e.target.value }))}
             placeholder="Ange ordernummer om du har ett..."
           />
         </div>

         {/* Item Selection */}
         <div className="border-t pt-6 space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="font-semibold text-lg">Artiklar</h3>
             <Button variant="outline" size="sm" onClick={() => setShowCopyModal(true)} className="gap-1.5 text-xs">
               <Copy className="w-3.5 h-3.5" /> Kopiera från tidigare
             </Button>
           </div>
           
           <div className="space-y-2">
             <Label>Välj artikel</Label>
             <div className="relative">
               <Button
                 variant="outline"
                 className="w-full justify-start text-left font-normal"
                 onClick={() => { setArtikelOpen(!artikelOpen); setArtikelSearch(''); }}
               >
                 {selectedItem ? selectedItem.benamning : "Sök och välj artikel..."}
                 <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
               </Button>
               {artikelOpen && (
                 <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                   <div className="flex items-center border-b px-3">
                     <Search className="w-4 h-4 text-gray-400 shrink-0" />
                     <input
                       autoFocus
                       placeholder="Sök artikel..."
                       value={artikelSearch}
                       onChange={(e) => setArtikelSearch(e.target.value)}
                       className="w-full px-2 py-2.5 text-sm bg-transparent outline-none"
                     />
                   </div>
                   <div className="max-h-64 overflow-y-auto p-1">
                     {artiklar
                       .filter(item => {
                         const s = artikelSearch.toLowerCase();
                         return !s || item.benamning?.toLowerCase().includes(s) || item.streckkod?.toLowerCase().includes(s);
                       })
                       .map(item => (
                         <button
                           key={item.id}
                           onClick={() => {
                             setSelectedItem(item);
                             setSelectedQty(1);
                             setArtikelOpen(false);
                           }}
                           className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                         >
                           {item.benamning}
                         </button>
                       ))
                     }
                     {artiklar.filter(item => {
                       const s = artikelSearch.toLowerCase();
                       return !s || item.benamning?.toLowerCase().includes(s) || item.streckkod?.toLowerCase().includes(s);
                     }).length === 0 && (
                       <p className="text-sm text-gray-500 text-center py-4">Ingen artikel hittad.</p>
                     )}
                   </div>
                 </div>
               )}
             </div>
           </div>

           {selectedItem && (
             <div className="flex items-end gap-2">
               <div className="flex-1 space-y-2">
                 <Label>Antal</Label>
                 <Input
                   type="number"
                   min="1"
                   value={selectedQty}
                   onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                 />
               </div>
               <Button
                 onClick={addItem}
                 className="bg-[#8B1E1E] hover:bg-[#6B1515]"
               >
                 <Plus className="w-4 h-4 mr-2" />
                 Lägg till
               </Button>
             </div>
           )}

           {/* Selected Items List */}
           {formData.requested_items.length > 0 && (
             <div className="space-y-2">
               <Label>Valda artiklar</Label>
               <div className="space-y-2">
                 {formData.requested_items.map(item => (
                   <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg gap-3">
                     <div className="flex-1 min-w-0">
                       <p className="font-medium">{item.name}</p>
                     </div>
                     <div className="flex items-center gap-2">
                       <Input
                         type="number"
                         min="1"
                         value={item.quantity}
                         onChange={(e) => {
                           const qty = Math.max(1, parseInt(e.target.value) || 1);
                           setFormData(prev => ({
                             ...prev,
                             requested_items: prev.requested_items.map(i =>
                               i.id === item.id ? { ...i, quantity: qty } : i
                             )
                           }));
                         }}
                         className="w-16 text-sm text-center"
                       />
                       <span className="text-sm text-gray-500 whitespace-nowrap">st</span>
                     </div>
                     <button
                       onClick={() => removeItem(item.id)}
                       className="text-red-500 hover:text-red-700 shrink-0"
                     >
                       <X className="w-5 h-5" />
                     </button>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>

         {/* Notes */}
         <div className="space-y-2">
           <Label>Anteckningar</Label>
           <Textarea
             value={formData.notes}
             onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
             placeholder="Lägg till eventuella kommentarer..."
             rows={3}
           />
         </div>

         {/* Submit */}
         <div className="flex gap-3 pt-4 border-t">
           <Button
             onClick={handleSubmit}
             disabled={createRequestMutation.isPending}
             className="bg-[#8B1E1E] hover:bg-[#6B1515]"
           >
             {createRequestMutation.isPending ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Skickar...
               </>
             ) : (
               <>
                 <Check className="w-4 h-4 mr-2" />
                 Skicka begäran
               </>
             )}
           </Button>
         </div>
       </Card>}
    </div>
  );
}