import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { ProfileRepository } from '../../infrastructure';
import type { ProfileUpsertDto } from '@himan/shared/profile';
import { Logger } from '@core/infrastructure/services';

export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: string) => [...profileKeys.all, userId] as const,
};

export const useProfile = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const repository = useMemo(() => new ProfileRepository(), []);

  const { data: profile = null, isLoading: loading, error } = useQuery({
    queryKey: profileKeys.detail(userId || ''),
    queryFn: () => repository.get(userId!),
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: (dto: Omit<ProfileUpsertDto, 'userId'>) => repository.upsert({ ...dto, userId: userId! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.all }),
    onError: (err) => {
      Logger.error('Error saving profile', err);
      toast.error('Failed to save profile');
    },
  });

  return {
    profile,
    loading,
    error: error?.message ?? null,
    save: (dto: Omit<ProfileUpsertDto, 'userId'>) => saveMutation.mutateAsync(dto),
  };
};
