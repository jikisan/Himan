import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { FriendRepository } from '@himan/shared/friends';
import { getLogger } from '@himan/shared';
import { groceryKeys } from './queryKeys';

const logger = getLogger();

export const useFriends = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new FriendRepository(), []);
  const userId = user?.id;

  const { data: friends = [] } = useQuery({
    queryKey: groceryKeys.friends(),
    queryFn: () => repository.getFriends(userId!),
    enabled: !!userId,
  });

  const { data: requests = [] } = useQuery({
    queryKey: groceryKeys.friendRequests(),
    queryFn: () => repository.getRequests(userId!),
    enabled: !!userId,
  });

  const incomingRequests = useMemo(
    () => requests.filter((r) => r.direction === 'incoming'),
    [requests]
  );
  const outgoingRequests = useMemo(
    () => requests.filter((r) => r.direction === 'outgoing'),
    [requests]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: groceryKeys.friends() });
    queryClient.invalidateQueries({ queryKey: groceryKeys.friendRequests() });
  };

  const sendMutation = useMutation({
    mutationFn: (email: string) => repository.sendRequest(email),
    onSuccess: () => {
      invalidate();
      Alert.alert('Success', 'Friend request sent');
    },
    onError: (err: Error) => {
      logger.error('Send friend request failed', err);
      Alert.alert('Error', err.message);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => repository.accept(id),
    onSuccess: invalidate,
    onError: (err) => {
      logger.error('Accept friend failed', err);
      Alert.alert('Error', 'Failed to accept request');
    },
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => repository.decline(id),
    onSuccess: invalidate,
    onError: (err) => {
      logger.error('Decline friend failed', err);
      Alert.alert('Error', 'Failed to decline request');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => repository.cancelRequest(id),
    onSuccess: invalidate,
    onError: (err) => {
      logger.error('Cancel request failed', err);
      Alert.alert('Error', 'Failed to cancel request');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => repository.remove(id),
    onSuccess: invalidate,
    onError: (err) => {
      logger.error('Remove friend failed', err);
      Alert.alert('Error', 'Failed to remove friend');
    },
  });

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    sendRequest: useCallback((email: string) => sendMutation.mutateAsync(email), [sendMutation]),
    accept: useCallback((id: string) => acceptMutation.mutateAsync(id), [acceptMutation]),
    decline: useCallback((id: string) => declineMutation.mutateAsync(id), [declineMutation]),
    cancelRequest: useCallback((id: string) => cancelMutation.mutateAsync(id), [cancelMutation]),
    remove: useCallback((id: string) => removeMutation.mutateAsync(id), [removeMutation]),
  };
};
