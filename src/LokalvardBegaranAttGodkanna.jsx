import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, RotateCw, AlertCircle, Pencil } from 'lucide-react';
import LoanRequestModal from '@/components/modals/LoanRequestModal';
import EditLoanDialog from '@/components/modals/EditLoanDialog';
import AdminEditLoanDialog from '@/components/modals/AdminEditLoanDialog';

export default function LoanRequests() {
  const queryClient = useQueryClient();
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approverComment, setApproverComment] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveAdjustedDate, setApproveAdjustedDate] = useState('');
  const [partialApprovalIds, setPartialApprovalIds] = useState(null); // null = alla godkänns
  const [extensionComment, setExtensionComment] = useState('');
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [extensionDate, setExtensionDate] = useState('');
  const [editLoanOpen, setEditLoanOpen] = useState(false);
  const [editLoanRequest, setEditLoanRequest] = useState(null);
  const [confirmReturnOpen, setConfirmReturnOpen] = useState(false);
  const [confirmReturnRequest, setConfirmReturnRequest] = useState(null);
  const [confirmReturnComment, setConfirmReturnComment] = useState('');
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [adminEditRequest, setAdminEditRequest] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: loanRequests = [] } = useQuery({
    queryKey: ['loanRequests'],
    queryFn: () => base44.entities.LoanRequest.list(),
    refetchInterval: 5000
  });

  const approveMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('approveLoanRequest', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setApproveDialogOpen(false);
      setApproverComment('');
      setSelectedRequest(null);
    }
  });

  const returnMutation = useMutation({
    mutationFn: (loan_request_id) => base44.functions.invoke('returnLoanedTools', { loan_request_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setSelectedRequest(null);
    }
  });

  const extendMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('extendLoanRequest', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setExtensionDialogOpen(false);
      setExtensionComment('');
      setExtensionDate('');
      setSelectedRequest(null);
    }
  });

  const updateReturnDateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateLoanReturnDate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
    }
  });

  const confirmReturnMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('confirmReturn', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loanRequests'] });
      setConfirmReturnOpen(false);
      setConfirmReturnRequest(null);
      setConfirmReturnComment('');
    }
  });

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#8B1E1E] rounded-full animate-spin" />
    </div>
  );

  const isAdmin = user.role === 'admin' || user.role === 'ägare' || user.role === 'admin_lokalvård';
  const isOwner = user.role === 'ägare';

  // Filter requests based on user role
  const myRequests = loanRequests.filter(r => r.requested_by_email === user.email);
  const requestsToApprove = isAdmin
    ? loanRequests.filter(r => r.status === 'pending')
    : loanRequests.filter(r => r.approver_email === user.email && r.status === 'pending');
  const myLoans = loanRequests.filter(r => r.assigned_to_email === user.email && r.status === 'approved');
  const pendingReturnConfirm = loanRequests.filter(r => (isAdmin || r.approver_email === user.email) && r.status === 'pending_return');
  // Alla lån som admin/ägare kan hantera (ägare ser alla, admin ser aktiva + godkända)
  const manageableLoans = isOwner
    ? loanRequests
    : loanRequests.filter(r =>
        (isAdmin || r.approver_email === user.email || r.destination_location_manager_email === user.email) && r.status === 'approved'
      );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'returned': return <CheckCircle className="w-4 h-4 text-gray-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      approved: { label: 'Godkänd', variant: 'default' },
      rejected: { label: 'Nekad', variant: 'destructive' },
      pending: { label: 'Väntar', variant: 'secondary' },
      pending_return: { label: 'Väntar mottagningsbekräftelse', variant: 'secondary' },
      returned: { label: 'Returnerad', variant: 'outline' }
    };
    return variants[status] || { label: status, variant: 'secondary' };
  };

  const handleApprove = (approved) => {
    const payload = {
      loan_request_id: selectedRequest.id,
      approved,
      approver_comment: approverComment,
    };
    if (approved && approveAdjustedDate) {
      payload.adjusted_return_date = approveAdjustedDate;
    }
    if (approved && partialApprovalIds !== null) {
      payload.approved_tool_ids = partialApprovalIds;
    }
    approveMutation.mutate(payload);
  };

  const openApproveDialog = (request) => {
    setSelectedRequest(request);
    setApproverComment('');
    setApproveAdjustedDate('');
    setPartialApprovalIds(null);
    setApproveDialogOpen(true);
  };

  const handleExtend = () => {
    if (!extensionDate) {
      alert('Vänligen ange ett nytt återlämningsdatum');
      return;
    }
    extendMutation.mutate({
      original_request_id: selectedRequest.id,
      new_return_date: extensionDate,
      extension_comment: extensionComment
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Förflyttningar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Hantera låneförfrågningar för maskiner</p>
        </div>
        <Button onClick={() => setIsLoanModalOpen(true)} className="bg-[#8B1E1E] hover:bg-[#6B1616] w-full sm:w-auto">
          Skicka förfrågan om lån
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Väntande förfrågningar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestsToApprove.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Utlånade maskiner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myLoans.reduce((sum, r) => sum + r.tool_ids.length, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Lånade från andra</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loanRequests.filter(r => r.destination_location_manager_email === user.email && r.status === 'approved').reduce((sum, r) => sum + r.tool_ids.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={requestsToApprove.length > 0 ? "pending" : pendingReturnConfirm.length > 0 ? "confirm_return" : "mine"} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pending" className="relative">
            Väntande godkännande
            {requestsToApprove.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {requestsToApprove.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="confirm_return" className="relative">
            Bekräfta mottagning
            {pendingReturnConfirm.length > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingReturnConfirm.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="mine">Mina förfrågningar ({myRequests.length})</TabsTrigger>
          <TabsTrigger value="loans">Mina lån ({myLoans.length})</TabsTrigger>
          {(isAdmin || manageableLoans.length > 0) && (
            <TabsTrigger value="manage">Hantera lån ({manageableLoans.length})</TabsTrigger>
          )}
        </TabsList>

        {/* Requests to Approve */}
        <TabsContent value="pending" className="space-y-3">
          {requestsToApprove.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Inga väntande förfrågningar
              </CardContent>
            </Card>
          ) : (
            requestsToApprove.map(request => {
              const isMyApproval = request.approver_email === user.email;
              return (
                <Card
                  key={request.id}
                  className={`transition-shadow cursor-pointer ${isMyApproval ? 'border-red-300 dark:border-red-800 hover:shadow-md hover:border-red-400 bg-red-50 dark:bg-red-900/20' : 'hover:shadow-md opacity-75'}`}
                  onClick={() => openApproveDialog(request)}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{request.tool_names.join(', ')}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Begärd av: {request.requested_by_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Ska lånas av: {request.assigned_to_name || '–'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500">Ansvarig godkännare: {request.approver_name}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isMyApproval ? (
                            <Badge className="bg-red-600 text-white">Kräver din åtgärd</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Väntande</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Destination: {request.destination_location_name} | Återlämning: {new Date(request.default_return_date).toLocaleDateString('sv-SE')}
                      </div>
                      {request.requester_comment && (
                        <div className="text-sm bg-white dark:bg-gray-800 p-2 rounded border-l-2 border-gray-300 dark:border-gray-600">
                          <p className="font-medium text-gray-700 dark:text-gray-300">Kommentar:</p>
                          <p className="text-gray-600 dark:text-gray-400">{request.requester_comment}</p>
                        </div>
                      )}
                      {isMyApproval && (
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={(e) => { e.stopPropagation(); openApproveDialog(request); }}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Godkänn / Neka
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Confirm Return Tab */}
        <TabsContent value="confirm_return" className="space-y-3">
          {pendingReturnConfirm.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Inga maskiner väntar på mottagningsbekräftelse
              </CardContent>
            </Card>
          ) : (
            pendingReturnConfirm.map(request => (
              <Card key={request.id} className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{request.tool_names.join(', ')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Lånad av: {request.assigned_to_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Från: {request.destination_location_name}</p>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">Väntar mottagning</Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Markerades som returnerad: {request.returned_date ? new Date(request.returned_date).toLocaleDateString('sv-SE') : '–'}
                    </p>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => { setConfirmReturnRequest(request); setConfirmReturnOpen(true); }}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Bekräfta att jag tagit emot maskinerna
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* My Requests */}
        <TabsContent value="mine" className="space-y-3">
          {myRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Du har inte skickat några förfrågningar ännu
              </CardContent>
            </Card>
          ) : (
            myRequests.map(request => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{request.tool_names.join(', ')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Ska lånas av: {request.assigned_to_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Destination: {request.destination_location_name}</p>
                      </div>
                      <Badge variant={getStatusBadge(request.status).variant}>
                        {getStatusBadge(request.status).label}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Återlämningsdatum: {new Date(request.default_return_date).toLocaleDateString('sv-SE')}
                    </div>
                    {request.approver_comment && (
                      <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded border-l-2 border-blue-300 dark:border-blue-700">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Kommentar från godkännare:</p>
                        <p className="text-gray-600 dark:text-gray-400">{request.approver_comment}</p>
                      </div>
                    )}
                    {request.status === 'approved' && (
                      <Button variant="outline" size="sm" onClick={() => { setEditLoanRequest(request); setEditLoanOpen(true); }}>
                        <Pencil className="w-3 h-3 mr-1" />
                        Redigera lån
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* My Loans */}
        <TabsContent value="loans" className="space-y-3">
          {myLoans.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Du har inga aktiva lån
              </CardContent>
            </Card>
          ) : (
            myLoans.map(request => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{request.tool_names.join(', ')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Från: {request.tool_details[0]?.location_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Till: {request.destination_location_name}</p>
                      </div>
                      <Badge variant="default">Godkänd</Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Återlämningsdatum: {new Date(request.default_return_date).toLocaleDateString('sv-SE')}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => { setEditLoanRequest(request); setEditLoanOpen(true); }}>
                        <Pencil className="w-3 h-3 mr-1" />
                        Redigera lån
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={returnMutation.isPending}
                        onClick={() => {
                          if (window.confirm('Markera maskinerna som returnerade? Ansvarig kommer att få en bekräftelsebegäran.')) {
                            returnMutation.mutate(request.id);
                          }
                        }}
                      >
                        Markera som returnerad
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        {/* Manage Loans (Admin + Approver) */}
        <TabsContent value="manage" className="space-y-3">
          {manageableLoans.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Inga aktiva lån att hantera
              </CardContent>
            </Card>
          ) : (
            manageableLoans.map(request => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{request.tool_names.join(', ')}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Låntagare: {request.assigned_to_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Destination: {request.destination_location_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Begärd av: {request.requested_by_name}</p>
                      </div>
                      <Badge variant="default">Godkänd</Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Återlämningsdatum: {new Date(request.default_return_date).toLocaleDateString('sv-SE')}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setAdminEditRequest(request); setAdminEditOpen(true); }}>
                      <Pencil className="w-3 h-3 mr-1" />
                      {isOwner ? 'Redigera förfrågan' : 'Redigera lån'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Approve/Reject Dialog */}
      {selectedRequest && (
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Hantera låneförfrågan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                <p className="font-medium text-gray-900 dark:text-gray-100">{selectedRequest.tool_names.join(', ')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Begärd av: {selectedRequest.requested_by_name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Ska lånas av: {selectedRequest.assigned_to_name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Destination: {selectedRequest.destination_location_name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Önskat återlämningsdatum: <strong>{new Date(selectedRequest.default_return_date).toLocaleDateString('sv-SE')}</strong></p>
                {selectedRequest.requester_comment && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">Kommentar: {selectedRequest.requester_comment}</p>
                )}
              </div>

              {/* Partiellt godkännande */}
              {selectedRequest.tool_names?.length > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Välj vilka maskiner som godkänns (lämna alla för att godkänna alla)</label>
                  <div className="space-y-2">
                    {selectedRequest.tool_details?.map((tool, idx) => {
                      const toolId = tool.tool_id;
                      const checked = partialApprovalIds === null || partialApprovalIds.includes(toolId);
                      return (
                        <label key={toolId} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (partialApprovalIds === null) {
                                // Avmarkera just denna
                                const allIds = selectedRequest.tool_details.map(t => t.tool_id);
                                setPartialApprovalIds(allIds.filter(id => id !== toolId));
                              } else if (e.target.checked) {
                                const newIds = [...partialApprovalIds, toolId];
                                if (newIds.length === selectedRequest.tool_details.length) setPartialApprovalIds(null);
                                else setPartialApprovalIds(newIds);
                              } else {
                                setPartialApprovalIds(partialApprovalIds.filter(id => id !== toolId));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{tool.tool_name}</span>
                        </label>
                      );
                    }) ?? selectedRequest.tool_names.map((name, idx) => (
                      <label key={idx} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked className="w-4 h-4" readOnly />
                        <span className="text-sm">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Justerat återlämningsdatum */}
              <div>
                <label className="block text-sm font-medium mb-1">Justera återlämningsdatum (valfritt)</label>
                <input
                  type="date"
                  value={approveAdjustedDate}
                  onChange={(e) => setApproveAdjustedDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Lämna tomt för att behålla det önskade datumet</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Din kommentar</label>
                <Textarea
                  placeholder="Lägg till eventuell kommentar..."
                  value={approverComment}
                  onChange={(e) => setApproverComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="destructive" onClick={() => handleApprove(false)} disabled={approveMutation.isPending}>
                <XCircle className="w-4 h-4 mr-1.5" />
                Neka
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleApprove(true)}
                disabled={approveMutation.isPending || (partialApprovalIds !== null && partialApprovalIds.length === 0)}
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                {partialApprovalIds !== null && partialApprovalIds.length < selectedRequest.tool_names.length
                  ? `Godkänn ${partialApprovalIds.length} av ${selectedRequest.tool_names.length}`
                  : 'Godkänn'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Extension Dialog */}
      {selectedRequest && (
        <Dialog open={extensionDialogOpen} onOpenChange={setExtensionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Begär förlängning</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Maskiner: {selectedRequest.tool_names.join(', ')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Nuvarande återlämningsdatum: {new Date(selectedRequest.default_return_date).toLocaleDateString('sv-SE')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nytt återlämningsdatum *</label>
                <input
                  type="date"
                  value={extensionDate}
                  onChange={(e) => setExtensionDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kommentar</label>
                <Textarea
                  placeholder="Förklara varför förlängning behövs..."
                  value={extensionComment}
                  onChange={(e) => setExtensionComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExtensionDialogOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={handleExtend} disabled={extendMutation.isPending}>
                Skicka förlängningsbegäran
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Return Dialog */}
      {confirmReturnRequest && (
        <Dialog open={confirmReturnOpen} onOpenChange={(v) => { setConfirmReturnOpen(v); if (!v) { setConfirmReturnRequest(null); setConfirmReturnComment(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bekräfta mottagning av maskiner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="font-medium text-gray-900 dark:text-gray-100">{confirmReturnRequest.tool_names.join(', ')}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Återlämnade av: {confirmReturnRequest.assigned_to_name}</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bekräftar du att du har tagit emot ovanstående maskiner och att de är kontrollerade?
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">Kommentar (valfritt)</label>
                <Textarea
                  placeholder="T.ex. allt i gott skick..."
                  value={confirmReturnComment}
                  onChange={e => setConfirmReturnComment(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setConfirmReturnOpen(false); setConfirmReturnRequest(null); setConfirmReturnComment(''); }}>
                Avbryt
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => confirmReturnMutation.mutate({ loan_request_id: confirmReturnRequest.id, comment: confirmReturnComment })}
                disabled={confirmReturnMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-1.5" />
                Ja, jag har tagit emot maskinerna
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <EditLoanDialog
        request={editLoanRequest}
        open={editLoanOpen}
        onOpenChange={(v) => { setEditLoanOpen(v); if (!v) setEditLoanRequest(null); }}
        onEarlyReturn={(data) => updateReturnDateMutation.mutate(data)}
        onExtend={(data) => extendMutation.mutate(data)}
        isLoading={updateReturnDateMutation.isPending || extendMutation.isPending}
      />

      <AdminEditLoanDialog
        request={adminEditRequest}
        open={adminEditOpen}
        onOpenChange={(v) => { setAdminEditOpen(v); if (!v) setAdminEditRequest(null); }}
      />

      <LoanRequestModal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} />
    </div>
  );
}