import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2, Plus, Minus } from 'lucide-react';

export default function NyttUttagModal({ open, onClose, artikelMap, artiklar }) {
  const queryClient = useQueryClient();
  const barcodeRef = useRef(null);

  const [selectedKund, setSelectedKund] = useState(null);
  const [selectedPersonal, setSelectedPersonal] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanError, setScanError] = useState('');

  const { data: kunder = [] } = useQuery({
    queryKey: ['kunder'],
    queryFn: () => base44.entities.Kund.list(null, 10000).catch(() => []),
    enabled: open,
  });

  const { data: personal = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list(null, 10000).catch(() => []),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setSelectedKund(null);
      setSelectedPersonal(null);
      setScannedItems([]);
      setBarcodeInput('');
      setScanError('');
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => barcodeRef.current?.focus(), 100);
    }
  }, [open, selectedKund, selectedPersonal]);

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const found = artikelMap[code];
    if (!found) {
      setScanError(`Ingen artikel hittades för streckkod: ${code}`);
      setBarcodeInput('');
      return;
    }

    setScanError('');
    setScannedItems(prev => {
      const existing = prev.find(i => i.artikel_id === found.id);
      if (existing) {
        return prev.map(i => i.artikel_id === found.id ? { ...i, antal: i.antal + 1 } : i);
      }
      return [...prev, {
        artikel_id: found.id,
        benamning: found.benamning,
        streckkod: found.streckkod,
        pris_per_enhet: found.pris || 0,
        antal: 1,
      }];
    });
    setBarcodeInput('');
    barcodeRef.current?.focus();
  };

  const updateAntal = (artikel_id, delta) => {
    setScannedItems(prev => prev
      .map(i => i.artikel_id === artikel_id ? { ...i, antal: Math.max(1, i.antal + delta) } : i)
    );
  };

  const removeItem = (artikel_id) => {
    setScannedItems(prev => prev.filter(i => i.artikel_id !== artikel_id));
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const now = new Date().toISOString();
      const manad = now.substring(0, 7);
      const artiklarData = scannedItems.map(i => ({
        artikel_id: i.artikel_id,
        benamning: i.benamning,
        antal: i.antal,
        pris_per_enhet: i.pris_per_enhet,
        total_pris: i.antal * i.pris_per_enhet,
      }));
      const total_kostnad = artiklarData.reduce((sum, a) => sum + a.total_pris, 0);
      return base44.entities.Uttag.create({
        datum: now,
        personal_id: selectedPersonal.id,
        personal_namn: selectedPersonal.name,
        kund_id: selectedKund.id,
        kund_namn: selectedKund.namn,
        ordernummer: null,
        artiklar: artiklarData,
        total_kostnad,
        manad,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['uttag']);
      onClose();
    },
  });

  const canSave = selectedKund && selectedPersonal && scannedItems.length > 0;
  const total = scannedItems.reduce((sum, i) => sum + i.antal * i.pris_per_enhet, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nytt uttag</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Kund */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Kund *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              value={selectedKund?.id || ''}
              onChange={e => setSelectedKund(kunder.find(k => k.id === e.target.value) || null)}
            >
              <option value="">Välj kund...</option>
              {kunder.map(k => (
                <option key={k.id} value={k.id}>{k.namn}</option>
              ))}
            </select>
          </div>

          {/* Personal */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Uthämtare *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              value={selectedPersonal?.id || ''}
              onChange={e => setSelectedPersonal(personal.find(p => p.id === e.target.value) || null)}
            >
              <option value="">Välj personal...</option>
              {personal.filter(p => p.is_active !== false).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Skanna streckkod */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Skanna streckkod</label>
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <Input
                ref={barcodeRef}
                value={barcodeInput}
                onChange={e => { setBarcodeInput(e.target.value); setScanError(''); }}
                placeholder="Skanna eller skriv streckkod..."
                className="flex-1"
              />
              <Button type="submit" size="sm">Lägg till</Button>
            </form>
            {scanError && <p className="text-red-500 text-xs mt-1">{scanError}</p>}
          </div>

          {/* Artikellista */}
          {scannedItems.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Artikel</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Antal</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Pris</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {scannedItems.map(item => (
                    <tr key={item.artikel_id} className="border-b last:border-0">
                      <td className="px-3 py-2 text-gray-900">{item.benamning}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => updateAntal(item.artikel_id, -1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.antal}</span>
                          <button onClick={() => updateAntal(item.artikel_id, 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {(item.antal * item.pris_per_enhet).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeItem(item.artikel_id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2 bg-gray-50 border-t flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Totalt</span>
                <span className="font-bold text-gray-900">{total.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
              </div>
            </div>
          )}

          {/* Knappar */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Avbryt</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Bekräfta uttag
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}