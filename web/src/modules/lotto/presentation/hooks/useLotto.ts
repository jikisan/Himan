import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readHiddenApps } from '@himan/shared/dashboard';
import type { LottoDraw, LottoNumbersInput } from '@himan/shared/lotto';
import type { LottoDrawFilter } from '@himan/shared/lotto';
import { useAuth } from '@auth/index';
import { LottoRepository } from '../../infrastructure';

const PAGE = 30;

/** Lotto is on unless the user hid its tile on the dashboard; hiding the tile also hides the strip and sidebar link. */
export function useLottoEnabled() {
  const { user } = useAuth();
  return !readHiddenApps(user?.user_metadata).includes('lotto');
}

const useRepository = () => useMemo(() => new LottoRepository(), []);

/** The newest draw of each game. */
export function useLottoLatest(enabled = true) {
  const repository = useRepository();
  return useQuery({ queryKey: ['lotto', 'latest'], queryFn: () => repository.latest(), enabled, staleTime: 5 * 60_000 });
}

/** Past draws, newest first, a page at a time. */
export function useLottoDraws(filter: Omit<LottoDrawFilter, 'through'>) {
  const repository = useRepository();
  const query = useInfiniteQuery({
    queryKey: ['lotto', 'draws', filter],
    queryFn: ({ pageParam }) => repository.draws({ ...filter, through: pageParam }, PAGE),
    initialPageParam: undefined as string | undefined,
    // The next page starts on the last day shown, so draws of that day cut off by the page size are not lost; they are de-duplicated below.
    getNextPageParam: (last: LottoDraw[]) => (last.length === PAGE ? last.at(-1)!.drawDate : undefined),
    staleTime: 5 * 60_000,
  });
  const draws = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages.flat() ?? []).filter((d) => !seen.has(d.id) && !!seen.add(d.id));
  }, [query.data]);
  return { draws, loading: query.isLoading, error: query.error, more: query.hasNextPage, loadingMore: query.isFetchingNextPage, loadMore: query.fetchNextPage, refetch: query.refetch };
}

type Action =
  | { type: 'save'; id: string | null; input: LottoNumbersInput }
  | { type: 'active'; id: string; active: boolean }
  | { type: 'remove'; id: string };

/** The user's maintained numbers and the changes to them. */
export function useLottoNumbers(enabled = true) {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repository = useRepository();
  const key = ['lotto', 'numbers', userId];
  const query = useQuery({ queryKey: key, queryFn: () => repository.numbers(userId!), enabled: enabled && !!userId });
  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (!userId) throw new Error('Sign in to keep your numbers');
      switch (action.type) {
        case 'save': return repository.saveNumbers(userId, action.id, action.input);
        case 'active': return repository.setActive(userId, action.id, action.active);
        case 'remove': return repository.removeNumbers(userId, action.id);
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
  return { sets: query.data ?? [], loading: query.isLoading, error: query.error, busy: mutation.isPending, run: mutation.mutateAsync };
}
