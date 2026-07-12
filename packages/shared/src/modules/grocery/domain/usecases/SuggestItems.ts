import type { ProductType, ItemSuggestion } from '../types/index.js';

export class SuggestItems {
  /**
   * Returns items likely needed based on:
   * 1. Lifespan: items where (lastPurchasedAt + lifespanDays) is within 3 days
   * 2. Frequency: items bought regularly that haven't been bought recently
   * 3. Recency: items bought in last 2 weeks (for "buy again" quick-add)
   */
  static getSuggestions(
    catalog: ProductType[],
    currentListItemNames: string[],
    now: Date = new Date()
  ): ItemSuggestion[] {
    const lowerCaseListNames = new Set(
      currentListItemNames.map((n) => n.toLowerCase())
    );

    const suggestions: ItemSuggestion[] = [];

    for (const product of catalog) {
      // Skip items already on the list
      if (lowerCaseListNames.has(product.name.toLowerCase())) continue;

      const suggestion = this.scoreProduct(product, now);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions.slice(0, 15);
  }

  private static scoreProduct(
    product: ProductType,
    now: Date
  ): ItemSuggestion | null {
    // Running low: lastPurchasedAt + lifespanDays <= now + 3 days
    if (product.lastPurchasedAt && product.lifespanDays) {
      const depletionDate = new Date(product.lastPurchasedAt);
      depletionDate.setDate(depletionDate.getDate() + product.lifespanDays);

      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      if (depletionDate <= threeDaysFromNow) {
        const daysOverdue = Math.max(
          0,
          (now.getTime() - depletionDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const confidence = Math.min(1, 0.7 + daysOverdue * 0.05);
        return {
          product,
          reason: 'running_low',
          confidence,
          estimatedDepletionDate: depletionDate,
        };
      }
    }

    // Frequently bought: purchaseCount >= 3 and overdue based on average interval
    if (product.purchaseCount >= 3 && product.lastPurchasedAt) {
      const daysSinceCreation =
        (now.getTime() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const avgInterval = daysSinceCreation / product.purchaseCount;
      const daysSinceLastPurchase =
        (now.getTime() - product.lastPurchasedAt.getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysSinceLastPurchase > avgInterval * 0.8) {
        const overdueRatio = daysSinceLastPurchase / avgInterval;
        const confidence = Math.min(0.85, 0.4 + overdueRatio * 0.15);
        return {
          product,
          reason: 'frequently_bought',
          confidence,
          estimatedDepletionDate: null,
        };
      }
    }

    // Recently bought: last purchased within 14 days, purchaseCount >= 2
    if (product.purchaseCount >= 2 && product.lastPurchasedAt) {
      const daysSinceLastPurchase =
        (now.getTime() - product.lastPurchasedAt.getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysSinceLastPurchase <= 14) {
        const confidence = Math.max(0.1, 0.35 - daysSinceLastPurchase * 0.02);
        return {
          product,
          reason: 'recently_bought',
          confidence,
          estimatedDepletionDate: null,
        };
      }
    }

    return null;
  }
}
