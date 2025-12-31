export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  guessDistribution: number[]; // [0-5] for guesses 1-5, index 5 is for failed
}

const STORAGE_KEY = 'brick-stats';
const MAX_GUESSES = 5;

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getStats(): GameStats {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, return defaults
    }
  }
  
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: null,
    guessDistribution: [0, 0, 0, 0, 0, 0], // 1, 2, 3, 4, 5, failed
  };
}

export function saveStats(stats: GameStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function updateStatsForWin(guessCount: number, _usedHints: number): GameStats {
  const stats = getStats();
  const today = getTodayDate();
  
  // Check if already played today
  if (stats.lastPlayedDate === today) {
    return stats; // Don't update if already played today
  }
  
  const wasStreakActive = stats.lastPlayedDate === getYesterdayDate();
  const newStreak = wasStreakActive ? stats.currentStreak + 1 : 1;
  
  stats.gamesPlayed += 1;
  stats.gamesWon += 1;
  stats.currentStreak = newStreak;
  stats.maxStreak = Math.max(stats.maxStreak, newStreak);
  stats.lastPlayedDate = today;
  
  // Update guess distribution (1-indexed, so guessCount 1 = index 0)
  if (guessCount >= 1 && guessCount <= MAX_GUESSES) {
    stats.guessDistribution[guessCount - 1] += 1;
  }
  
  saveStats(stats);
  return stats;
}

export function updateStatsForLoss(): GameStats {
  const stats = getStats();
  const today = getTodayDate();
  
  // Check if already played today
  if (stats.lastPlayedDate === today) {
    return stats; // Don't update if already played today
  }
  
  stats.gamesPlayed += 1;
  stats.currentStreak = 0; // Reset streak on loss
  stats.lastPlayedDate = today;
  stats.guessDistribution[5] += 1; // Index 5 = failed
  
  saveStats(stats);
  return stats;
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

export function hasPlayedToday(): boolean {
  const stats = getStats();
  return stats.lastPlayedDate === getTodayDate();
}

