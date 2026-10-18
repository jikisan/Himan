import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_CLAUSES } from '@himan/shared/rentals';
import { useRentals } from '../presentation/hooks/useRentals';

const calls = vi.hoisted(() => ({ contracts: {} as Record<string, ReturnType<typeof vi.fn>>, links: {} as Record<string, ReturnType<typeof vi.fn>> }));
vi.mock('@auth/index', () => ({ useAuth: () => ({ user: { id: 'u' } }) }));
vi.mock('@himan/shared/friends', () => ({ FriendRepository: class { getFriends = vi.fn(async () => []); } }));
vi.mock('@himan/shared/profile', () => ({ ProfileRepository: class { get = vi.fn(async () => ({ fullName: 'Maria' })); } }));
vi.mock('../infrastructure', () => {
  const list = () => vi.fn(async () => []);
  return {
    PropertyRepository: class { findAll = vi.fn(async () => [{ id: 'p1' }, { id: 'p2' }]); },
    RenterRepository: class { findAll = list(); fileUrl = vi.fn(); },
    TenancyRepository: class { findAll = list(); },
    BillRepository: class { findAll = list(); findReadings = list(); findUtilityBills = list(); },
    PaymentRepository: class { findAll = list(); proofUrl = vi.fn(); },
    PaymentAccountRepository: class { findAll = list(); qrUrl = vi.fn(); },
    ContractRepository: class {
      constructor() {
        calls.contracts = { findTexts: vi.fn(async () => [{ id: 'ct' }]), getTemplate: vi.fn(async () => DEFAULT_CLAUSES),
          createText: vi.fn(async () => 'new-id'), updateText: vi.fn(), send: vi.fn(), countersign: vi.fn(), setNotarizedScan: vi.fn(),
          saveTemplate: vi.fn(), saveLessorSignature: vi.fn() };
        Object.assign(this, calls.contracts);
      }
    },
    LinkRepository: class {
      constructor() {
        calls.links = { findAll: vi.fn(async () => [{ tenancyId: 't' }]), createLink: vi.fn(async () => 'tok'), revoke: vi.fn(), reopen: vi.fn() };
        Object.assign(this, calls.links);
      }
    },
  };
});

const wrapper = ({ children }: { children: ReactNode }) =>
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;

describe('useRentals contracts', () => {
  it('loads contract texts, links and each property’s template with everything else', async () => {
    const { result } = renderHook(() => useRentals(), { wrapper });
    await waitFor(() => expect(result.current.contractTexts).toEqual([{ id: 'ct' }]));
    expect(result.current.links).toEqual([{ tenancyId: 't' }]);
    expect(result.current.templates).toEqual({ p1: DEFAULT_CLAUSES, p2: DEFAULT_CLAUSES });
    expect(calls.contracts.getTemplate).toHaveBeenCalledWith('p2');
  });

  it('runs the contract and link actions', async () => {
    const { result } = renderHook(() => useRentals(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const file = { name: 'scan.pdf', mimeType: 'application/pdf', bytes: new ArrayBuffer(1) };
    expect(await result.current.run({ type: 'createContractText', contractId: 'c', propertyId: 'p1', body: ['a'], specialTerms: 'x' })).toBe('new-id');
    await result.current.run({ type: 'updateContractText', id: 'ct', changes: { specialTerms: 'y' } });
    await result.current.run({ type: 'sendContract', id: 'ct' });
    await result.current.run({ type: 'countersign', id: 'ct', signature: 'data:image/png;base64,A' });
    await result.current.run({ type: 'setNotarizedScan', id: 'ct', file });
    await result.current.run({ type: 'saveTemplate', propertyId: 'p1', clauses: DEFAULT_CLAUSES });
    await result.current.run({ type: 'saveLessorSignature', propertyId: 'p1', png: 'data:image/png;base64,A' });
    expect(await result.current.run({ type: 'createLink', tenancyId: 't', kind: 'existing' })).toBe('tok');
    await result.current.run({ type: 'revokeLink', tenancyId: 't' });
    await result.current.run({ type: 'reopenLink', tenancyId: 't' });
    const c = calls.contracts;
    expect(c.createText).toHaveBeenCalledWith('c', 'p1', ['a'], 'x');
    expect(c.updateText).toHaveBeenCalledWith('ct', { specialTerms: 'y' });
    expect(c.send).toHaveBeenCalledWith('ct');
    expect(c.countersign).toHaveBeenCalledWith('ct', 'data:image/png;base64,A');
    expect(c.setNotarizedScan).toHaveBeenCalledWith('ct', file);
    expect(c.saveTemplate).toHaveBeenCalledWith('p1', DEFAULT_CLAUSES);
    expect(c.saveLessorSignature).toHaveBeenCalledWith('p1', 'data:image/png;base64,A');
    expect(calls.links.revoke).toHaveBeenCalledWith('t');
    expect(calls.links.reopen).toHaveBeenCalledWith('t');
  });
});
