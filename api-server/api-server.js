// MongoDB API Server for Take 2 Global Leaderboards
// Run this separately from the main game: node api-server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/take2-leaderboard';

// Connection state for serverless
let isConnected = false;

// Connect to MongoDB (lazy connection for serverless)
const connectToDatabase = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    isConnected = true;
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Game Schema
const gameSchema = new mongoose.Schema({
  playerName: { type: String, required: true },
  rankings: [{ type: Number, required: true }],
  gameStartTime: { type: Number, required: true },
  gameEndTime: { type: Number, required: true },
  numPlayers: { type: Number, required: true },
  gameCardNum: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Game = mongoose.models.Game || mongoose.model('Game', gameSchema);

// Global Stats Schema
const globalStatsSchema = new mongoose.Schema({
  totalGames: Number,
  totalWins: Number,
  totalLosses: Number,
  longestGame: Number,
  lastUpdated: Number
}, { collection: 'globalstats' });

const GlobalStats = mongoose.models.GlobalStats || mongoose.model('GlobalStats', globalStatsSchema);

// Middleware for logging and database connection
app.use(async (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  
  // Skip DB connection for health check
  if (req.path === '/api/health') {
    return next();
  }
  
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Take 2 API Server', version: '1.0.0' });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await connectToDatabase();
    res.json({
      status: 'OK',
      timestamp: Date.now(),
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    res.json({
      status: 'ERROR',
      timestamp: Date.now(),
      mongodb: 'disconnected',
      error: error.message,
      version: '1.0.0'
    });
  }
});

// Submit game result
app.post('/api/games', async (req, res) => {
  try {
    const gameData = req.body;

    // Validate required fields
    const requiredFields = ['playerName', 'rankings', 'gameStartTime', 'gameEndTime', 'numPlayers', 'gameCardNum'];
    for (const field of requiredFields) {
      if (!gameData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Save game
    const game = new Game(gameData);
    await game.save();

    // Update global stats (this could be done in an aggregation pipeline)
    await updateGlobalStats();

    res.json({ success: true, gameId: game._id });
  } catch (error) {
    console.error('Error saving game:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// Get global statistics
app.get('/api/stats/global', async (req, res) => {
  try {
    const stats = await getGlobalStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting global stats:', error);
    res.status(500).json({ error: 'Failed to get global stats' });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Helper functions

async function updateGlobalStats() {
  try {
    const stats = await Game.aggregate([
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          totalWins: {
            $sum: {
              $cond: [{ $eq: [{ $arrayElemAt: ['$rankings', 0] }, 0] }, 1, 0]
            }
          },
          totalLosses: {
            $sum: {
              $cond: [{ $ne: [{ $arrayElemAt: ['$rankings', 0] }, 0] }, 1, 0]
            }
          },
          longestGame: { $max: { $subtract: ['$gameEndTime', '$gameStartTime'] } },
          lastUpdated: { $max: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 0,
          totalGames: 1,
          totalWins: 1,
          totalLosses: 1,
          longestGame: 1,
          lastUpdated: { $toLong: '$lastUpdated' }
        }
      }
    ]);

    if (stats.length > 0) {
      await GlobalStats.findOneAndUpdate(
        {}, // Empty filter to match any document
        stats[0],
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error('Error updating global stats:', error);
  }
}

async function getGlobalStats() {
  try {
    const stats = await GlobalStats.findOne({});
    return stats || {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      longestGame: 0,
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error('Error getting global stats:', error);
    return {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      longestGame: 0,
      lastUpdated: Date.now()
    };
  }
}

async function getLeaderboard() {
  try {
    // Aggregate player statistics
    const players = await Game.aggregate([
      {
        $group: {
          _id: '$playerName',
          games: { $sum: 1 },
          wins: {
            $sum: {
              $cond: [{ $eq: [{ $arrayElemAt: ['$rankings', 0] }, 0] }, 1, 0]
            }
          },
          losses: {
            $sum: {
              $cond: [{ $ne: [{ $arrayElemAt: ['$rankings', 0] }, 0] }, 1, 0]
            }
          },
          bestTime: {
            $min: {
              $cond: [
                { $eq: [{ $arrayElemAt: ['$rankings', 0] }, 0] },
                { $subtract: ['$gameEndTime', '$gameStartTime'] },
                Infinity
              ]
            }
          },
          lastPlayed: { $max: '$createdAt' }
        }
      },
      {
        $project: {
          name: '$_id',
          games: 1,
          wins: 1,
          losses: 1,
          bestTime: {
            $cond: [
              { $eq: ['$bestTime', Infinity] },
              null,
              '$bestTime'
            ]
          },
          lastPlayed: { $toLong: '$lastPlayed' },
          _id: 0
        }
      }
    ]);

    // Calculate win rates and sort
    const playersWithStats = players.map(player => ({
      ...player,
      winRate: player.games > 0 ? ((player.wins / player.games) * 100).toFixed(1) : 0
    }));

    return {
      byWins: [...playersWithStats].sort((a, b) => b.wins - a.wins).slice(0, 10),
      byGames: [...playersWithStats].sort((a, b) => b.games - a.games).slice(0, 10),
      byWinRate: [...playersWithStats].filter(p => p.games >= 5).sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate)).slice(0, 10),
      byBestTime: [...playersWithStats].filter(p => p.bestTime).sort((a, b) => a.bestTime - b.bestTime).slice(0, 10),
      totalPlayers: playersWithStats.length,
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return {
      byWins: [],
      byGames: [],
      byWinRate: [],
      byBestTime: [],
      totalPlayers: 0,
      lastUpdated: Date.now()
    };
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Take 2 MongoDB API Server running on port ${PORT}`);
    console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export for serverless deployment
module.exports = app;