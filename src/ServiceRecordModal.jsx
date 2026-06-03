import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, CalendarPlus, ArrowLeft } from 'lucide-react';

// mode: 'early' = set earlier return date (direct update)
//       'extend' = request extension (requires approval)
export default function EditLoanDialog({ request, open, onOpenChange, onEarlyReturn, onExtend, isLoading }) {
  const [mode, setMode] = useState(null); // null | 'early' | 'extend'
  const [newDate, setNewDate] = useState('');
  const [comment, setComment] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const currentDate = request?.default_return_date?.split('T')[0] || '';

  const handleClose = () => {
    setMode(null);
    setNewDate('');
    setComment('');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!newDate) return;
    if (mode === 'early') {
      onEarlyReturn({ loan_request_id: request.id, new_return_date: newDate, comment });
    } else {
      onExtend({ original_request_id: request.id, new_return_date: newDate, extension_comment: comment });
    }
    handleClose();
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hantera lån</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{request.tool_names?.join(', ')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Nuvarande återlämningsdatum:{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {currentDate ? new Date(currentDate).toLocaleDateString('sv-SE') : '–'}
              </span>
            </p>
          </div>

          {!mode && (
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => { setMode('early'); setNewDate(''); }}
                className="flex items-start gap-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl p-4 text-left hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 transition-colors"
              >
                <CalendarCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Ange tidigare återlämningsdatum</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Uppdaterar datumet direkt – ingen ny godkännandeförfrågan skickas</p>
                </div>
              </button>
              <button
                onClick={() => { setMode('extend'); setNewDate(''); }}
                className="flex items-start gap-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-xl p-4 text-left hover:border-orange-400 hover:bg-orange-50 dark:hover:border-orange-600 dark:hover:bg-orange-900/20 transition-colors"
              >
                <CalendarPlus className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Begär förlängning</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Skickar en ny förfrågan om förlängt återlämningsdatum som kräver godkännande</p>
                </div>
              </button>
            </div>
          )}

          {mode && (
            <div className="space-y-4">
              <button
                onClick={() => { setMode(null); setNewDate(''); setComment(''); }}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Tillbaka
              </button>

              <div className="flex items-center gap-2">
                <Badge className={mode === 'early' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'}>
                  {mode === 'early' ? 'Tidigare återlämning' : 'Förlängning'}
                </Badge>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {mode === 'early' ? 'Nytt (tidigare) återlämningsdatum *' : 'Nytt (förlängt) återlämningsdatum *'}
                </label>
                <input
                  type="date"
                  value={newDate}
                  min={mode === 'extend' ? (currentDate || today) : today}
                  max={mode === 'early' ? (currentDate || undefined) : undefined}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600"
                />
                {mode === 'early' && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Välj ett datum före det nuvarande återlämningsdatumet</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kommentar</label>
                <Textarea
                  placeholder={mode === 'early' ? 'T.ex. Projektet slutfördes tidigare...' : 'Förklara varför förlängning behövs...'}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Avbryt</Button>
          {mode && (
            <Button
              onClick={handleSubmit}
              disabled={!newDate || isLoading}
              className={mode === 'extend' ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              {mode === 'early' ? 'Uppdatera datum' : 'Skicka förlängningsbegäran'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}