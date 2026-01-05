import type { TierType, SubscriptionType } from '../types';

export class Subscription {
  readonly id: string;
  readonly userId: string;
  readonly tier: TierType;
  readonly validUntil: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    id: string,
    userId: string,
    tier: TierType,
    validUntil: Date | null,
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.userId = userId;
    this.tier = tier;
    this.validUntil = validUntil;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Check if subscription is currently active
   */
  get isActive(): boolean {
    if (!this.validUntil) {
      return true; // No expiration = always active
    }
    return new Date() < this.validUntil;
  }

  /**
   * Check if subscription is expired
   */
  get isExpired(): boolean {
    return !this.isActive;
  }

  /**
   * Check if this is a free tier
   */
  get isFree(): boolean {
    return this.tier === 'free';
  }

  /**
   * Check if this is a beta tier
   */
  get isBeta(): boolean {
    return this.tier === 'beta';
  }

  /**
   * Check if this is a paid tier (pro or enterprise)
   */
  get isPaid(): boolean {
    return this.tier === 'pro' || this.tier === 'enterprise';
  }

  /**
   * Create from plain object
   */
  static fromObject(data: SubscriptionType): Subscription {
    return new Subscription(
      data.id,
      data.userId,
      data.tier,
      data.validUntil,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Convert to plain object
   */
  toObject(): SubscriptionType {
    return {
      id: this.id,
      userId: this.userId,
      tier: this.tier,
      validUntil: this.validUntil,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
