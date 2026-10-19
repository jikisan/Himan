import type { BillLine, MeterKind, PropertyInput, RenterInput, TenancyCharge, UnitInput } from './schemas.js';
import type { RentalRole } from './roles.js';

export interface RentalUnit extends UnitInput { id: string; propertyId: string }
export interface RentalProperty extends PropertyInput {
  id: string; createdBy: string; role: RentalRole; archivedAt: string | null;
  /** Bills issued before this date predate payment tracking (null: everything is tracked). */
  paymentsTrackedFrom: string | null;
  /** The owner's saved signature (PNG data URL) used to countersign in one tap. */
  lessorSignature?: string | null;
  units: RentalUnit[]; createdAt: string; updatedAt: string;
}
export interface RenterFile {
  id: string; renterId: string; propertyId: string; name: string; mimeType: string;
  size: number; storagePath: string; ready: boolean;
}
export interface Renter extends RenterInput { id: string; propertyId: string; files: RenterFile[] }
export interface RentalContract {
  id: string; tenancyId: string; startDate: string; endDate: string; monthlyRentCentavos: number;
  dueDay: number; advanceMonths: number; depositCentavos: number; status: 'draft' | 'active' | 'ended';
}
export interface RentalTenancy {
  id: string; propertyId: string; unitId: string; renterId: string;
  moveIn: string; moveOut: string | null; contracts: RentalContract[]; charges: TenancyCharge[];
  /** Holds the bed while the contract waits for both signatures; no bills or payments until it is activated.
   * Always set when loaded; optional so hand-built tenancies default to active. */
  pending?: boolean;
}
export interface RentalMember { userId: string; email: string; role: RentalRole }
export interface MeterReading {
  id: string; propertyId: string; unitId: string; kind: MeterKind; readOn: string; value: number; isReset: boolean;
}
/** A room's actual utility bill for one month (utilities set to 'monthly'). */
export interface UtilityBill { id: string; propertyId: string; unitId: string; kind: MeterKind; period: string; amountCentavos: number }
export interface RentalBill {
  id: string; propertyId: string; tenancyId: string; kind: 'move_in' | 'monthly' | 'final'; period: string; number: string;
  issuedOn: string; dueOn: string; lines: BillLine[]; status: 'issued' | 'void'; voidReason: string;
}
