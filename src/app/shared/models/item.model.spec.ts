import { describe, it, expect } from 'vitest';
import { CONDITION_LABELS, CONDITION_BADGE_CLASS } from './item.model';

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
});
