// MongoDB API Server for Take 2 Global Leaderboards
// Run this separately from the main game: node api-server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection - Global for serverless
let isConnected = false;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/take2-leaderboard';

const connectToDatabase = async () => {
  if (isConnected) return;

  try {
    // MongoDB Atlas connection options optimized for serverless
    const mongooseOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
      maxPoolSize: 1, // Reduced for serverless
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };

    await mongoose.connect(MONGODB_URI, mongooseOptions);
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

const Game = mongoose.model('Game', gameSchema);

// Middleware for logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes

// Middleware to connect to database
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

    res.json({
      status: 'OK',
      timestamp: Date.now(),
      mongodb: dbStatus,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed', details: error.message });
  }
});

// Submit game result
app.post('/api/games', async (req, res) => {
  try {
    const gameData = req.body;

    // Validate required fields
    const requiredFields = ['playerName', 'rankings', 'gameStartTime', 'gameEndTime', 'numPlayers', 'gameCardNum'];
    for (const field of requiredFields) {
      if (!gameData[field] && gameData[field] !== 0) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Save game
    const game = new Game(gameData);
    await game.save();

    // Update global stats asynchronously (don't wait for response)
    updateGlobalStats().catch(err => console.error('Background stats update failed:', err));

    res.json({ success: true, gameId: game._id });
  } catch (error) {
    console.error('Error saving game:', error);
    res.status(500).json({ error: 'Failed to save game', details: error.message });
  }
});

// Get global statistics
app.get('/api/stats/global', async (req, res) => {
  try {
    const stats = await getGlobalStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting global stats:', error);
    res.status(500).json({ error: 'Failed to get global stats', details: error.message });
  }
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard', details: error.message });
  }
});

// Helper functions

async function updateGlobalStats() {
  try {
    // Check if there are any games first
    const gameCount = await Game.countDocuments();
    if (gameCount === 0) {
      console.log('No games found, skipping global stats update');
      return;
    }

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
      // Update or create global stats document
      const GlobalStats = mongoose.model('GlobalStats',
        new mongoose.Schema({
          totalGames: Number,
          totalWins: Number,
          totalLosses: Number,
          longestGame: Number,
          lastUpdated: Number
        }, { collection: 'globalstats' })
      );

      await GlobalStats.findOneAndUpdate(
        {}, // Empty filter to match any document
        stats[0],
        { upsert: true, new: true }
      );
      console.log('Global stats updated successfully');
    }
  } catch (error) {
    console.error('Error updating global stats:', error);
  }
}

async function getGlobalStats() {
  try {
    const GlobalStats = mongoose.model('GlobalStats',
      new mongoose.Schema({}, { collection: 'globalstats' })
    );

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

// Export for serverless deployment (Vercel)
module.exports = app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3001;

  // Graceful shutdown for local development
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

  // Connect and start server for local development
  connectToDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`Take 2 MongoDB API Server running on port ${PORT}`);
      console.log(`MongoDB URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}