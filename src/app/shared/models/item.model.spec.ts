import { describe, it, expect } from 'vitest';
import { CONDITION_LABELS, CONDITION_BADGE_CLASS, isFreePrice } from './item.model';

describe('Item model helpers', () => {
  it('should have a label for every condition', () => {
    const conditions = ['new', 'like-new', 'good', 'fair', 'worn'] as const;
    conditions.forEach((c) => {
      expect(CONDITION_LABELS[c]).toBeTruthy();
    });
  });

  it('should have a badge class for every condition', () => {
    const conditions = ['new', 'like-new', 'good', 'fair', 'worn'] as const;
    conditions.forEach((c) => {
      expect(CONDITION_BADGE_CLASS[c]).toMatch(/^badge-/);
    });
  });

  it('should treat nullish and zero prices as free', () => {
    expect(isFreePrice(undefined)).toBe(true);
    expect(isFreePrice(null)).toBe(true);
    expect(isFreePrice(0)).toBe(true);
    expect(isFreePrice(199)).toBe(false);
  });
});
