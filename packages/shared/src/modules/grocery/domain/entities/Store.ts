import type { StoreType } from '../types/index.js';

export class Store implements StoreType {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: StoreType) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
