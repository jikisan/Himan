import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { GroceryInvitationRepository } from '../../infrastructure/repositories';
import { groceryKeys } from './queryKeys';
import { Logger } from '@core/infrastructure/services';

export const useGroceryInvitations = (listId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new GroceryInvitationRepository(), []);
  const userId = user?.id;
  const userEmail = user?.email;

  // Pending invitations for the current user
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: groceryKeys.invitations(),
    queryFn: () => repository.findPendingForUser(userEmail!),
    enabled: !!userEmail,
  });

  // Invitations for a specific list (for the share dialog)
  const { data: listInvitations = [] } = useQuery({
    queryKey: [...groceryKeys.invitations(), listId],
    queryFn: () => repository.findByListId(listId!),
    enabled: !!listId,
  });

  // Members of a specific list
  const { data: members = [] } = useQuery({
    queryKey: groceryKeys.members(listId!),
    queryFn: () => repository.getMembers(listId!),
    enabled: !!listId,
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      repository.create(listId!, email, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.invitations() });
      toast.success('Invitation sent');
    },
    onError: (err) => {
      // ShareListDialog shows the failure under the email field.
      Logger.error('Error sending invitation', err);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (invitationId: string) =>
      repository.accept(invitationId, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.invitations() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
      toast.success('Invitation accepted');
    },
    onError: (err) => {
      Logger.error('Error accepting invitation', err);
      toast.error('Failed to accept invitation');
    },
  });

  const declineMutation = useMutation({
    mutationFn: (invitationId: string) => repository.decline(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.invitations() });
      toast.success('Invitation declined');
    },
    onError: (err) => {
      Logger.error('Error declining invitation', err);
      toast.error('Failed to decline invitation');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) => repository.cancel(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.invitations() });
      toast.success('Invitation cancelled');
    },
    onError: (err) => {
      Logger.error('Error cancelling invitation', err);
      toast.error('Failed to cancel invitation');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberUserId: string) =>
      repository.removeMember(listId!, memberUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.members(listId!) });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
      toast.success('Member removed');
    },
    onError: (err) => {
      Logger.error('Error removing member', err);
      toast.error('Failed to remove member');
    },
  });

  const invite = useCallback(
    (email: string) => inviteMutation.mutateAsync(email),
    [inviteMutation]
  );

  const acceptInvitation = useCallback(
    (invitationId: string) => acceptMutation.mutateAsync(invitationId),
    [acceptMutation]
  );

  const declineInvitation = useCallback(
    (invitationId: string) => declineMutation.mutateAsync(invitationId),
    [declineMutation]
  );

  const cancelInvitation = useCallback(
    (invitationId: string) => cancelMutation.mutateAsync(invitationId),
    [cancelMutation]
  );

  const removeMember = useCallback(
    (memberUserId: string) => removeMemberMutation.mutateAsync(memberUserId),
    [removeMemberMutation]
  );

  return {
    pendingInvitations,
    listInvitations,
    members,
    invite,
    acceptInvitation,
    declineInvitation,
    cancelInvitation,
    removeMember,
  };
};
