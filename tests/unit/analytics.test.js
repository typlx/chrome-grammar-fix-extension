import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  getStats,
  recordCorrection,
  recordAccepted,
  recordRejected,
  resetStats,
} from '../../utils/analytics.js';

describe('privacy-respecting analytics', () => {
  beforeEach(() => {
    globalThis.__clearChromeStore();
  });

  describe('opt-in by default', () => {
    it('analytics are disabled until the user opts in', async () => {
      expect(await isAnalyticsEnabled()).toBe(false);
    });

    it('user can enable analytics', async () => {
      await setAnalyticsEnabled(true);
      expect(await isAnalyticsEnabled()).toBe(true);
    });

    it('user can disable analytics after enabling', async () => {
      await setAnalyticsEnabled(true);
      await setAnalyticsEnabled(false);
      expect(await isAnalyticsEnabled()).toBe(false);
    });
  });

  describe('stats are not recorded when analytics are disabled', () => {
    it('recordCorrection is a no-op when disabled', async () => {
      await recordCorrection(100);
      const stats = await getStats();
      expect(stats.totalCorrections).toBe(0);
    });

    it('recordAccepted is a no-op when disabled', async () => {
      await recordAccepted();
      const stats = await getStats();
      expect(stats.totalAccepted).toBe(0);
    });

    it('recordRejected is a no-op when disabled', async () => {
      await recordRejected();
      const stats = await getStats();
      expect(stats.totalRejected).toBe(0);
    });
  });

  describe('stats tracking when opted in', () => {
    beforeEach(async () => {
      await setAnalyticsEnabled(true);
    });

    it('records correction count and character count', async () => {
      await recordCorrection(50);
      await recordCorrection(75);

      const stats = await getStats();
      expect(stats.totalCorrections).toBe(2);
      expect(stats.charactersProcessed).toBe(125);
    });

    it('records accepted corrections', async () => {
      await recordAccepted();
      await recordAccepted();

      const stats = await getStats();
      expect(stats.totalAccepted).toBe(2);
    });

    it('records rejected corrections', async () => {
      await recordRejected();

      const stats = await getStats();
      expect(stats.totalRejected).toBe(1);
    });

    it('sets lastUsed timestamp on correction', async () => {
      await recordCorrection(10);
      const stats = await getStats();
      expect(stats.lastUsed).toBeTruthy();
      expect(new Date(stats.lastUsed).getTime()).not.toBeNaN();
    });
  });

  describe('resetting stats', () => {
    it('clears all counters back to zero', async () => {
      await setAnalyticsEnabled(true);
      await recordCorrection(100);
      await recordAccepted();
      await recordRejected();

      await resetStats();
      const stats = await getStats();
      expect(stats.totalCorrections).toBe(0);
      expect(stats.totalAccepted).toBe(0);
      expect(stats.totalRejected).toBe(0);
      expect(stats.charactersProcessed).toBe(0);
      expect(stats.lastUsed).toBeNull();
    });
  });

  describe('default stats shape', () => {
    it('returns zero-valued defaults when no data exists', async () => {
      const stats = await getStats();
      expect(stats).toEqual({
        totalCorrections: 0,
        totalAccepted: 0,
        totalRejected: 0,
        charactersProcessed: 0,
        lastUsed: null,
      });
    });
  });
});
