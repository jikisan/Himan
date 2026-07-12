import type { GroceryItemType } from '../types/index.js';

export class GroceryItem implements GroceryItemType {
  id: string;
  listId: string;
  productId: string | null;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  isChecked: boolean;
  checkedBy: string | null;
  checkedAt: Date | null;
  price: number | null;
  addedBy: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: GroceryItemType) {
    this.id = data.id;
    this.listId = data.listId;
    this.productId = data.productId;
    this.name = data.name;
    this.category = data.category;
    this.quantity = data.quantity;
    this.unit = data.unit;
    this.notes = data.notes;
    this.isChecked = data.isChecked;
    this.checkedBy = data.checkedBy;
    this.checkedAt = data.checkedAt;
    this.price = data.price;
    this.addedBy = data.addedBy;
    this.sortOrder = data.sortOrder;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get quantityLabel(): string {
    if (this.unit) {
      return `${this.quantity} ${this.unit}`;
    }
    return this.quantity > 1 ? `${this.quantity} pcs` : '';
  }

  get isLinkedToProduct(): boolean {
    return this.productId !== null;
  }
}
