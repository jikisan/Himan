import type { CategoryType } from '../types';

export class Category implements CategoryType {
  id: string;
  name: string;
  icon: string | null;
  userId: string;
  passwordCount?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: CategoryType) {
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon;
    this.userId = data.userId;
    this.passwordCount = data.passwordCount;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}
