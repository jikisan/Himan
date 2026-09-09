import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { CertificateRepository } from '../../infrastructure';
import { sortByPosition, type CreateCertificateDto, type UpdateCertificateDto } from '@himan/shared/profile';
import { Logger } from '@core/infrastructure/services';

export const certificateKeys = {
  all: ['profile-certificates'] as const,
  list: (userId: string) => [...certificateKeys.all, userId] as const,
};

export const useCertificates = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const repository = useMemo(() => new CertificateRepository(), []);

  const { data: certificates = [], isLoading: loading, error } = useQuery({
    queryKey: certificateKeys.list(userId || ''),
    queryFn: async () => sortByPosition(await repository.findAll(userId!)),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: certificateKeys.all });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateCertificateDto, 'userId'>) => repository.create({ ...dto, userId: userId! }),
    onSuccess: () => {
      invalidate();
      toast.success('Certificate added');
    },
    onError: (err) => {
      Logger.error('Error creating certificate', err);
      toast.error('Failed to create certificate');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCertificateDto }) => repository.update(id, userId!, dto),
    onSuccess: () => {
      invalidate();
      toast.success('Certificate saved');
    },
    onError: (err) => {
      Logger.error('Error updating certificate', err);
      toast.error('Failed to save certificate');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id, userId!),
    onSuccess: () => {
      invalidate();
      toast.success('Certificate removed');
    },
    onError: (err) => {
      Logger.error('Error deleting certificate', err);
      toast.error('Failed to delete certificate');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => repository.reorder(userId!, orderedIds),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error reordering certificates', err);
      toast.error('Failed to reorder certificates');
    },
  });

  return {
    data: certificates,
    loading,
    error: error?.message ?? null,
    create: (dto: Omit<CreateCertificateDto, 'userId'>) => createMutation.mutateAsync(dto),
    update: (id: string, dto: UpdateCertificateDto) => updateMutation.mutateAsync({ id, dto }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    reorder: (orderedIds: string[]) => reorderMutation.mutateAsync(orderedIds),
  };
};
