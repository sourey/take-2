// MongoDB API Server for Take 2 Global Leaderboards
// Run this separately from the main game: node api-server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'take2-secret-key-change-in-production';
const JWT_EXPIRES_IN = '30d'; // Token valid for 30 days

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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

// User Schema
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: { type: String, required: true },
  displayName: { type: String, default: null }, // Optional display name
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  // Aggregated stats (updated after each game)
  stats: {
    games: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    bestTime: { type: Number, default: null }, // Best winning time in ms
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Game Schema
const gameSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Link to user
  playerName: { type: String, required: true }, // Display name at time of game
  deviceId: { type: String, default: null },
  deviceName: { type: String, default: null },
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

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    req.user = null;
    return next(); // Allow unauthenticated requests, but req.user will be null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next(); // Invalid token, continue as guest
  }
};

// Require authentication middleware (for protected routes)
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

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
      version: '2.0.0'
    });
  } catch (error) {
    res.json({
      status: 'ERROR',
      timestamp: Date.now(),
      mongodb: 'disconnected',
      error: error.message,
      version: '2.0.0'
    });
  }
});

// ============ AUTH ROUTES ============

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      password,
      displayName: displayName || username,
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        stats: user.stats,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        stats: user.stats,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile (requires auth)
app.get('/api/auth/me', authenticateToken, requireAuth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        stats: req.user.stats,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin,
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile (requires auth)
app.put('/api/auth/profile', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { displayName } = req.body;

    if (displayName) {
      req.user.displayName = displayName;
      await req.user.save();
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        displayName: req.user.displayName,
        stats: req.user.stats,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============ GAME ROUTES ============

// Submit game result (with optional auth)
app.post('/api/games', authenticateToken, async (req, res) => {
  try {
    const gameData = req.body;

    // Validate required fields
    const requiredFields = ['playerName', 'rankings', 'gameStartTime', 'gameEndTime', 'numPlayers', 'gameCardNum'];
    for (const field of requiredFields) {
      if (!gameData[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Add user ID if authenticated
    if (req.user) {
      gameData.userId = req.user._id;
      gameData.playerName = req.user.displayName || req.user.username;
    }

    // Save game
    const game = new Game(gameData);
    await game.save();

    // Update user stats if authenticated
    if (req.user) {
      const isWin = gameData.rankings[0] === 0;
      const gameDuration = gameData.gameEndTime - gameData.gameStartTime;

      req.user.stats.games += 1;
      if (isWin) {
        req.user.stats.wins += 1;
        // Update best time if this is a winning game and faster
        if (!req.user.stats.bestTime || gameDuration < req.user.stats.bestTime) {
          req.user.stats.bestTime = gameDuration;
        }
      } else {
        req.user.stats.losses += 1;
      }
      await req.user.save();
    }

    // Update global stats
    await updateGlobalStats();

    res.json({ 
      success: true, 
      gameId: game._id,
      userStats: req.user ? req.user.stats : null
    });
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

// Admin: Reset all data (protected by secret key)
app.post('/api/admin/reset', async (req, res) => {
  try {
    const { secret } = req.body;
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'take2-reset-2024';
    
    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid secret' });
    }

    // Delete all data from collections
    await Game.deleteMany({});
    await User.deleteMany({});
    await GlobalStats.deleteMany({});

    console.log('Database reset by admin');
    
    res.json({ 
      success: true, 
      message: 'All data has been reset',
      deleted: {
        games: 'all',
        users: 'all', 
        globalStats: 'all'
      }
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ error: 'Failed to reset database' });
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
    const baseStats = stats || {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      longestGame: 0,
      lastUpdated: Date.now()
    };

    // Get top players for mostWins and mostLosses
    const topPlayers = await Game.aggregate([
      {
        $group: {
          _id: '$playerName',
          wins: {
            $sum: {
              $cond: [{ $eq: [{ $arrayElemAt: ['$rankings', 0] }, 0] }, 1, 0]
            }
          },
          losses: {
            $sum: {
              $cond: [{ $ne: [{ $arrayElemAt: ['$rankings', 0] }, 0] }, 1, 0]
            }
          }
        }
      }
    ]);

    let mostWins = { player: null, count: 0 };
    let mostLosses = { player: null, count: 0 };

    topPlayers.forEach(player => {
      if (player.wins > mostWins.count) {
        mostWins = { player: player._id, count: player.wins };
      }
      if (player.losses > mostLosses.count) {
        mostLosses = { player: player._id, count: player.losses };
      }
    });

    const winRate = baseStats.totalGames > 0 
      ? ((baseStats.totalWins / baseStats.totalGames) * 100).toFixed(1) 
      : "0.0";

    return {
      totalGames: baseStats.totalGames || 0,
      totalWins: baseStats.totalWins || 0,
      totalLosses: baseStats.totalLosses || 0,
      longestGame: baseStats.longestGame || 0,
      lastUpdated: baseStats.lastUpdated || Date.now(),
      mostWins: mostWins.player ? mostWins : null,
      mostLosses: mostLosses.player ? mostLosses : null,
      winRate
    };
  } catch (error) {
    console.error('Error getting global stats:', error);
    return {
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      longestGame: 0,
      lastUpdated: Date.now(),
      mostWins: null,
      mostLosses: null,
      winRate: "0.0"
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