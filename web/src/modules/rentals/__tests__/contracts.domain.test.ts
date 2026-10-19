import { describe, expect, it } from 'vitest';
import {
  CONTRACT_FIELDS, DEFAULT_CLAUSES, NOTARY_ACKNOWLEDGMENT, canonicalText, contractStage, contractStatusLabel, contractValues, linkMessage,
  linkDetailsSchema, ordinal, renderClauses, resolveLessee, sha256Hex,
} from '@himan/shared/rentals';
import type { ContractText, RentalContract, RentalProperty, RentalTenancy, Renter } from '@himan/shared/rentals';

const property = {
  name: 'House', address: 'Lot 1, Sample St., Sample City', lessorName: 'Ana Reyes', lessorCivilStatus: 'married',
  lessorAddress: 'Unit 1, Sample Bldg', lessorCapacity: 'representative', signingCity: 'Cebu City',
} as RentalProperty;
const renter = { fullName: 'Ben Cruz', address: 'Purok 2, Sample' } as Renter;
const contract = { startDate: '2026-08-30', endDate: '2027-08-30', monthlyRentCentavos: 1_000_000, dueDay: 30,
  advanceMonths: 1, depositCentavos: 1_000_000 } as RentalContract;
const full = contractValues({ property, renter, contract, signingDate: '2026-08-30' });
const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);

describe('contract template', () => {
  it('resolves every placeholder of the default template with full values', () => {
    const body = renderClauses(DEFAULT_CLAUSES, full).join('\n');
    expect(body).not.toMatch(/\{\{|\}\}|undefined|__________/);
    expect(body).toContain('Ana Reyes');
    expect(renderClauses(NOTARY_ACKNOWLEDGMENT, full).join('\n')).not.toMatch(/\{\{|undefined/);
  });
  it('prints a blank for placeholders that are not fields, even object built-ins', () => {
    expect(renderClauses([{ id: 'preamble', text: '{{constructor}} {{toString}} {{nope}}' }], full)).toEqual(['__________ __________ __________']);
  });
  it('only uses fields offered in the Insert field menu', () => {
    const keys = new Set(CONTRACT_FIELDS.map((f) => f.key));
    for (const clause of [...DEFAULT_CLAUSES, ...NOTARY_ACKNOWLEDGMENT]) {
      for (const key of placeholders(clause.text)) expect(keys, key).toContain(key);
    }
    expect(Object.keys(full).sort()).toEqual([...keys].sort());
  });
  it('keeps the 27 clauses with unique ids and no personal details from the sample', () => {
    const ids = DEFAULT_CLAUSES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const body = renderClauses(DEFAULT_CLAUSES, {});
    expect(body.filter((t) => /^\d+\. /.test(t))).toHaveLength(27);
    expect(body.find((t) => t.startsWith('27. '))).toMatch(/ejectment and other legal sanctions\.$/);
    const all = JSON.stringify([DEFAULT_CLAUSES, NOTARY_ACKNOWLEDGMENT]);
    for (const personal of ['Santerna', 'SANTERNA', 'June Kyle', 'Kin Wah', 'Bakilid', 'Camputhaw', 'Lahug', 'Purok 4', '6000',
      'Cebu', 'storage room', 'third floor', 'August']) expect(all, personal).not.toContain(personal);
  });
  it('renders a missing value as a visible blank line', () => {
    const body = renderClauses([{ id: 'x', text: 'Leased by {{lessor_name}}, {{lessor_civil_status}}.' }],
      { ...full, lessor_civil_status: '' });
    expect(body).toEqual(['1. Leased by Ana Reyes, __________.']);
    expect(renderClauses([{ id: 'preamble', text: 'At {{signing_city}}' }], {})).toEqual(['At __________']);
  });
  it('numbers clauses in order, skipping the preamble and closing, so reordering renumbers', () => {
    const body = renderClauses([{ id: 'preamble', text: 'Intro' }, { id: 'b', text: 'B' }, { id: 'a', text: 'A' },
      { id: 'closing', text: 'End' }], {});
    expect(body).toEqual(['Intro', '1. B', '2. A', 'End']);
  });
});

describe('contractValues', () => {
  it('formats dates, the due day ordinal and amounts in words', () => {
    expect(full).toMatchObject({
      lessor_name: 'Ana Reyes', lessor_capacity: 'the representative of the owner and the authorized representative',
      lessee_name: 'Ben Cruz', lessee_address: 'Purok 2, Sample', property_address: 'Lot 1, Sample St., Sample City',
      term_start: 'August 30, 2026', term_end: 'August 30, 2027', due_day_ordinal: '30th',
      monthly_rent: '₱10,000.00', monthly_rent_words: 'TEN THOUSAND PESOS ONLY',
      advance: '₱10,000.00', advance_words: 'TEN THOUSAND PESOS ONLY', deposit: '₱10,000.00', deposit_words: 'TEN THOUSAND PESOS ONLY',
      signing_city: 'Cebu City', signing_date: '30th day of August, 2026',
    });
  });
  it('multiplies the advance by its months and leaves unknowns blank', () => {
    const v = contractValues({ property: { ...property, lessorCapacity: 'owner', lessorCivilStatus: '' },
      contract: { ...contract, advanceMonths: 2 } });
    expect(v).toMatchObject({ lessor_capacity: 'the owner', advance: '₱20,000.00', advance_words: 'TWENTY THOUSAND PESOS ONLY',
      lessor_civil_status: '', lessee_name: '', signing_date: '' });
  });
});

describe('canonicalText and sha256Hex', () => {
  it('joins the body with newlines and appends the special terms exactly as the database hashes it', async () => {
    expect(canonicalText(['a', 'b'], 'x')).toBe('a\nb\nSPECIAL:x');
    expect(await sha256Hex(canonicalText(['a', 'b'], 'x'))).toBe('1c61d1e0ead0fb67872f2b8e6d8e7da559c60b821ee8275c166fbd74ac2beb84');
    expect(await sha256Hex(canonicalText(['Clause one.', 'Clause two.'], '')))
      .toBe('8d778751277876b46638f0817f8fa128be90fa2dff392887de444cc68fc26db0');
    expect(await sha256Hex(canonicalText(['Rent ₱10,000.00', 'Two'], 'No pets’')))
      .toBe('f82c288578f9a42fc623120984e5be734b21180bbdef26875ba72a9a4a1a4ba3');
  });
});

describe('wording helpers', () => {
  it('writes ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31].map(ordinal))
      .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '30th', '31st']);
  });
  it('describes each contract status in plain words', () => {
    expect(contractStatusLabel('draft', null)).toBe('Draft, not sent yet');
    expect(contractStatusLabel('sent', null)).toBe('Waiting for the tenant to sign');
    expect(contractStatusLabel('signed', 'esign')).toBe('Signed by the tenant, waiting for your signature');
    expect(contractStatusLabel('countersigned', 'esign')).toBe('Signed by both');
    expect(contractStatusLabel('countersigned', 'notarize')).toBe('Signed by both, to be notarized');
  });
  it('writes the Messenger message for new and existing tenants', () => {
    const forNew = linkMessage('https://x/r/abc', 'Ben Cruz', 'new');
    expect(forNew).toContain('Hi Ben!');
    expect(forNew).toContain('fill in your details');
    expect(forNew).toContain('https://x/r/abc');
    const forExisting = linkMessage('https://x/r/abc', 'Ben Cruz', 'existing');
    expect(forExisting).not.toContain('details');
    expect(forExisting).toContain('sign');
  });
});

describe('linkDetailsSchema ID paths', () => {
  const base = { fullName: 'A', phone: '1', address: 'x', emergencyName: 'B', emergencyPhone: '2', facebook: '', email: '', occupants: 1 };
  it('accepts plain files and rejects traversal, nesting and odd extensions', () => {
    expect(linkDetailsSchema.safeParse({ ...base, idPaths: ['tok_1-A/0123abcd.png'] }).success).toBe(true);
    for (const bad of ['../x/a.png', 'tok/../a.png', 'tok/sub/a.png', 'tok/a.exe', '/tok/a.png', 'tok/a.png/']) {
      expect(linkDetailsSchema.safeParse({ ...base, idPaths: [bad] }).success).toBe(false);
    }
  });
});

describe('contractStage', () => {
  const c = (id: string, status: RentalContract['status']) => ({ ...contract, id, tenancyId: 't', status });
  const tenancy = (extra: Partial<RentalTenancy> = {}) => ({ id: 't', propertyId: 'p', unitId: 'u', renterId: 'r', moveIn: '2026-01-01',
    moveOut: null, charges: [], contracts: [c('c1', 'active')], ...extra }) as RentalTenancy;
  const text = (status: ContractText['status'], contractId = 'c1') => ({ id: `x-${contractId}`, contractId, status }) as ContractText;

  it('follows the written contract from none to done', () => {
    expect(contractStage(tenancy(), [])).toBe('none');
    expect(contractStage(tenancy(), [text('draft', 'other')])).toBe('none');
    expect(contractStage(tenancy(), [text('draft')])).toBe('draft');
    expect(contractStage(tenancy(), [text('sent')])).toBe('sent');
    expect(contractStage(tenancy(), [text('signed')])).toBe('signed');
    expect(contractStage(tenancy(), [text('countersigned')])).toBe('done');
  });

  it('is not needed once dismissed, unless the contract was already sent', () => {
    expect(contractStage(tenancy({ contractNotNeeded: true }), [])).toBe('not_needed');
    expect(contractStage(tenancy({ contractNotNeeded: true }), [text('draft')])).toBe('not_needed');
    expect(contractStage(tenancy({ contractNotNeeded: true }), [text('sent')])).toBe('sent');
    expect(contractStage(tenancy({ contractNotNeeded: true }), [text('countersigned')])).toBe('done');
  });

  it('keeps a signed contract done after a rent change renews it without text', () => {
    const renewed = tenancy({ contracts: [c('c2', 'active'), c('c1', 'ended')] });
    expect(contractStage(renewed, [text('countersigned', 'c1')])).toBe('done');
    expect(contractStage(renewed, [text('countersigned', 'c1'), text('draft', 'c2')])).toBe('draft');
  });
});

describe('lessee placeholders', () => {
  it('keeps {{lessee_name}} and {{lessee_address}} for a stored text and resolves everything else', () => {
    const body = renderClauses(DEFAULT_CLAUSES, full, { keepLessee: true }).join('\n');
    expect(placeholders(body)).toEqual(['lessee_name', 'lessee_address']);
    expect(body).toContain('Ana Reyes');
  });

  it('resolves them by plain replacement in every line, trimmed, with a blank for an empty value', () => {
    const body = ['{{lessee_name}} of {{lessee_address}}', 'Again {{lessee_name}}', 'No field'];
    expect(resolveLessee(body, '  Ben Cruz ', '')).toEqual(['Ben Cruz of __________', 'Again Ben Cruz', 'No field']);
    // Literal: "$&" in a name is printed as typed.
    expect(resolveLessee(['{{lessee_name}}'], 'A $& B', 'x')).toEqual(['A $& B']);
    // Texts made before the placeholders stayed are already resolved: nothing changes.
    expect(resolveLessee(['1. Ben Cruz, of Purok 2'], 'Other', 'Else')).toEqual(['1. Ben Cruz, of Purok 2']);
  });
});
