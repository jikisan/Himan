import type { CardCategoryType } from '../types';

export class CardCategory implements CardCategoryType {
  id: string;
  name: string;
  icon: string | null;
  userId: string;
  cardCount?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: CardCategoryType) {
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon;
    this.userId = data.userId;
    this.cardCount = data.cardCount;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}