import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { XCircle } from 'lucide-react';

export default function AdminEditLoanDialog({ request, open, onOpenChange }) {
  const queryClient = useQueryClient();

  const [returnDate, setReturnDate] = useState('');
  const [assignedToEmail, setAssignedToEmail] = useState('');
  const [assignedToName, setAssignedToName] = useState('');
  const [destinationLocationId, setDestinationLocationId] = useState('');
  const [destinationLocationName, setDestinationLocationName] = useState('');
  const [approverComment, setApproverComment] = useState('');

  useEffect(() => {
    if (request) {
      setReturnDate(request.default_return_date?.split('T')[0] || '');
      setAssignedToEmail(request.assigned_to_email || '');
      setAssignedToName(request.assigned_to_name || '');
      setDestinationLocationId(request.destination_location_id || '');
      setDestinationLocationName(request.destination_location_name || '');
      setApproverComment(request.approver_comment || '');
    }
  }, [request]);

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.filter({ is_active: true }),
    enabled: open
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.filter({ is_active: true }),
    enabled: open
  });

  const [cancelling, setCancelling] = useState(false);
  const [cancelComment, setCancelComment] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.LoanRequest.update(request.id, {
      default_return_date: returnDate,
      assigned_to_email: assignedToEmail,
      assigned_to_name: assignedToName,
      destination_location_id: destinationLocationId,
      destination_location_name: destinationLocationName,
      approver_comment: approverComment,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      onOpenChange(false);
    }
  });

  const handleCancel = async () => {
    setCancelling(true);
    await base44.functions.invoke('cancelLoanRequest', { loan_request_id: request.id, comment: cancelComment });
    queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
    setCancelling(false);
    setShowCancelConfirm(false);
    onOpenChange(false);
  };

  const handleLocationChange = (e) => {
    const loc = locations.find(l => l.id === e.target.value);
    setDestinationLocationId(loc?.id || '');
    setDestinationLocationName(loc?.name || '');
  };

  const handlePersonChange = (e) => {
    const member = teamMembers.find(m => m.email === e.target.value);
    setAssignedToEmail(member?.email || '');
    setAssignedToName(member?.name || '');
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redigera lån</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{request.tool_names?.join(', ')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Begärd av: {request.requested_by_name}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Låntagare</label>
            <select
              value={assignedToEmail}
              onChange={handlePersonChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600"
            >
              <option value="">Välj person</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.email}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Destinationsplats</label>
            <select
              value={destinationLocationId}
              onChange={handleLocationChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600"
            >
              <option value="">Välj plats</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Återlämningsdatum</label>
            <input
              type="date"
              value={returnDate}
              onChange={e => setReturnDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-400 dark:focus:border-blue-600"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Kommentar</label>
            <Textarea
              placeholder="Anteckning om lånet..."
              value={approverComment}
              onChange={e => setApproverComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {showCancelConfirm ? (
          <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Bekräfta avbrytning – mail skickas till berörda</p>
            <Textarea
              placeholder="Kommentar (valfritt)..."
              value={cancelComment}
              onChange={e => setCancelComment(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(false)}>Tillbaka</Button>
              <Button size="sm" variant="destructive" disabled={cancelling} onClick={handleCancel}>
                {cancelling ? 'Avbryter...' : 'Bekräfta avbrytning'}
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {request.status !== 'returned' && request.status !== 'rejected' && (
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 sm:mr-auto"
                onClick={() => setShowCancelConfirm(true)}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Avbryt lån
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Stäng</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !returnDate}
            >
              {saveMutation.isPending ? 'Sparar...' : 'Spara ändringar'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}