// AWS S3 Storage Integration for Global Stats and Leaderboards
// This module handles syncing local stats with global S3 storage

// AWS S3 Configuration
const S3_CONFIG = {
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  bucket: process.env.NEXT_PUBLIC_S3_BUCKET || 'take2-game-stats',
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
};

// Check if AWS credentials are available
const hasAwsCredentials = () => {
  return !!(S3_CONFIG.accessKeyId && S3_CONFIG.secretAccessKey && S3_CONFIG.bucket);
};

// S3 key paths
const S3_KEYS = {
  GLOBAL_STATS: 'global-stats.json',
  LEADERBOARD: 'leaderboard.json',
  PLAYER_STATS_PREFIX: 'players/',
};

// Global stats cache to reduce S3 calls
let globalStatsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initialize AWS SDK (only if credentials are available)
let AWS = null;
let s3 = null;

if (hasAwsCredentials() && typeof window !== 'undefined') {
  try {
    // Dynamic import to avoid SSR issues
    import('aws-sdk').then((awsSdk) => {
      AWS = awsSdk.default || awsSdk;
      AWS.config.update({
        region: S3_CONFIG.region,
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
      });
      s3 = new AWS.S3();
    }).catch(err => {
      console.warn('AWS SDK not available:', err);
    });
  } catch (err) {
    console.warn('Failed to initialize AWS SDK:', err);
  }
}

// Upload data to S3
const uploadToS3 = async (key, data) => {
  if (!s3 || !hasAwsCredentials()) {
    console.warn('S3 not configured, skipping upload');
    return false;
  }

  try {
    const params = {
      Bucket: S3_CONFIG.bucket,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
      CacheControl: 'max-age=300', // 5 minutes cache
    };

    await s3.upload(params).promise();
    return true;
  } catch (error) {
    console.error('Failed to upload to S3:', error);
    return false;
  }
};

// Download data from S3
const downloadFromS3 = async (key) => {
  if (!s3 || !hasAwsCredentials()) {
    console.warn('S3 not configured, cannot download');
    return null;
  }

  try {
    const params = {
      Bucket: S3_CONFIG.bucket,
      Key: key,
    };

    const data = await s3.getObject(params).promise();
    return JSON.parse(data.Body.toString());
  } catch (error) {
    // If object doesn't exist, return null (not an error)
    if (error.code === 'NoSuchKey') {
      return null;
    }
    console.error('Failed to download from S3:', error);
    return null;
  }
};

// Sync local stats to global S3 storage
export const syncStatsToGlobal = async (gameData) => {
  if (!hasAwsCredentials()) {
    console.log('AWS not configured - stats will remain local only');
    return false;
  }

  try {
    // Get current global stats
    let globalStats = await downloadFromS3(S3_KEYS.GLOBAL_STATS) || {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      longestGame: 0,
      mostWins: { player: null, count: 0 },
      mostLosses: { player: null, count: 0 },
      lastUpdated: Date.now(),
      players: {},
    };

    const { playerName, rankings, gameStartTime, gameEndTime, numPlayers, gameCardNum } = gameData;
    const gameDuration = gameEndTime - gameStartTime;
    const isWin = rankings[0] === 0;

    // Update global stats
    globalStats.totalGames += 1;
    globalStats.totalWins += isWin ? 1 : 0;
    globalStats.totalLosses += isWin ? 0 : 1;
    globalStats.longestGame = Math.max(globalStats.longestGame, gameDuration);
    globalStats.lastUpdated = Date.now();

    // Update player global stats
    if (!globalStats.players[playerName]) {
      globalStats.players[playerName] = {
        games: 0,
        wins: 0,
        losses: 0,
        bestTime: Infinity,
        lastPlayed: Date.now(),
      };
    }

    const playerGlobal = globalStats.players[playerName];
    playerGlobal.games += 1;
    playerGlobal.wins += isWin ? 1 : 0;
    playerGlobal.losses += isWin ? 0 : 1;
    playerGlobal.bestTime = Math.min(playerGlobal.bestTime, gameDuration);
    playerGlobal.lastPlayed = Date.now();

    // Update leaderboard positions
    if (playerGlobal.wins > (globalStats.mostWins.count || 0)) {
      globalStats.mostWins = { player: playerName, count: playerGlobal.wins };
    }
    if (playerGlobal.losses > (globalStats.mostLosses.count || 0)) {
      globalStats.mostLosses = { player: playerName, count: playerGlobal.losses };
    }

    // Upload updated global stats
    const success = await uploadToS3(S3_KEYS.GLOBAL_STATS, globalStats);
    if (success) {
      // Clear cache to force refresh on next read
      globalStatsCache = null;
      console.log('Successfully synced stats to global leaderboard');
    }

    return success;
  } catch (error) {
    console.error('Failed to sync stats to global:', error);
    return false;
  }
};

// Get global stats from S3 (with caching)
export const getGlobalStatsFromS3 = async () => {
  // Return cached data if still fresh
  if (globalStatsCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return globalStatsCache;
  }

  if (!hasAwsCredentials()) {
    console.log('AWS not configured - using local stats');
    return getGlobalStats(); // Fallback to local
  }

  try {
    const globalStats = await downloadFromS3(S3_KEYS.GLOBAL_STATS);
    if (globalStats) {
      globalStatsCache = globalStats;
      cacheTimestamp = Date.now();
      return globalStats;
    }
  } catch (error) {
    console.error('Failed to get global stats from S3:', error);
  }

  // Fallback to local stats if S3 fails
  console.log('Falling back to local stats');
  return getGlobalStats();
};

// Get leaderboard data (top players by various metrics)
export const getLeaderboard = async () => {
  const globalStats = await getGlobalStatsFromS3();

  if (!globalStats.players) return [];

  // Convert players object to sorted arrays
  const players = Object.entries(globalStats.players).map(([name, stats]) => ({
    name,
    ...stats,
    winRate: stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : 0,
  }));

  return {
    byWins: [...players].sort((a, b) => b.wins - a.wins).slice(0, 10),
    byGames: [...players].sort((a, b) => b.games - a.games).slice(0, 10),
    byWinRate: [...players].filter(p => p.games >= 5).sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate)).slice(0, 10),
    byBestTime: [...players].filter(p => p.bestTime < Infinity).sort((a, b) => a.bestTime - b.bestTime).slice(0, 10),
    totalPlayers: players.length,
    lastUpdated: globalStats.lastUpdated,
  };
};

// Check S3 connectivity
export const testS3Connection = async () => {
  if (!hasAwsCredentials()) {
    return { connected: false, reason: 'AWS credentials not configured' };
  }

  try {
    // Try to list objects in bucket (cheap operation)
    await s3.headBucket({ Bucket: S3_CONFIG.bucket }).promise();
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      reason: error.message,
      code: error.code
    };
  }
};

// Export configuration status
export const getS3Status = () => ({
  configured: hasAwsCredentials(),
  region: S3_CONFIG.region,
  bucket: S3_CONFIG.bucket,
});