import { useState, useEffect } from 'react';
import { getLeaderboard } from '@/utils/mongoStorage';
import { formatDuration } from '@/utils/stats';

export const Leaderboard = ({ onClose }) => {
  const [leaderboard, setLeaderboard] = useState(null);
  const [activeTab, setActiveTab] = useState('wins');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'wins', label: '🏆 Most Wins', data: leaderboard?.byWins },
    { id: 'games', label: '🎮 Most Games', data: leaderboard?.byGames },
    { id: 'winRate', label: '💯 Best Win Rate', data: leaderboard?.byWinRate },
    { id: 'bestTime', label: '⚡ Fastest Wins', data: leaderboard?.byBestTime },
  ];

  const renderLeaderboard = (players, metric) => {
    if (!players || players.length === 0) {
      return (
        <div className="text-center py-8 text-white/60">
          <div className="text-4xl mb-2">🏆</div>
          <div>No data available yet</div>
          <div className="text-sm mt-1">Play more games to see rankings!</div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {players.map((player, index) => (
          <div
            key={player.name}
            className="flex items-center justify-between bg-slate-600/30 rounded-lg p-3 hover:bg-slate-600/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                index === 0 ? 'bg-yellow-500 text-black' :
                index === 1 ? 'bg-gray-400 text-black' :
                index === 2 ? 'bg-orange-600 text-white' :
                'bg-slate-500 text-white'
              }`}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </div>
              <div>
                <div className="text-white font-bold">{player.name}</div>
                <div className="text-white/60 text-xs">
                  {metric === 'wins' && `${player.wins} wins • ${player.games} games`}
                  {metric === 'games' && `${player.games} games • ${player.winRate}% win rate`}
                  {metric === 'winRate' && `${player.winRate}% win rate • ${player.games} games`}
                  {metric === 'bestTime' && `${formatDuration(player.bestTime)} • ${player.games} games`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-bold">
                {metric === 'wins' && player.wins}
                {metric === 'games' && player.games}
                {metric === 'winRate' && `${player.winRate}%`}
                {metric === 'bestTime' && formatDuration(player.bestTime)}
              </div>
              <div className="text-white/60 text-xs">
                {metric === 'wins' && 'wins'}
                {metric === 'games' && 'games'}
                {metric === 'winRate' && 'win rate'}
                {metric === 'bestTime' && 'best time'}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-600">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-white">Loading leaderboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-600 relative max-h-[80vh] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white text-xl font-bold z-10"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 drop-shadow-lg">
            🌍 Global Leaderboard
          </h2>
          <div className="text-white/70 text-sm">
            {leaderboard?.totalPlayers || 0} players • Updated globally
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] px-3 py-2 rounded-lg font-bold transition-all text-xs ${
                activeTab === tab.id
                  ? 'bg-yellow-500 text-black shadow-lg'
                  : 'bg-slate-600/30 text-white/70 hover:bg-slate-600/50'
              }`}
            >
              {tab.label.split(' ')[0]}
              <div className="text-xs opacity-75 leading-none">
                {tab.label.split(' ').slice(1).join(' ')}
              </div>
            </button>
          ))}
        </div>

        {/* Leaderboard Content */}
        <div className="overflow-y-auto max-h-96">
          {renderLeaderboard(
            tabs.find(tab => tab.id === activeTab)?.data,
            activeTab
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t border-slate-600/30">
          <div className="text-center text-white/50 text-xs">
            <div>🏆 Rankings update automatically</div>
            <div className="mt-1">
              Last updated: {leaderboard?.lastUpdated ? new Date(leaderboard.lastUpdated).toLocaleString() : 'Never'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};