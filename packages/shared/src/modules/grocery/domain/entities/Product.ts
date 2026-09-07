import type { ProductType } from '../types/index.js';

export class Product implements ProductType {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  brand: string | null;
  barcode: string | null;
  packageSize: string | null;
  imagePath: string | null;
  notes: string | null;
  isFavorite: boolean;
  defaultQuantity: number;
  defaultUnit: string | null;
  lifespanDays: number | null;
  lastPurchasedAt: Date | null;
  purchaseCount: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: ProductType) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.category = data.category;
    this.brand = data.brand;
    this.barcode = data.barcode;
    this.packageSize = data.packageSize;
    this.imagePath = data.imagePath;
    this.notes = data.notes;
    this.isFavorite = data.isFavorite;
    this.defaultQuantity = data.defaultQuantity;
    this.defaultUnit = data.defaultUnit;
    this.lifespanDays = data.lifespanDays;
    this.lastPurchasedAt = data.lastPurchasedAt;
    this.purchaseCount = data.purchaseCount;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get estimatedDepletionDate(): Date | null {
    if (!this.lastPurchasedAt || !this.lifespanDays) return null;
    const depletion = new Date(this.lastPurchasedAt);
    depletion.setDate(depletion.getDate() + this.lifespanDays);
    return depletion;
  }

  get isRunningLow(): boolean {
    const depletion = this.estimatedDepletionDate;
    if (!depletion) return false;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return depletion <= threeDaysFromNow;
  }

  get daysSinceLastPurchase(): number | null {
    if (!this.lastPurchasedAt) return null;
    const diff = new Date().getTime() - this.lastPurchasedAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
