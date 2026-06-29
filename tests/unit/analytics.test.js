import { describe, it, expect, beforeEach } from 'vitest';
import {
  isAnalyticsEnabled,
  setAnalyticsEnabled,
  getStats,
  recordCorrection,
  recordAccepted,
  recordRejected,
  recordResponseTime,
  getDailyTrend,
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
      await recordCorrection(100, 20);
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

    it('recordResponseTime is a no-op when disabled', async () => {
      await recordResponseTime(500);
      const stats = await getStats();
      expect(stats.responseCount).toBe(0);
    });
  });

  describe('stats tracking when opted in', () => {
    beforeEach(async () => {
      await setAnalyticsEnabled(true);
    });

    it('records correction count and character count', async () => {
      await recordCorrection(50, 10);
      await recordCorrection(75, 15);

      const stats = await getStats();
      expect(stats.totalCorrections).toBe(2);
      expect(stats.charactersProcessed).toBe(125);
    });

    it('records word count alongside corrections', async () => {
      await recordCorrection(100, 20);
      await recordCorrection(200, 40);

      const stats = await getStats();
      expect(stats.wordsChecked).toBe(60);
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
      await recordCorrection(10, 2);
      const stats = await getStats();
      expect(stats.lastUsed).toBeTruthy();
      expect(new Date(stats.lastUsed).getTime()).not.toBeNaN();
    });

    it('tracks API response time for performance monitoring', async () => {
      await recordResponseTime(200);
      await recordResponseTime(400);

      const stats = await getStats();
      expect(stats.totalResponseMs).toBe(600);
      expect(stats.responseCount).toBe(2);
    });
  });

  describe('daily history for trend visualization', () => {
    beforeEach(async () => {
      await setAnalyticsEnabled(true);
    });

    it('builds daily history entries when corrections are recorded', async () => {
      await recordCorrection(50, 10);
      await recordCorrection(75, 15);
      await recordAccepted();
      await recordRejected();

      const trend = await getDailyTrend(1);
      expect(trend).toHaveLength(1);
      expect(trend[0].corrections).toBe(2);
      expect(trend[0].accepted).toBe(1);
      expect(trend[0].rejected).toBe(1);
      expect(trend[0].words).toBe(25);
    });

    it('returns zero-filled entries for days with no activity', async () => {
      const trend = await getDailyTrend(7);
      expect(trend).toHaveLength(7);
      for (const day of trend) {
        expect(day.corrections).toBe(0);
        expect(day.accepted).toBe(0);
      }
    });

    it('includes date labels for each trend entry', async () => {
      const trend = await getDailyTrend(3);
      expect(trend).toHaveLength(3);
      for (const day of trend) {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('race condition safety — concurrent writes from multiple tabs', () => {
    beforeEach(async () => {
      await setAnalyticsEnabled(true);
    });

    it('does not lose increments when multiple record calls are fired concurrently', async () => {
      await Promise.all([
        recordCorrection(50, 10),
        recordCorrection(75, 15),
        recordAccepted(),
        recordAccepted(),
        recordRejected(),
        recordResponseTime(200),
        recordResponseTime(400),
      ]);

      const stats = await getStats();
      expect(stats.totalCorrections).toBe(2);
      expect(stats.totalAccepted).toBe(2);
      expect(stats.totalRejected).toBe(1);
      expect(stats.charactersProcessed).toBe(125);
      expect(stats.wordsChecked).toBe(25);
      expect(stats.totalResponseMs).toBe(600);
      expect(stats.responseCount).toBe(2);
    });

    it('does not lose daily history increments when writes are concurrent', async () => {
      await Promise.all([
        recordCorrection(50, 10),
        recordCorrection(75, 15),
        recordAccepted(),
        recordAccepted(),
        recordRejected(),
      ]);

      const trend = await getDailyTrend(1);
      expect(trend[0].corrections).toBe(2);
      expect(trend[0].accepted).toBe(2);
      expect(trend[0].rejected).toBe(1);
      expect(trend[0].words).toBe(25);
    });
  });

  describe('resetting stats', () => {
    it('clears all counters and daily history back to zero', async () => {
      await setAnalyticsEnabled(true);
      await recordCorrection(100, 20);
      await recordAccepted();
      await recordRejected();
      await recordResponseTime(300);

      await resetStats();
      const stats = await getStats();
      expect(stats.totalCorrections).toBe(0);
      expect(stats.totalAccepted).toBe(0);
      expect(stats.totalRejected).toBe(0);
      expect(stats.charactersProcessed).toBe(0);
      expect(stats.wordsChecked).toBe(0);
      expect(stats.totalResponseMs).toBe(0);
      expect(stats.responseCount).toBe(0);
      expect(stats.lastUsed).toBeNull();

      const trend = await getDailyTrend(7);
      for (const day of trend) {
        expect(day.corrections).toBe(0);
      }
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
        wordsChecked: 0,
        totalResponseMs: 0,
        responseCount: 0,
        lastUsed: null,
      });
    });
  });
});
