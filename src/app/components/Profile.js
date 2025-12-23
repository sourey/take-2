'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration, BADGE_LEVELS, ACHIEVEMENTS } from '@/utils/stats';
import { updateProfile } from '@/utils/auth';

const AVATARS = ['🦊', '🐱', '🦁', '🐸', '🐵', '🐼', '🐨', '🐯', '🐮', '🐷', '🐙', '🦖', '🦄', '🐲'];

export const Profile = ({ user, stats, onClose, isOwnProfile = false, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [isEditing, setIsOwnEditing] = useState(false);
  const [newName, setNewName] = useState(user.displayName || user.username);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar || '🦊');
  const [updating, setUpdating] = useState(false);

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      const result = await updateProfile(newName, selectedAvatar);
      if (result.success) {
        setIsOwnEditing(false);
        if (onUpdate) onUpdate(result.user);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleOutsideClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={handleOutsideClick}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-600 relative overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header/Cover Section */}
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10"
          >
            ✕
          </button>
        </div>

        {/* Profile Info Section */}
        <div className="px-6 pb-4 -mt-16 relative flex-shrink-0">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-32 h-32 bg-slate-800 rounded-full border-4 border-slate-900 flex items-center justify-center text-6xl shadow-xl overflow-hidden bg-white/5 backdrop-blur-xl">
                {selectedAvatar}
              </div>
              {isOwnProfile && isEditing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <div className="grid grid-cols-4 gap-1 p-2 max-h-32 overflow-y-auto scrollbar-hide">
                    {AVATARS.map(a => (
                      <button 
                        key={a} 
                        onClick={() => setSelectedAvatar(a)}
                        className={`text-2xl hover:scale-125 transition-transform ${selectedAvatar === a ? 'bg-white/20 rounded-lg' : ''}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              {isEditing ? (
                <div className="flex flex-col items-center gap-2">
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-1 text-white text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    maxLength={20}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleUpdateProfile}
                      disabled={updating}
                      className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold hover:bg-green-400"
                    >
                      {updating ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => setIsOwnEditing(false)}
                      className="bg-slate-600 text-white px-4 py-1 rounded-full text-sm font-bold hover:bg-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-black text-white drop-shadow-lg flex items-center justify-center gap-2">
                    {user.displayName || user.username}
                    {isOwnProfile && (
                      <button onClick={() => setIsOwnEditing(true)} className="text-sm opacity-50 hover:text-white">✏️</button>
                    )}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-xl">{stats.badge.icon}</span>
                    <span className="font-bold text-lg" style={{ color: stats.badge.color }}>{stats.badge.name}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-white/5 flex-shrink-0">
          {['stats', 'achievements', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 capitalize ${
                activeTab === tab 
                  ? 'border-yellow-500 text-yellow-500' 
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                  <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Total Games</div>
                  <div className="text-2xl font-black text-white">{stats.games}</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                  <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Wins</div>
                  <div className="text-2xl font-black text-green-400">{stats.wins}</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                  <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Win Rate</div>
                  <div className="text-2xl font-black text-blue-400">{stats.winRate}%</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                  <div className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">Best Time</div>
                  <div className="text-2xl font-black text-yellow-400">{formatDuration(stats.bestTime)}</div>
                </div>
              </div>

              {/* Badge Progress */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span>🏆</span> Badge Progress
                </h3>
                {(() => {
                  const currentIdx = BADGE_LEVELS.findIndex(b => b.name === stats.badge.name);
                  const nextBadge = BADGE_LEVELS[currentIdx + 1];
                  
                  if (!nextBadge) return <div className="text-yellow-400 font-bold text-center">✨ MAX LEVEL REACHED ✨</div>;
                  
                  const progress = Math.min((stats.wins / nextBadge.minWins) * 100, 100);
                  
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-end text-xs">
                        <div className="text-white/60">
                          Next: <span className="text-white font-bold">{nextBadge.icon} {nextBadge.name}</span>
                        </div>
                        <div className="text-yellow-500 font-black">{stats.wins} / {nextBadge.minWins} wins</div>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 gap-3">
              {ACHIEVEMENTS.map(achievement => {
                const isEarned = stats.achievements?.some(a => a.id === achievement.id) || stats.achievements?.includes(achievement.id);
                return (
                  <div 
                    key={achievement.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      isEarned 
                        ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30' 
                        : 'bg-white/5 border-white/5 opacity-40 grayscale'
                    }`}
                  >
                    <div className="text-4xl">{achievement.icon}</div>
                    <div>
                      <div className="text-white font-bold">{achievement.name}</div>
                      <div className="text-white/60 text-xs">{achievement.description}</div>
                    </div>
                    {isEarned && (
                      <div className="ml-auto text-yellow-500 text-xs font-bold">UNLOCKED</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {user.recentGames?.length > 0 ? (
                user.recentGames.map((game, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                        game.rankings[0] === 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {game.rankings[0] === 0 ? 'W' : 'L'}
                      </div>
                      <div>
                        <div className="text-white font-bold">
                          {game.rankings[0] === 0 ? 'Victory' : `Finished #${game.rankings.indexOf(0) + 1}`}
                        </div>
                        <div className="text-white/40 text-xs">
                          {game.numPlayers} players • {game.gameCardNum} cards
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-white/60 font-bold">{formatDuration(game.gameEndTime - game.gameStartTime)}</div>
                      <div className="text-white/20">{new Date(game.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-white/20 italic">No recent games found</div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

