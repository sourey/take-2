// Game Statistics and Level System
import { getDeviceId, getDeviceName } from './deviceId.js';

const STATS_KEY = "take2-game-stats";
const PLAYER_NAMES_KEY = "take2-player-names";

// Badge levels based tightly on wins with minimum games requirement
export const BADGE_LEVELS = [
  { name: "Rookie", minGames: 0, minWins: 0, color: "#6B7280", icon: "🎓" },
  { name: "Apprentice", minGames: 1, minWins: 1, color: "#3B82F6", icon: "🛠️" },
  { name: "Challenger", minGames: 2, minWins: 2, color: "#10B981", icon: "⚔️" },
  { name: "Strategist", minGames: 3, minWins: 3, color: "#F59E0B", icon: "🧠" },
  { name: "Tactician", minGames: 5, minWins: 5, color: "#8B5CF6", icon: "🎯" },
  { name: "Mastermind", minGames: 8, minWins: 8, color: "#EF4444", icon: "🧠" },
  { name: "Virtuoso", minGames: 12, minWins: 12, color: "#EC4899", icon: "🎭" },
  { name: "Legend", minGames: 18, minWins: 18, color: "#F97316", icon: "👑" },
  { name: "Mythical", minGames: 25, minWins: 25, color: "#06B6D4", icon: "⭐" },
  { name: "Grandmaster", minGames: 35, minWins: 35, color: "#DC2626", icon: "🔥" },
  { name: "Immortal", minGames: 50, minWins: 50, color: "#7C3AED", icon: "💎" },
  { name: "Juwade GOD", minGames: 75, minWins: 75, color: "#F59E0B", icon: "✨" }
];

// Initialize default stats
const getDefaultStats = () => ({
  totalGames: 0,
  totalWins: 0,
  totalLosses: 0,
  longestGame: 0, // in milliseconds
  playerStats: {}, // { playerName: { games: 0, wins: 0, losses: 0, bestTime: 0 } }
  gameHistory: [], // Array of completed games
  lastUpdated: Date.now()
});

// Load stats from localStorage
export const loadStats = () => {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      const stats = JSON.parse(saved);
      // Ensure all required properties exist
      return { ...getDefaultStats(), ...stats };
    }
  } catch (e) {
    console.warn("Failed to load game stats:", e);
  }
  return getDefaultStats();
};

// Save stats to localStorage
export const saveStats = (stats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error("Failed to save game stats:", e);
  }
};

// Record a completed game
export const recordGameCompletion = async (gameData) => {
  const stats = loadStats();
  const {
    playerName,
    rankings,
    gameStartTime,
    gameEndTime,
    numPlayers,
    gameCardNum
  } = gameData;

  const gameDuration = gameEndTime - gameStartTime;
  const isWin = rankings[0] === 0; // Player won if they finished first

  // Update global stats
  stats.totalGames += 1;
  stats.totalWins += isWin ? 1 : 0;
  stats.totalLosses += isWin ? 0 : 1;
  stats.longestGame = Math.max(stats.longestGame, gameDuration);
  stats.lastUpdated = Date.now();

  // Update player-specific stats
  if (!stats.playerStats[playerName]) {
    stats.playerStats[playerName] = {
      games: 0,
      wins: 0,
      losses: 0,
      bestTime: Infinity
    };
  }

  const playerStat = stats.playerStats[playerName];
  playerStat.games += 1;
  playerStat.wins += isWin ? 1 : 0;
  playerStat.losses += isWin ? 0 : 1;
  playerStat.bestTime = Math.min(playerStat.bestTime, gameDuration);

  // Add to game history (keep last 50 games)
  const gameRecord = {
    playerName,
    isWin,
    duration: gameDuration,
    placement: rankings.indexOf(0) + 1,
    numPlayers,
    gameCardNum,
    timestamp: gameEndTime
  };

  stats.gameHistory.unshift(gameRecord);
  if (stats.gameHistory.length > 50) {
    stats.gameHistory = stats.gameHistory.slice(0, 50);
  }

  // Save local stats
  saveStats(stats);

  // Try to sync with global MongoDB storage (async, non-blocking)
  if (typeof window !== 'undefined') {
    try {
      const { syncStatsToGlobal } = await import('./mongoStorage.js');
      // Add device info to game data for better tracking
      const gameDataWithDevice = {
        ...gameData,
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
      };
      syncStatsToGlobal(gameDataWithDevice).catch(err => {
        console.warn('Failed to sync to global leaderboard:', err);
      });
    } catch (err) {
      console.warn('MongoDB sync not available:', err);
    }
  }

  return stats;
};

// Get player badge level
export const getPlayerBadge = (playerName) => {
  const stats = loadStats();
  const playerStat = stats.playerStats[playerName];

  if (!playerStat) {
    return BADGE_LEVELS[0]; // Rookie
  }

  return getPlayerBadgeFromStats(playerStat.games, playerStat.wins);
};

// Get player badge level from stats (for database stats)
export const getPlayerBadgeFromStats = (games, wins) => {
  // Find the highest badge the player qualifies for
  let currentBadge = BADGE_LEVELS[0];
  for (const badge of BADGE_LEVELS) {
    if (games >= badge.minGames && wins >= badge.minWins) {
      currentBadge = badge;
    } else {
      break; // Badges are in order, so we can stop here
    }
  }

  return currentBadge;
};

// Helper to get local global stats
const getLocalGlobalStats = () => {
  const stats = loadStats();

  // Calculate most wins and most losses
  let mostWinsPlayer = null;
  let mostWinsCount = 0;
  let mostLossesPlayer = null;
  let mostLossesCount = 0;

  Object.entries(stats.playerStats).forEach(([name, playerStat]) => {
    if (playerStat.wins > mostWinsCount) {
      mostWinsPlayer = name;
      mostWinsCount = playerStat.wins;
    }
    if (playerStat.losses > mostLossesCount) {
      mostLossesPlayer = name;
      mostLossesCount = playerStat.losses;
    }
  });

  return {
    totalGames: stats.totalGames,
    totalWins: stats.totalWins,
    totalLosses: stats.totalLosses,
    longestGame: stats.longestGame,
    mostWins: { player: mostWinsPlayer, count: mostWinsCount },
    mostLosses: { player: mostLossesPlayer, count: mostLossesCount },
    winRate: stats.totalGames > 0 ? (stats.totalWins / stats.totalGames * 100).toFixed(1) : 0
  };
};

// Get global statistics (with MongoDB support)
export const getGlobalStats = async () => {
  // Try to get global stats from MongoDB first
  if (typeof window !== 'undefined') {
    try {
      const { getGlobalStatsFromMongo } = await import('./mongoStorage.js');
      const mongoStats = await getGlobalStatsFromMongo();
      if (mongoStats && mongoStats.totalGames > 0) {
        return mongoStats;
      }
    } catch (err) {
      console.warn('MongoDB global stats not available, using local:', err);
    }
  }

  // Fallback to local stats
  return getLocalGlobalStats();
};

// Achievement definitions
export const ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Victory', icon: '🏆', description: 'Win your first game', condition: (stats) => stats.wins >= 1 },
  { id: 'centurion', name: 'Centurion', icon: '💯', description: 'Play 100 games', condition: (stats) => stats.games >= 100 },
  { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', description: 'Win a game in under 2 minutes', condition: (stats) => stats.bestTime < 120000 && stats.bestTime > 0 },
  { id: 'streak_3', name: 'Winning Streak', icon: '🔥', description: 'Win 3 games in a row', condition: (stats, history) => {
    if (!history || history.length < 3) return false;
    return history.slice(0, 3).every(game => game.isWin);
  }},
  { id: 'marathon', name: 'Marathoner', icon: '🏔️', description: 'Play an Epic game (13 cards)', condition: (stats, history) => history && history.some(game => game.gameCardNum === 13) },
  { id: 'socialite', name: 'Socialite', icon: '👥', description: 'Play with 4 players', condition: (stats, history) => history && history.some(game => game.numPlayers === 4) },
];

// Get earned achievements from stats and history
export const getEarnedAchievements = (stats, history = []) => {
  return ACHIEVEMENTS.filter(achievement => achievement.condition(stats, history));
};

// Get player statistics
export const getPlayerStats = (playerName, user = null) => {
  // If user is authenticated and has database stats, use those
  if (user && user.stats) {
    const userStats = user.stats;
    const pStats = {
      games: userStats.games || 0,
      wins: userStats.wins || 0,
      losses: userStats.losses || 0,
      bestTime: userStats.bestTime || Infinity,
      winRate: userStats.games > 0 ? ((userStats.wins / userStats.games) * 100).toFixed(1) : 0,
      badge: getPlayerBadgeFromStats(userStats.games || 0, userStats.wins || 0)
    };
    
    return {
      ...pStats,
      achievements: user.achievements || getEarnedAchievements(pStats, user.gameHistory || []),
      avatar: user.avatar || null
    };
  }

  // Fallback to localStorage stats
  const stats = loadStats();
  const playerStat = stats.playerStats[playerName];

  if (!playerStat) {
    return {
      games: 0,
      wins: 0,
      losses: 0,
      bestTime: 0,
      winRate: 0,
      badge: BADGE_LEVELS[0],
      achievements: [],
      avatar: null
    };
  }

  const pStats = {
    games: playerStat.games,
    wins: playerStat.wins,
    losses: playerStat.losses,
    bestTime: playerStat.bestTime,
    winRate: playerStat.games > 0 ? (playerStat.wins / playerStat.games * 100).toFixed(1) : 0,
    badge: getPlayerBadge(playerName)
  };

  return {
    ...pStats,
    achievements: getEarnedAchievements(pStats, stats.gameHistory?.filter(g => g.playerName === playerName) || []),
    avatar: null
  };
};

// Format duration to human readable string
export const formatDuration = (milliseconds) => {
  if (milliseconds === 0 || milliseconds === Infinity) return "N/A";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

// Save a player name to the list of previously used names
export const savePlayerName = (playerName) => {
  if (!playerName || playerName.trim() === "") return;

  try {
    const savedNames = getPlayerNames();
    const trimmedName = playerName.trim();

    // Add to the beginning if not already there, keep only last 10 names
    const updatedNames = [trimmedName, ...savedNames.filter(name => name !== trimmedName)].slice(0, 10);

    localStorage.setItem(PLAYER_NAMES_KEY, JSON.stringify(updatedNames));
  } catch (e) {
    console.warn("Failed to save player name:", e);
  }
};

// Get the list of previously used player names
export const getPlayerNames = () => {
  try {
    const saved = localStorage.getItem(PLAYER_NAMES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn("Failed to load player names:", e);
    return [];
  }
};

// Reset all statistics (for development/testing)
export const resetStats = () => {
  saveStats(getDefaultStats());
};