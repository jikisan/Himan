import { useMemo } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LottoDraw, LottoDrawFilter, LottoNumbersInput } from '@himan/shared/lotto';
import { useAuth } from '@/modules/auth';
import { LottoRepository } from '../../infrastructure';

const PAGE = 30;
const useRepository = () => useMemo(() => new LottoRepository(), []);

/** The newest draw of each game. */
export function useLottoLatest() {
  const repository = useRepository();
  return useQuery({ queryKey: ['lotto', 'latest'], queryFn: () => repository.latest(), staleTime: 5 * 60_000 });
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
  return { draws, loading: query.isLoading, error: query.error, more: query.hasNextPage, loadingMore: query.isFetchingNextPage,
    loadMore: query.fetchNextPage, refetch: query.refetch, refreshing: query.isRefetching && !query.isFetchingNextPage };
}

type Action =
  | { type: 'save'; id: string | null; input: LottoNumbersInput }
  | { type: 'active'; id: string; active: boolean }
  | { type: 'remove'; id: string };

/** The user's maintained numbers and the changes to them. */
export function useLottoNumbers() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repository = useRepository();
  const key = ['lotto', 'numbers', userId];
  const query = useQuery({ queryKey: key, queryFn: () => repository.numbers(userId!), enabled: !!userId });
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
