import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';

// Roles that can self-deactivate
const SELF_SERVICE_ROLES = ['lokalvårdare', 'verktygsförvaltare'];
// Roles that need to specify a replacement
const ADMIN_ROLES = ['admin', 'admin_lokalvård', 'ägare'];

export default function DeactivateAccountDialog({ open, onOpenChange, user }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('deactivate');
  const [replacementUserId, setReplacementUserId] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);

  const canSelfDeactivate = SELF_SERVICE_ROLES.includes(user?.role);
  const needsReplacement = ADMIN_ROLES.includes(user?.role);

  // Fetch active users for replacement selection
  useEffect(() => {
    if (open && canSelfDeactivate) {
      const fetchUsers = async () => {
        try {
          const users = await base44.asServiceRole.entities.User.filter({ is_active: true });
          // Filter out current user
          setActiveUsers(users.filter(u => u.id !== user?.id));
        } catch (err) {
          console.error('Error fetching users:', err);
        }
      };
      fetchUsers();
    }
  }, [open, canSelfDeactivate, user?.id]);

  const handleDeactivate = async () => {
    if (needsReplacement && !replacementUserId) {
      setError('Vänligen välj en ersättare för dina ansvarsområden');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await base44.functions.invoke('deactivateUserAndTransferData', {
        deactivated_user_id: user?.id,
        replacement_user_id: needsReplacement ? replacementUserId : null
      });

      // Log out after deactivation
      base44.auth.logout();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Något gick fel.');
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    setLoading(true);
    setError('');
    try {
      // Find own TeamMember record
      const members = await base44.entities.TeamMember.filter({ email: user.email });
      const member = members[0];
      if (!member) {
        setError('Kunde inte hitta din teammedlemsprofil.');
        setLoading(false);
        return;
      }

      // Call permanent delete function
      await base44.functions.invoke('permanentlyDeleteUser', {
        targetMemberId: member.id,
        userEmail: user.email,
      });

      // Log out after deletion
      base44.auth.logout();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Något gick fel.');
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">Kontohantering</AlertDialogTitle>
        </AlertDialogHeader>

        {canSelfDeactivate ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`w-full ${user?.role === 'ägare' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="deactivate">Inaktivera</TabsTrigger>
              {user?.role === 'ägare' && (
                <TabsTrigger value="delete" className="text-red-600">Permanent borttagning</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="deactivate" className="space-y-3 py-4">
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <p>
                    Är du säker på att du vill <strong>inaktivera</strong> ditt konto? Du kommer inte längre
                    att kunna logga in på ToolTrack.
                  </p>
                  <p>
                    All din historik (ändringsloggar, lån, uttag m.m.) bevaras i systemet
                    och påverkas inte av inaktiveringen.
                  </p>
                  <p className="font-medium text-gray-700 dark:text-gray-200">
                    ✓ En administratör kan återaktivera ditt konto vid behov.
                  </p>
                  
                  {needsReplacement && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Välj ersättare för dina ansvarsområden:
                      </label>
                      <select
                        value={replacementUserId}
                        onChange={(e) => setReplacementUserId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white"
                        disabled={loading}
                      >
                        <option value="">-- Välj en person --</option>
                        {activeUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {error && (
                    <p className="text-red-600 font-medium">{error}</p>
                  )}
                </div>
              </AlertDialogDescription>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel disabled={loading}>Avbryt</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={loading || (needsReplacement && !replacementUserId)}
                >
                  {loading ? 'Inaktiverar...' : 'Inaktivera'}
                </Button>
              </AlertDialogFooter>
            </TabsContent>

            {user?.role === 'ägare' && (
            <TabsContent value="delete" className="space-y-3 py-4">
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-3">
                    <p className="font-semibold text-red-700 dark:text-red-400 mb-2">⚠️ Varning: Denna åtgärd kan inte ångras</p>
                    <p className="text-red-600 dark:text-red-300">
                      Permanent borttagning raderar ditt konto och <strong>all</strong> associerad data från systemet.
                      Detta kan påverka rapporter och historik som är kopplad till dina åtgärder.
                    </p>
                  </div>
                  {error && (
                    <p className="text-red-600 font-medium">{error}</p>
                  )}
                </div>
              </AlertDialogDescription>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel disabled={loading}>Avbryt</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={handlePermanentDelete}
                  disabled={loading}
                >
                  {loading ? 'Tar bort...' : 'Radera slutgiltigt'}
                </Button>
              </AlertDialogFooter>
            </TabsContent>
            )}
          </Tabs>
        ) : (
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 py-4">
              <p>
                Som <strong>{user?.role}</strong> kan du inte inaktivera eller ta bort ditt konto själv.
              </p>
              <p>
                Kontakta en administratör eller ägare för att hantera kontoåtkomst.
                De behöver först utse en ersättare för dina ansvarsområden innan
                kontot kan inaktiveras eller tas bort.
              </p>
              {error && (
                <p className="text-red-600 font-medium">{error}</p>
              )}
            </div>
          </AlertDialogDescription>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}