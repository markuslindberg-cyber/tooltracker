import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const kundTyper = ['Cemi', 'PHM', 'Övrig', 'BRF', 'Kommersiella', 'Koncernbolag', 'Internt'];

export default function LokalvardKunder() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [form, setForm] = useState({ namn: '', typ: 'Cemi', projektnummer: '', status: 'aktiv' });
  const [submitting, setSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('namn');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkTyp, setBulkTyp] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const { data: kunder = [], isLoading } = useQuery({
    queryKey: ['kunder'],
    queryFn: () => base44.entities.Kund.list().catch(() => []),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Kund.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kunder']);
      setForm({ namn: '', typ: 'Cemi', projektnummer: '', status: 'aktiv' });
      setSubmitting(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Kund.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['kunder']);
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Kund.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['kunder']);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.namn.trim()) return;
    setSubmitting(true);
    createMutation.mutate({
      namn: form.namn,
      typ: form.typ,
      projektnummer: form.projektnummer || null,
      status: form.status,
    });
  };

  const handleEditClick = (kund) => {
    setEditingId(kund.id);
    setEditForm({ namn: kund.namn, typ: kund.typ, projektnummer: kund.projektnummer || '', status: kund.status || 'aktiv' });
  };

  const handleSaveEdit = () => {
    if (!editForm.namn.trim()) return;
    updateMutation.mutate({
      id: editingId,
      data: { namn: editForm.namn, typ: editForm.typ, projektnummer: editForm.projektnummer || null, status: editForm.status },
    });
  };

  const handleDelete = (id) => {
    if (confirm('Är du säker på att du vill ta bort denna kund?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sorted = [...kunder].sort((a, b) => {
    let aVal = a[sortBy] || '';
    let bVal = b[sortBy] || '';
    if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const allSelected = sorted.length > 0 && sorted.every(k => selectedIds.includes(k.id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(sorted.map(k => k.id));
  };

  const toggleOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkSave = async () => {
    if (!bulkStatus && !bulkTyp) return;
    setBulkSaving(true);
    const updates = selectedIds.map(id => {
      const kund = kunder.find(k => k.id === id);
      const patch = {};
      if (bulkStatus) patch.status = bulkStatus;
      if (bulkTyp) patch.typ = bulkTyp;
      return base44.entities.Kund.update(id, { ...kund, ...patch });
    });
    await Promise.all(updates);
    queryClient.invalidateQueries(['kunder']);
    setSelectedIds([]);
    setBulkStatus('');
    setBulkTyp('');
    setBulkSaving(false);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">👥 Kunder – Lokalvård</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{kunder.length} kunder</span>
      </div>

      {/* Create Form */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
        <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Lägg till ny kund</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input
            type="text"
            placeholder="Kundnamn"
            value={form.namn}
            onChange={(e) => setForm({...form, namn: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            required
          />
          <select
            value={form.typ}
            onChange={(e) => setForm({...form, typ: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {kundTyper.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="text"
            placeholder="Projektnummer"
            value={form.projektnummer}
            onChange={(e) => setForm({...form, projektnummer: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
          <select
            value={form.status}
            onChange={(e) => setForm({...form, status: e.target.value})}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="aktiv">Aktiv</option>
            <option value="inaktiv">Inaktiv</option>
          </select>
          <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 col-span-1">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-1" />}
            Lägg till
          </Button>
        </form>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {selectedIds.length} kund(er) valda
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="px-2 py-1.5 border border-blue-300 dark:border-blue-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Byt status...</option>
            <option value="aktiv">Aktiv</option>
            <option value="inaktiv">Inaktiv</option>
          </select>
          <select
            value={bulkTyp}
            onChange={(e) => setBulkTyp(e.target.value)}
            className="px-2 py-1.5 border border-blue-300 dark:border-blue-700 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Byt typ...</option>
            {kundTyper.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button
            onClick={handleBulkSave}
            disabled={bulkSaving || (!bulkStatus && !bulkTyp)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {bulkSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Spara ändringar
          </Button>
          <button
            onClick={() => { setSelectedIds([]); setBulkStatus(''); setBulkTyp(''); }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline ml-auto"
          >
            Avmarkera alla
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-2 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('namn')}>
                  <div className="flex items-center gap-1">
                    Namn
                    {sortBy === 'namn' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('typ')}>
                  <div className="flex items-center gap-1">
                    Typ
                    {sortBy === 'typ' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('projektnummer')}>
                  <div className="flex items-center gap-1">
                    Projektnummer
                    {sortBy === 'projektnummer' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortBy === 'status' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Inga kunder ännu</td>
                </tr>
              ) : (
                sorted.map(kund => {
                  const isEditing = editingId === kund.id;
                  const isSelected = selectedIds.includes(kund.id);
                  return (
                    <tr key={kund.id} className={isEditing ? 'bg-blue-50 dark:bg-blue-900/20' : isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}>
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(kund.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                        {isEditing ? (
                          <input type="text" value={editForm.namn} onChange={(e) => setEditForm({...editForm, namn: e.target.value})} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                        ) : kund.namn}
                      </td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                        {isEditing ? (
                          <select value={editForm.typ} onChange={(e) => setEditForm({...editForm, typ: e.target.value})} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                            {kundTyper.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        ) : kund.typ}
                      </td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                        {isEditing ? (
                          <input type="text" value={editForm.projektnummer} onChange={(e) => setEditForm({...editForm, projektnummer: e.target.value})} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                        ) : (kund.projektnummer || '-')}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <select value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value})} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                            <option value="aktiv">Aktiv</option>
                            <option value="inaktiv">Inaktiv</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${kund.status === 'aktiv' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                            {kund.status === 'aktiv' ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 px-2 py-1 rounded text-xs font-semibold">✓</button>
                            <button onClick={() => setEditingId(null)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded text-xs font-semibold">✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => handleEditClick(kund)} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded text-xs">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(kund.id)} disabled={deleteMutation.isPending} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded text-xs">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}