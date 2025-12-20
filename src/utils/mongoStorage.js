// MongoDB Integration for Global Stats and Leaderboards
// This module handles syncing local stats with global MongoDB storage

import { loadStats, saveStats, getGlobalStats } from './stats.js';
import { getToken } from './auth.js';

// MongoDB Configuration
const MONGO_CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_MONGO_API_URL || 'http://localhost:3001/api',
};

// Check if MongoDB API is configured
const hasMongoConfig = () => {
  return !!(MONGO_CONFIG.apiUrl);
};

// Global stats cache to reduce API calls
let globalStatsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// API request helper (includes auth token if available)
const apiRequest = async (endpoint, options = {}) => {
  if (!hasMongoConfig()) {
    throw new Error('MongoDB API not configured');
  }

  const url = `${MONGO_CONFIG.apiUrl}${endpoint}`;
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Sync local stats to global MongoDB storage
export const syncStatsToGlobal = async (gameData) => {
  if (!hasMongoConfig()) {
    console.warn('MongoDB not configured, skipping sync');
    return false;
  }

  try {
    const response = await apiRequest('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    });

    console.log('Successfully synced game to global leaderboard');
    // Clear cache to force refresh on next read
    globalStatsCache = null;
    return true;
  } catch (error) {
    console.error('Failed to sync stats to global:', error);
    return false;
  }
};

// Get global stats from MongoDB (with caching)
export const getGlobalStatsFromMongo = async () => {
  // Return cached data if still fresh
  if (globalStatsCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return globalStatsCache;
  }

  if (!hasMongoConfig()) {
    console.log('MongoDB not configured - using local stats');
    return getGlobalStats(); // Fallback to local
  }

  try {
    const response = await apiRequest('/stats/global');
    globalStatsCache = response;
    cacheTimestamp = Date.now();
    return response;
  } catch (error) {
    console.error('Failed to get global stats from MongoDB:', error);
    // Fallback to local stats if MongoDB fails
    console.log('Falling back to local stats');
    return getGlobalStats();
  }
};

// Get leaderboard data (top players by various metrics)
export const getLeaderboard = async () => {
  if (!hasMongoConfig()) {
    return {
      byWins: [],
      byGames: [],
      byWinRate: [],
      byBestTime: [],
      totalPlayers: 0,
      lastUpdated: Date.now(),
    };
  }

  try {
    const response = await apiRequest('/leaderboard');
    return response;
  } catch (error) {
    console.error('Failed to get leaderboard from MongoDB:', error);
    return {
      byWins: [],
      byGames: [],
      byWinRate: [],
      byBestTime: [],
      totalPlayers: 0,
      lastUpdated: Date.now(),
    };
  }
};

// Test MongoDB connectivity
export const testMongoConnection = async () => {
  if (!hasMongoConfig()) {
    return { connected: false, reason: 'MongoDB API not configured' };
  }

  try {
    await apiRequest('/health');
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      reason: error.message,
      error: error.toString()
    };
  }
};

// Export configuration status
export const getMongoStatus = () => ({
  configured: hasMongoConfig(),
  apiUrl: MONGO_CONFIG.apiUrl,
  hasApiKey: !!MONGO_CONFIG.apiKey,
});