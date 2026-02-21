import type { InvoiceSavedOptionType, SavedOptionType } from '../types';

export class InvoiceSavedOption {
  readonly id: string;
  readonly userId: string;
  readonly optionType: SavedOptionType;
  readonly label: string;
  readonly value: string;
  readonly isDefault: boolean;
  readonly sortOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: InvoiceSavedOptionType) {
    this.id = data.id;
    this.userId = data.userId;
    this.optionType = data.optionType;
    this.label = data.label;
    this.value = data.value;
    this.isDefault = data.isDefault;
    this.sortOrder = data.sortOrder;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
