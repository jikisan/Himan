import type { PropertyInput, RenterInput, UnitInput } from './schemas.js';
import type { RentalRole } from './roles.js';

export interface RentalUnit extends UnitInput { id: string; propertyId: string }
export interface RentalProperty extends PropertyInput {
  id: string; createdBy: string; role: RentalRole; archivedAt: string | null;
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
  moveIn: string; moveOut: string | null; contracts: RentalContract[];
}
export interface RentalMember { userId: string; email: string; role: RentalRole }
