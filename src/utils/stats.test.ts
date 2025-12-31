import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStats, updateStatsForWin, updateStatsForLoss, getTodayDate, hasPlayedToday } from './stats';

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: createLocalStorageMock(),
    writable: true,
    configurable: true,
  });
});

describe('stats', () => {
  beforeEach(() => {
    // Reset localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: createLocalStorageMock(),
      writable: true,
      configurable: true,
    });
    vi.clearAllMocks();
  });

  describe('getStats', () => {
    it('returns default stats when no data exists', () => {
      const stats = getStats();
      expect(stats.gamesPlayed).toBe(0);
      expect(stats.gamesWon).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.maxStreak).toBe(0);
      expect(stats.lastPlayedDate).toBeNull();
      expect(stats.guessDistribution).toEqual([0, 0, 0, 0, 0, 0]);
    });

    it('returns stored stats when data exists', () => {
      const storedStats = {
        gamesPlayed: 5,
        gamesWon: 3,
        currentStreak: 2,
        maxStreak: 3,
        lastPlayedDate: '2024-01-01',
        guessDistribution: [1, 1, 1, 0, 0, 2],
      };
      window.localStorage.setItem('brick-stats', JSON.stringify(storedStats));
      
      const stats = getStats();
      expect(stats.gamesPlayed).toBe(5);
      expect(stats.gamesWon).toBe(3);
      expect(stats.currentStreak).toBe(2);
    });
  });

  describe('updateStatsForWin', () => {
    it('increments games played and won on first win', () => {
      const stats = updateStatsForWin(1, 0);
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.gamesWon).toBe(1);
      expect(stats.currentStreak).toBe(1);
      expect(stats.maxStreak).toBe(1);
      expect(stats.guessDistribution[0]).toBe(1);
    });

    it('updates guess distribution correctly', () => {
      updateStatsForWin(3, 0);
      const stats = getStats();
      expect(stats.guessDistribution[2]).toBe(1); // 3rd guess = index 2
    });

    it('does not update if already played today', () => {
      const today = getTodayDate();
      const initialStats = {
        gamesPlayed: 1,
        gamesWon: 1,
        currentStreak: 1,
        maxStreak: 1,
        lastPlayedDate: today,
        guessDistribution: [1, 0, 0, 0, 0, 0],
      };
      window.localStorage.setItem('brick-stats', JSON.stringify(initialStats));
      
      const stats = updateStatsForWin(2, 0);
      expect(stats.gamesPlayed).toBe(1); // Should not increment
    });
  });

  describe('updateStatsForLoss', () => {
    it('increments games played and resets streak on loss', () => {
      const stats = updateStatsForLoss();
      expect(stats.gamesPlayed).toBe(1);
      expect(stats.gamesWon).toBe(0);
      expect(stats.currentStreak).toBe(0);
      expect(stats.guessDistribution[5]).toBe(1); // Failed = index 5
    });

    it('does not update if already played today', () => {
      const today = getTodayDate();
      const initialStats = {
        gamesPlayed: 1,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        lastPlayedDate: today,
        guessDistribution: [0, 0, 0, 0, 0, 1],
      };
      window.localStorage.setItem('brick-stats', JSON.stringify(initialStats));
      
      const stats = updateStatsForLoss();
      expect(stats.gamesPlayed).toBe(1); // Should not increment
    });
  });

  describe('hasPlayedToday', () => {
    it('returns false when no stats exist', () => {
      expect(hasPlayedToday()).toBe(false);
    });

    it('returns true when played today', () => {
      const today = getTodayDate();
      const stats = {
        gamesPlayed: 1,
        gamesWon: 1,
        currentStreak: 1,
        maxStreak: 1,
        lastPlayedDate: today,
        guessDistribution: [1, 0, 0, 0, 0, 0],
      };
      window.localStorage.setItem('brick-stats', JSON.stringify(stats));
      expect(hasPlayedToday()).toBe(true);
    });
  });
});

