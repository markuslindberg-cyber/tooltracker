import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const HIGH_PRIVILEGE_ROLES = ['admin', 'admin_lokalvård', 'admin lokalvård', 'ägare'];

export default function InactivateUserDialog({ isOpen, onClose, member, activeMembers, onConfirm, isLoading }) {
  const [replacementId, setReplacementId] = useState('');

  const requiresReplacement = member && HIGH_PRIVILEGE_ROLES.includes(member.role);

  const otherActiveMembers = activeMembers?.filter(m => m.id !== member?.id && m.is_active !== false) || [];

  const handleConfirm = () => {
    onConfirm(member?.id, replacementId || null);
  };

  const handleClose = () => {
    setReplacementId('');
    onClose();
  };

  const canConfirm = requiresReplacement ? !!replacementId : true;

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Inaktivera användare
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">
            Du håller på att inaktivera <strong>{member.name}</strong>. Personen kommer inte längre kunna logga in eller tilldelas nytt ansvar.
          </p>

          {requiresReplacement && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Ersättare krävs.</strong> Eftersom {member.name} har rollen <em>{member.role}</em> måste du ange en person som tar över deras aktiva ansvar.
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {requiresReplacement ? 'Ersättare *' : 'Ersättare (valfritt)'}
            </Label>
            <p className="text-xs text-gray-500">
              Ersättaren tar över aktiva platser och tilldelningar. Historik i loggar påverkas inte.
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => setReplacementId('')}
                className={cn(
                  "w-full flex items-center px-4 py-3 text-sm border-b border-gray-100 text-left transition-colors",
                  replacementId === '' ? "bg-gray-100 font-medium text-gray-700" : "hover:bg-gray-50 text-gray-500"
                )}
              >
                {requiresReplacement ? '— Välj ersättare —' : 'Ingen ersättare'}
              </button>
              {otherActiveMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setReplacementId(m.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100 last:border-0 text-left transition-colors",
                    replacementId === m.id
                      ? "bg-[#8B1E1E]/8 text-[#8B1E1E] font-medium"
                      : "hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <div>
                    <span className="font-medium">{m.name}</span>
                    {m.email && <span className="ml-2 text-gray-400 text-xs">{m.email}</span>}
                  </div>
                  {replacementId === m.id && (
                    <span className="w-2 h-2 rounded-full bg-[#8B1E1E] flex-shrink-0" />
                  )}
                </button>
              ))}
              {otherActiveMembers.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400">Inga andra aktiva medlemmar</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
            Avbryt
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Inaktiverar...</>
            ) : (
              'Inaktivera användare'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}