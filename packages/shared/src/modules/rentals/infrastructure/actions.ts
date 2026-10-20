import { getLogger } from '../../../services/index.js';
import { DEFAULT_CLAUSES } from '../domain/index.js';
import type { BillLine, Clause, ContractTermsInput, InPersonDetails, LinkKind, MeterKind, PaymentAccountInput, PaymentInput, PropertyInput, ReadingInput,
  RenterInput, SettlementInput, SignMode, StartTenancyInput, TenancyCharge, UnitInput, UtilityBillInput } from '../domain/index.js';
import type { BillRepository, IssueBillInput } from './BillRepository.js';
import type { ContractRepository } from './ContractRepository.js';
import type { LinkRepository } from './LinkRepository.js';
import type { PaymentAccountRepository } from './PaymentAccountRepository.js';
import type { PaymentRepository } from './PaymentRepository.js';
import type { PropertyRepository } from './PropertyRepository.js';
import type { RenterRepository } from './RenterRepository.js';
import type { SettlementRepository } from './SettlementRepository.js';
import type { TenancyRepository } from './TenancyRepository.js';
import { issueBills, moveIn, moveOut, setupProperty } from './flows.js';
import type { MoveInInput } from './flows.js';

type FileInput = { name: string; mimeType?: string | null; bytes: ArrayBuffer };

/** Every write the rentals screens make, on web and mobile alike. */
export type RentalAction =
  | { type: 'saveProperty'; id: string | null; input: PropertyInput }
  | { type: 'archiveProperty'; id: string; archived: boolean }
  | { type: 'removeProperty'; id: string }
  | { type: 'saveUnit'; propertyId: string; id: string | null; input: UnitInput }
  | { type: 'removeUnit'; id: string }
  | { type: 'saveRenter'; propertyId: string; id: string | null; input: RenterInput }
  | { type: 'removeRenter'; id: string }
  | { type: 'uploadRenterFile'; renterId: string; propertyId: string; file: FileInput }
  | { type: 'removeRenterFile'; id: string }
  | { type: 'startTenancy'; input: StartTenancyInput }
  | { type: 'endTenancy'; id: string; moveOut: string }
  /** One transaction: the person (if new), tenancy, move-in bill and payment; resolves to { renterId, tenancyId, billId, paymentId, warnings }. */
  | ({ type: 'moveIn' } & MoveInInput)
  | { type: 'updateTerms'; contractId: string; input: ContractTermsInput }
  | { type: 'setupProperty'; input: PropertyInput; rooms: UnitInput[] }
  | { type: 'saveReadings'; propertyId: string; inputs: ReadingInput[] }
  | { type: 'saveUtilityBills'; propertyId: string; inputs: UtilityBillInput[] }
  | { type: 'removeReading'; id: string }
  | { type: 'issueBills'; inputs: IssueBillInput[] }
  | { type: 'updateBillLines'; id: string; lines: BillLine[] }
  | { type: 'voidBill'; id: string; reason: string }
  | { type: 'setCharges'; tenancyId: string; charges: TenancyCharge[] }
  | { type: 'setContractNotNeeded'; tenancyId: string; value: boolean }
  | { type: 'changeRent'; contractId: string; from: string; rentCentavos: number }
  | { type: 'moveOut'; tenancyId: string; moveOut: string; readings: { kind: MeterKind; value: number }[] }
  | { type: 'addMember'; propertyId: string; userId: string; role: 'manager' | 'viewer' }
  | { type: 'removeMember'; propertyId: string; userId: string }
  /** Records the payment, then attaches each proof; resolves to { id, failed: proof names that didn't upload }. */
  | { type: 'recordPayment'; tenancyId: string; input: PaymentInput; proofs?: FileInput[] }
  | { type: 'voidPayment'; id: string; reason: string }
  /** Pays off bills issued before payment tracking started; resolves to the number of payments created. */
  | { type: 'markEarlierPaid'; propertyId: string }
  | { type: 'uploadPaymentProof'; paymentId: string; propertyId: string; file: FileInput }
  | { type: 'removePaymentProof'; id: string }
  /** Settles the deposit (the database recomputes every figure), then attaches each proof; resolves to { id, failed }. */
  | { type: 'settleDeposit'; tenancyId: string; input: SettlementInput; proofs?: FileInput[] }
  | { type: 'uploadSettlementProof'; settlementId: string; propertyId: string; file: FileInput }
  | { type: 'removeSettlementProof'; id: string }
  | { type: 'saveAccount'; propertyId: string; id: string | null; input: PaymentAccountInput }
  | { type: 'removeAccount'; id: string }
  | { type: 'uploadQr'; propertyId: string; accountId: string; file: FileInput }
  /** Resolves to the new contract text's id. */
  | { type: 'createContractText'; contractId: string; propertyId: string; body: string[]; specialTerms: string; signMode: SignMode }
  | { type: 'updateContractText'; id: string; changes: { body?: string[]; specialTerms?: string; signMode?: SignMode } }
  | { type: 'sendContract'; id: string }
  /** Without a signature, the property's saved one is used. */
  | { type: 'countersign'; id: string; signature?: string }
  /** The tenant signs on this device; then their ID files are attached. Resolves to { failed: ID file names that didn't upload }. */
  | { type: 'signInPerson'; id: string; renterId: string; propertyId: string; name: string; signature: string; contentHash: string;
      details: InPersonDetails; ids: FileInput[] }
  | { type: 'setNotarizedScan'; id: string; file: FileInput }
  | { type: 'saveTemplate'; propertyId: string; clauses: Clause[] }
  | { type: 'saveLessorSignature'; propertyId: string; png: string }
  /** Resolves to the link's token; replaces (and turns off) an existing link for the tenancy. */
  | { type: 'createLink'; tenancyId: string; kind: LinkKind }
  | { type: 'revokeLink'; tenancyId: string }
  | { type: 'reopenLink'; tenancyId: string }
  /** Copies the submitted ID photos into the tenant's files, then the details onto the tenant. Safe to retry. */
  | { type: 'acceptDetails'; tenancyId: string };

export interface RentalRepos {
  properties: PropertyRepository; renters: RenterRepository; tenancies: TenancyRepository; bills: BillRepository; payments: PaymentRepository;
  accounts: PaymentAccountRepository; settlements: SettlementRepository; contracts: ContractRepository; links: LinkRepository;
  profile: { get(userId: string): Promise<{ fullName?: string | null } | null> };
}

/** Everything the owner's rentals screens show, loaded in one go. */
export async function loadRentals(repos: RentalRepos, userId: string) {
  const warn = (message: string, e: unknown) => getLogger().warn(message, e);
  const [[properties, templates], renters, tenancies, bills, readings, utilityBills, payments, accounts, settlements, contractTexts, links, profile] = await Promise.all([
    // Each property's contract template (the default one when the owner hasn't edited it), keyed by property id.
    // Owners also get their saved signature, which only they can read (one-tap countersign).
    repos.properties.findAll(userId).then((list) => Promise.all(list.map(async (p) => p.role !== 'owner' ? p
      : { ...p, lessorSignature: await repos.contracts.getLessorSignature(p.id).catch((e: unknown) => {
        warn(`Could not load the saved signature for property ${p.id}`, e);
        return null;
      }) })))
      .then(async (list) => [list, Object.fromEntries(
      await Promise.all(list.map(async (p) => [p.id, await repos.contracts.getTemplate(p.id).catch((e: unknown) => {
        // One unreadable template must not stop the whole page; contracts for that property start from the default.
        warn(`Could not load the contract template for property ${p.id}`, e);
        return DEFAULT_CLAUSES;
      })] as const)))] as const),
    repos.renters.findAll(), repos.tenancies.findAll(),
    repos.bills.findAll(), repos.bills.findReadings(), repos.bills.findUtilityBills(), repos.payments.findAll(), repos.accounts.findAll(), repos.settlements.findAll(),
    repos.contracts.findTexts(), repos.links.findAll(), repos.profile.get(userId).catch(() => null)]);
  return { properties, templates: templates as Record<string, Clause[]>, renters, tenancies, bills, readings, utilityBills, payments, accounts, settlements,
    contractTexts, links, myName: profile?.fullName?.trim() ?? '' };
}

export type RentalData = Awaited<ReturnType<typeof loadRentals>>;

/** Runs one action. `data` is the last load: move-out and proof uploads read the tenancy's property from it. */
export async function runRentalAction(repos: RentalRepos, a: RentalAction, data: RentalData | undefined) {
  const propertyOf = (tenancyId: string) => data?.tenancies.find((t) => t.id === tenancyId)?.propertyId;
  switch (a.type) {
    case 'saveProperty': return repos.properties.save(a.id, a.input);
    case 'archiveProperty': return repos.properties.setArchived(a.id, a.archived);
    case 'removeProperty': return repos.properties.remove(a.id);
    case 'saveUnit': return repos.properties.saveUnit(a.propertyId, a.id, a.input);
    case 'removeUnit': return repos.properties.removeUnit(a.id);
    case 'saveRenter': return repos.renters.save(a.propertyId, a.id, a.input);
    case 'removeRenter': return repos.renters.remove(a.id);
    case 'uploadRenterFile': return repos.renters.upload(a.renterId, a.propertyId, a.file);
    case 'removeRenterFile': return repos.renters.removeFile(a.id);
    case 'startTenancy': return repos.tenancies.start(a.input);
    case 'endTenancy': return repos.tenancies.end(a.id, a.moveOut);
    case 'moveIn': return moveIn(repos, a);
    case 'updateTerms': return repos.tenancies.updateTerms(a.contractId, a.input);
    case 'setupProperty': return setupProperty(repos, a);
    case 'saveReadings': return repos.bills.saveReadings(a.propertyId, a.inputs);
    case 'saveUtilityBills': return repos.bills.saveUtilityBills(a.propertyId, a.inputs);
    case 'removeReading': return repos.bills.removeReading(a.id);
    case 'issueBills': return issueBills(repos, a.inputs);
    case 'updateBillLines': return repos.bills.updateLines(a.id, a.lines);
    case 'voidBill': return repos.bills.void(a.id, a.reason);
    case 'setCharges': return repos.tenancies.setCharges(a.tenancyId, a.charges);
    case 'setContractNotNeeded': return repos.tenancies.setContractNotNeeded(a.tenancyId, a.value);
    case 'changeRent': return repos.tenancies.changeRent(a.contractId, a.from, a.rentCentavos);
    case 'moveOut': {
      const tenancy = data?.tenancies.find((t) => t.id === a.tenancyId);
      const property = data?.properties.find((p) => p.id === tenancy?.propertyId);
      if (!data || !property) throw new Error('Tenant not found');
      return moveOut(repos, { ctx: { property, tenancies: data.tenancies, readings: data.readings, bills: data.bills, utilityBills: data.utilityBills },
        tenancyId: a.tenancyId, moveOut: a.moveOut, readings: a.readings });
    }
    case 'addMember': return repos.properties.addMember(a.propertyId, a.userId, a.role);
    case 'removeMember': return repos.properties.removeMember(a.propertyId, a.userId);
    case 'recordPayment': {
      const id = await repos.payments.record({ ...a.input, tenancyId: a.tenancyId });
      const failed: string[] = [];
      for (const file of a.proofs ?? []) {
        try { await repos.payments.uploadProof(id, propertyOf(a.tenancyId)!, file); } catch { failed.push(file.name); }
      }
      return { id, failed };
    }
    case 'settleDeposit': {
      const id = await repos.settlements.settle(a.tenancyId, a.input);
      const failed: string[] = [];
      for (const file of a.proofs ?? []) {
        try { await repos.settlements.uploadProof(id, propertyOf(a.tenancyId)!, file); } catch { failed.push(file.name); }
      }
      return { id, failed };
    }
    case 'uploadSettlementProof': return repos.settlements.uploadProof(a.settlementId, a.propertyId, a.file);
    case 'removeSettlementProof': return repos.settlements.removeProof(a.id);
    case 'voidPayment': return repos.payments.void(a.id, a.reason);
    case 'markEarlierPaid': return repos.payments.markEarlierPaid(a.propertyId);
    case 'uploadPaymentProof': return repos.payments.uploadProof(a.paymentId, a.propertyId, a.file);
    case 'removePaymentProof': return repos.payments.removeProof(a.id);
    case 'saveAccount': return repos.accounts.save(a.propertyId, a.id, a.input);
    case 'removeAccount': return repos.accounts.remove(a.id);
    case 'uploadQr': return repos.accounts.uploadQr(a.propertyId, a.accountId, a.file);
    case 'createContractText': return repos.contracts.createText(a.contractId, a.propertyId, a.body, a.specialTerms, a.signMode);
    case 'updateContractText': return repos.contracts.updateText(a.id, a.changes);
    case 'sendContract': return repos.contracts.send(a.id);
    case 'countersign': return repos.contracts.countersign(a.id, a.signature);
    case 'signInPerson': {
      await repos.contracts.signInPerson(a.id, { name: a.name, signature: a.signature, contentHash: a.contentHash, details: a.details });
      const failed: string[] = [];
      for (const file of a.ids) {
        try { await repos.renters.upload(a.renterId, a.propertyId, file); } catch { failed.push(file.name); }
      }
      return { failed };
    }
    case 'setNotarizedScan': return repos.contracts.setNotarizedScan(a.id, a.file);
    case 'saveTemplate': return repos.contracts.saveTemplate(a.propertyId, a.clauses);
    case 'saveLessorSignature': return repos.contracts.saveLessorSignature(a.propertyId, a.png);
    case 'createLink': return repos.links.createLink(a.tenancyId, a.kind);
    case 'revokeLink': return repos.links.revoke(a.tenancyId);
    case 'reopenLink': return repos.links.reopen(a.tenancyId);
    case 'acceptDetails': return repos.links.acceptDetails(a.tenancyId);
  }
}
