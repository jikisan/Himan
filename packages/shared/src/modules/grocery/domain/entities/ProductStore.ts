import type { ProductStoreType } from '../types/index.js';

export class ProductStore implements ProductStoreType {
  id: string;
  productId: string;
  storeId: string;
  price: number | null;
  aisle: string | null;
  availability: boolean;
  sku: string | null;
  updatedAt: Date;

  constructor(data: ProductStoreType) {
    this.id = data.id;
    this.productId = data.productId;
    this.storeId = data.storeId;
    this.price = data.price;
    this.aisle = data.aisle;
    this.availability = data.availability;
    this.sku = data.sku;
    this.updatedAt = data.updatedAt;
  }
}
