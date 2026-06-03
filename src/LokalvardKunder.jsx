import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Edit2, Save, X, Plus, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { calculateUttagMatching } from '@/lib/calculateUttagUtils';

export default function LokalvardArtikelDetaljer() {
  const { artikelnummer } = useParams();
  const navigate = useNavigate();
  const [artikel, setArtikel] = useState(null);
  const [artikelData, setArtikelData] = useState([]);
  const [transaktioner, setTransaktioner] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [inköp, setInköp] = useState([]);
  const [editingInköp, setEditingInköp] = useState(null);
  const [inköpForm, setInköpForm] = useState({});
  const [showAddInköp, setShowAddInköp] = useState(false);
  const [newInköpForm, setNewInköpForm] = useState({ datum: new Date().toISOString().split('T')[0], antal: '', pris: '' });
  const [expandedUttag, setExpandedUttag] = useState({});
  const [expandUttagSection, setExpandUttagSection] = useState(false);
  const [expandInkopSection, setExpandInkopSection] = useState(false);

  useEffect(() => {
    loadData();
  }, [artikelnummer]);

  useEffect(() => {
    // Debug: logg all inköp data
    if (artikel && inköp.length > 0) {
      console.log('Inköp för artikel:', artikel.id);
      console.log(inköp.map(i => ({ id: i.id, datum: i.datum, antal: i.antal, pris: i.pris })));
    }
  }, [inköp, artikel]);

  const loadData = async () => {
    try {
      const [artiklarData, uttagData, inköpData] = await Promise.all([
        base44.entities.LokalvardsArtikel.list(null, 10000),
        base44.entities.Uttag.list(null, 100000),
        base44.entities.LokalvardInköp?.list ? base44.entities.LokalvardInköp.list() : Promise.resolve([])
      ]);

      window.artiklarData = artiklarData;

      const fundArticle = artiklarData.find(a => 
        a.artikelnummer === artikelnummer || 
        a.streckkod === artikelnummer || 
        a.old_streckkod === artikelnummer
      );
      if (!fundArticle) {
        navigate('/Lokalvard/Lager');
        return;
      }

      setArtikel(fundArticle);
      setForm({
        benamning: fundArticle.benamning,
        artikelnummer: fundArticle.artikelnummer || '',
        streckkod: fundArticle.streckkod || '',
        old_streckkod: fundArticle.old_streckkod || '',
        pris: fundArticle.pris,
        inkopsdatum: fundArticle.inkopsdatum,
        antal_inkopta: fundArticle.antal_inkopta,
        lagertroskelvarde: fundArticle.lagertroskelvarde || 10,
        utgaende: fundArticle.utgaende || false
      });

      const streckkod = fundArticle.streckkod;
      const oldStreckkod = fundArticle.old_streckkod;

      // Samla alla artikel-IDs med samma streckkod (grupperad)
      const relateradeArtikelIds = artiklarData
        .filter(a => a.streckkod === streckkod || a.old_streckkod === streckkod || (oldStreckkod && (a.streckkod === oldStreckkod || a.old_streckkod === oldStreckkod)))
        .map(a => a.id);

      const relateradeUttag = uttagData.filter(u => 
        u.artiklar?.some(a => 
          (a.benamning && a.benamning.toLowerCase() === fundArticle.benamning.toLowerCase()) ||
          a.benamning === streckkod || 
          a.benamning === oldStreckkod ||
          relateradeArtikelIds.includes(a.artikel_id) ||
          a.artikel_id === streckkod || 
          a.artikel_id === oldStreckkod
        )
      );

      // OBS: LokalvardCheckout inkluderas INTE i uttagsberäkningen
      // eftersom Lagersidan (LokalvardLager) inte räknar med dem.
      // Checkout-data skapar redan Uttag-poster via createUttagFromCheckout.

      const allTransactions = [...relateradeUttag].sort((a, b) => new Date(b.datum) - new Date(a.datum));
      setTransaktioner(allTransactions);
      
      // Filtrera inköp med EXAKT samma logik som Lagersidan (getInköptForArticle)
      // Lagersidan filtrerar ENBART på all_artikel_ids.includes(i.artikel_id)
      const relateradeInköp = inköpData?.filter(i => 
        relateradeArtikelIds.includes(i.artikel_id)
      ) || [];
      
      setInköp(relateradeInköp.sort((a, b) => new Date(b.datum) - new Date(a.datum)));
      setArtikelData(artiklarData);
    } catch (error) {
      toast.error('Kunde inte ladda data');
      navigate('/Lokalvard/Lager');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await base44.entities.LokalvardsArtikel.update(artikel.id, {
        benamning: form.benamning,
        artikelnummer: form.artikelnummer || null,
        streckkod: form.streckkod || null,
        old_streckkod: form.old_streckkod || null,
        pris: parseFloat(form.pris),
        inkopsdatum: form.inkopsdatum,
        antal_inkopta: parseInt(form.antal_inkopta),
        lagertroskelvarde: parseInt(form.lagertroskelvarde),
        utgaende: form.utgaende
      });
      toast.success('Artikel uppdaterad!');
      setEditing(false);
      loadData();
    } catch (error) {
      toast.error('Kunde inte uppdatera artikel');
    }
  };

  const handleEditInköp = (i) => {
    setEditingInköp(i.id);
    setInköpForm({
      datum: i.datum,
      antal: i.antal,
      pris: i.pris
    });
  };

  const handleSaveInköp = async () => {
    try {
      await base44.entities.LokalvardInköp.update(editingInköp, {
        datum: inköpForm.datum,
        antal: parseInt(inköpForm.antal),
        pris: parseFloat(inköpForm.pris)
      });
      toast.success('Inköp uppdaterat!');
      setEditingInköp(null);
      loadData();
    } catch (error) {
      toast.error('Kunde inte uppdatera inköp');
    }
  };

  const handleDeleteInköp = async (id) => {
    if (confirm('Är du säker på att du vill ta bort detta inköp?')) {
      try {
        await base44.entities.LokalvardInköp.delete(id);
        toast.success('Inköp borttaget!');
        loadData();
      } catch (error) {
        toast.error('Kunde inte ta bort inköp');
      }
    }
  };

  const handleAddInköp = async () => {
    if (!newInköpForm.antal || !newInköpForm.pris) {
      toast.error('Fyll i alla fält');
      return;
    }
    try {
      await base44.entities.LokalvardInköp.create({
        artikel_id: artikel.id,
        datum: newInköpForm.datum,
        antal: parseInt(newInköpForm.antal),
        pris: parseFloat(newInköpForm.pris)
      });
      toast.success('Inköp tillagt!');
      setShowAddInköp(false);
      setNewInköpForm({ datum: new Date().toISOString().split('T')[0], antal: '', pris: '' });
      loadData();
    } catch (error) {
      toast.error('Kunde inte lägga till inköp');
    }
  };

  const totalFromInköp = inköp.reduce((sum, i) => sum + i.antal, 0);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!artikel) return null;

  // Beräkna grupperad total_antal_inkopta (samma logik som Lagersidan)
  const grupperadAntalInkopta = artikelData
    .filter(a => 
      a.streckkod === artikel.streckkod || 
      a.old_streckkod === artikel.streckkod ||
      (artikel.old_streckkod && (a.streckkod === artikel.old_streckkod || a.old_streckkod === artikel.old_streckkod))
    )
    .reduce((sum, a) => sum + (a.antal_inkopta || 0), 0);

  const totalInköpt = totalFromInköp > 0 ? totalFromInköp : grupperadAntalInkopta;

  // Samla alla relaterade artikel-IDs (samma streckkod-grupp)
  const artikelGruppIds = artikelData
    .filter(a => a.streckkod === artikel.streckkod || a.old_streckkod === artikel.streckkod || (artikel.old_streckkod && (a.streckkod === artikel.old_streckkod || a.old_streckkod === artikel.old_streckkod)))
    .map(a => a.id);

  // Räkna uttag för denna specifika artikel
  const totalUttag = transaktioner.reduce((sum, uttag) => {
    const matchingItems = uttag.artiklar.filter(item => 
      (item.benamning && item.benamning.toLowerCase() === artikel.benamning.toLowerCase()) ||
      item.benamning === artikel.streckkod ||
      item.benamning === artikel.old_streckkod ||
      artikelGruppIds.includes(item.artikel_id) ||
      item.artikel_id === artikel.streckkod ||
      item.artikel_id === artikel.old_streckkod
    );
    return sum + matchingItems.reduce((s, i) => s + (i.antal || 0), 0);
  }, 0);

  const saldo = totalInköpt - totalUttag;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold">{artikel.benamning}</h1>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Artikelinformation</h2>
          {!editing && (
            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="gap-2"
            >
              <Edit2 className="w-4 h-4" /> Redigera
            </Button>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Artikelnummer</p>
              <p className="text-lg font-semibold">{artikel.artikelnummer || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Nuvarande pris</p>
              <p className="text-lg font-semibold">{artikel.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</p>
              {inköp.length > 1 && inköp[inköp.length - 1]?.pris && inköp[inköp.length - 1].pris !== artikel.pris && (
                <p className="text-sm text-gray-500 mt-1">
                  Tidigare pris: {inköp[inköp.length - 1].pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Inköpsdatum</p>
              <p className="text-lg font-semibold">{artikel.inkopsdatum}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Antal inköpt</p>
              <p className="text-lg font-semibold">{totalInköpt}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Lagertröskelvärde</p>
              <p className="text-lg font-semibold">{artikel.lagertroskelvarde}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Totalt uttag</p>
              <p className="text-lg font-semibold text-blue-600">{totalUttag}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Saldo</p>
              <p className={`text-lg font-semibold ${saldo === 0 ? 'text-red-600' : saldo < artikel.lagertroskelvarde ? 'text-yellow-600' : 'text-green-600'}`}>
                {saldo}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold">
                {artikel.utgaende ? <span className="text-orange-600">Utgående</span> : <span className="text-green-600">Aktiv</span>}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Benämning</label>
              <input
                type="text"
                value={form.benamning}
                onChange={(e) => setForm({ ...form, benamning: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Artikelnummer</label>
                <input
                  type="text"
                  value={form.artikelnummer}
                  onChange={(e) => setForm({ ...form, artikelnummer: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Streckkod</label>
                <input
                  type="text"
                  value={form.streckkod}
                  onChange={(e) => setForm({ ...form, streckkod: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Tidigare streckkod</label>
              <input
                type="text"
                value={form.old_streckkod}
                onChange={(e) => setForm({ ...form, old_streckkod: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Pris</label>
              <input
                type="number"
                step="0.01"
                value={form.pris}
                onChange={(e) => setForm({ ...form, pris: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Inköpsdatum</label>
                <input
                  type="date"
                  value={form.inkopsdatum}
                  onChange={(e) => setForm({ ...form, inkopsdatum: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Antal inköpt</label>
                <input
                  type="number"
                  value={form.antal_inkopta}
                  onChange={(e) => setForm({ ...form, antal_inkopta: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Lagertröskelvärde</label>
              <input
                type="number"
                value={form.lagertroskelvarde}
                onChange={(e) => setForm({ ...form, lagertroskelvarde: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="utgaende-edit"
                checked={form.utgaende}
                onCheckedChange={(checked) => setForm({ ...form, utgaende: !!checked })}
              />
              <label htmlFor="utgaende-edit" className="text-sm font-semibold cursor-pointer">
                Utgående artikel (köps inte längre in)
              </label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setEditing(false)}
                variant="outline"
                className="flex-1 gap-2"
              >
                <X className="w-4 h-4" /> Avbryt
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <Save className="w-4 h-4" /> Spara
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <button
          onClick={() => setExpandUttagSection(!expandUttagSection)}
          className="w-full flex items-center justify-between hover:bg-gray-50 p-2 -m-2 rounded"
        >
          <h2 className="text-lg font-semibold">Uttag av denna artikel</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>({transaktioner?.length || 0})</span>
            {expandUttagSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>
        {expandUttagSection && (
          <div className="mt-2">
        {!transaktioner || transaktioner.length === 0 ? (
          <p className="text-sm text-gray-600">Inga uttag registrerade</p>
        ) : (
          <div className="space-y-0.5">
            {transaktioner.map(uttag => {
               const matchingItems = uttag.artiklar.filter(item => 
                 (item.benamning && item.benamning.toLowerCase() === artikel.benamning.toLowerCase()) ||
                 item.benamning === artikel.streckkod ||
                 item.benamning === artikel.old_streckkod ||
                 artikelGruppIds.includes(item.artikel_id) ||
                 item.artikel_id === artikel.streckkod ||
                 item.artikel_id === artikel.old_streckkod
               );
               const totalAntal = matchingItems.reduce((s, i) => s + (i.antal || 0), 0);
              const totalPris = matchingItems.reduce((s, i) => s + (i.antal * i.pris_per_enhet || 0), 0);
              const datum = uttag.datum ? uttag.datum.split('T')[0] : '-';
              const isExpanded = !!expandedUttag[uttag.id];
              return (
                <div key={uttag.id} className="border border-gray-200 rounded overflow-hidden">
                  <button
                    onClick={() => setExpandedUttag(prev => ({ ...prev, [uttag.id]: !prev[uttag.id] }))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                    <span className="text-xs font-medium w-24 shrink-0">{datum}</span>
                    <span className="text-xs text-gray-700 flex-1 truncate">{uttag.kund_namn}</span>
                    <span className="text-xs text-gray-500 mr-2">{uttag.personal_namn}</span>
                    <span className="text-xs font-semibold w-12 text-right shrink-0">{totalAntal} st</span>
                    <span className="text-xs font-semibold w-20 text-right shrink-0">{totalPris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</span>
                  </button>
                  {isExpanded && (
                    <table className="w-full text-xs">
                      <thead className="bg-white border-t border-b">
                        <tr>
                          <th className="px-3 py-1 text-left font-semibold text-gray-500">Artikel</th>
                          <th className="px-3 py-1 text-right font-semibold text-gray-500">Antal</th>
                          <th className="px-3 py-1 text-right font-semibold text-gray-500">Pris/enhet</th>
                          <th className="px-3 py-1 text-right font-semibold text-gray-500">Totalt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {matchingItems.map((item, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-3 py-1 text-gray-700">{item.benamning || item.artikel_id}</td>
                            <td className="px-3 py-1 text-right">{item.antal}</td>
                            <td className="px-3 py-1 text-right">{item.pris_per_enhet?.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                            <td className="px-3 py-1 text-right font-semibold">{(item.antal * item.pris_per_enhet)?.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                );
                })}
                </div>
                )}
                </div>
                )}
                </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <button
          onClick={() => setExpandInkopSection(!expandInkopSection)}
          className="w-full flex items-center justify-between hover:bg-gray-50 p-2 -m-2 rounded mb-2"
        >
          <h2 className="text-lg font-semibold">Inköp av denna artikel</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>({inköp.length})</span>
            {expandInkopSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </button>

        {expandInkopSection && (
          <div>
          {!showAddInköp && (
            <Button
              onClick={() => setShowAddInköp(true)}
              variant="outline"
              className="gap-2 mb-4"
            >
              <Plus className="w-4 h-4" /> Lägg till inköp
            </Button>
          )}

        {showAddInköp && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3 border border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Datum</label>
                <input
                  type="date"
                  value={newInköpForm.datum}
                  onChange={(e) => setNewInköpForm({ ...newInköpForm, datum: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Antal</label>
                <input
                  type="number"
                  value={newInköpForm.antal}
                  onChange={(e) => setNewInköpForm({ ...newInköpForm, antal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Pris per enhet</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInköpForm.pris}
                  onChange={(e) => setNewInköpForm({ ...newInköpForm, pris: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddInköp}
                className="bg-green-600 hover:bg-green-700"
              >
                Lägg till
              </Button>
              <Button
                onClick={() => setShowAddInköp(false)}
                variant="outline"
              >
                Avbryt
              </Button>
            </div>
          </div>
        )}

        {inköp.length === 0 ? (
          <p className="text-gray-600">Ingen inköp registrerad än</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Datum</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Antal</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Pris per enhet</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Totalt</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inköp.map(i => (
                  <tr key={i.id}>
                    {editingInköp === i.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={inköpForm.datum}
                            onChange={(e) => setInköpForm({ ...inköpForm, datum: e.target.value })}
                            className="px-3 py-1 border border-gray-300 rounded w-full"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={inköpForm.antal}
                            onChange={(e) => setInköpForm({ ...inköpForm, antal: e.target.value })}
                            className="px-3 py-1 border border-gray-300 rounded w-full text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={inköpForm.pris}
                            onChange={(e) => setInköpForm({ ...inköpForm, pris: e.target.value })}
                            className="px-3 py-1 border border-gray-300 rounded w-full text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {(inköpForm.antal * inköpForm.pris).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={handleSaveInköp}
                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingInköp(null)}
                            className="text-gray-600 hover:bg-gray-100 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3">{i.datum}</td>
                        <td className="px-4 py-3 text-right">{i.antal}</td>
                        <td className="px-4 py-3 text-right">{i.pris.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                        <td className="px-4 py-3 text-right text-gray-600">{(i.antal * i.pris).toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr</td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleEditInköp(i)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInköp(i.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
          </div>
        )}
        </div>


        </div>
  );
}