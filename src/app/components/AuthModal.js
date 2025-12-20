'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { register, login } from '@/utils/auth';

export const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (mode === 'register') {
        result = await register(username, password, displayName || username);
      } else {
        result = await login(username, password);
      }

      if (result.success) {
        onSuccess(result.user);
        onClose();
        // Reset form
        setUsername('');
        setPassword('');
        setDisplayName('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-600 relative"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-xl font-bold"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{mode === 'login' ? '👤' : '✨'}</div>
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login' ? 'Welcome Back!' : 'Join the Game'}
          </h2>
          <p className="text-white/60 text-sm mt-1">
            {mode === 'login' 
              ? 'Login to track your stats globally' 
              : 'Create an account to save your progress'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="Enter username"
              className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              minLength={3}
              maxLength={20}
              required
              autoComplete="username"
            />
            <div className="text-white/40 text-xs mt-1">3-20 characters, letters, numbers, underscore</div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-white/70 text-sm mb-1">Display Name (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How should we call you?"
                className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                maxLength={30}
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="block text-white/70 text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              minLength={4}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-gray-500 disabled:to-gray-600 text-black font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-5 h-5 border-2 border-black/30 border-t-black rounded-full"></span>
                {mode === 'login' ? 'Logging in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? '🎮 Login & Play' : '🚀 Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={switchMode}
            className="text-white/60 hover:text-white text-sm underline"
          >
            {mode === 'login' 
              ? "Don't have an account? Register" 
              : "Already have an account? Login"}
          </button>
        </div>

        {/* Guest option */}
        <div className="mt-4 pt-4 border-t border-slate-600/50 text-center">
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/60 text-sm"
          >
            Continue as guest →
          </button>
        </div>
      </motion.div>
    </div>
  );
};
