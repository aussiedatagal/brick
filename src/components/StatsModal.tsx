import { getStats } from '../utils/stats';

interface StatsModalProps {
  onClose: () => void;
}

function StatsModal({ onClose }: StatsModalProps) {
  const stats = getStats();
  const winRate = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 id="stats-title" className="text-xl sm:text-2xl font-bold text-gray-900">
            Statistics
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.currentStreak}</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Current Streak</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.maxStreak}</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Max Streak</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.gamesPlayed}</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Games Played</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">{winRate}%</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">Win Rate</div>
            </div>
          </div>

          {/* Guess Distribution */}
          {stats.gamesPlayed > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-3">Guess Distribution</h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((guessNum, index) => {
                  const count = stats.guessDistribution[index] || 0;
                  const maxCount = Math.max(...stats.guessDistribution.slice(0, 5), 1);
                  const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={guessNum} className="flex items-center gap-2">
                      <div className="text-xs sm:text-sm font-medium text-gray-700 w-6 sm:w-8">
                        {guessNum}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-5 sm:h-6 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all min-w-[2px] flex items-center justify-end pr-1"
                          style={{ width: `${barWidth}%` }}
                        >
                          {count > 0 && (
                            <span className="text-[10px] sm:text-xs font-semibold text-white">
                              {count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2">
                  <div className="text-xs sm:text-sm font-medium text-gray-700 w-6 sm:w-8">
                    X
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-5 sm:h-6 overflow-hidden">
                    {(() => {
                      const failedCount = stats.guessDistribution[5] || 0;
                      const maxCount = Math.max(...stats.guessDistribution.slice(0, 5), failedCount, 1);
                      const barWidth = maxCount > 0 ? (failedCount / maxCount) * 100 : 0;
                      return (
                        <div
                          className="bg-red-600 h-full rounded-full transition-all min-w-[2px] flex items-center justify-end pr-1"
                          style={{ width: `${barWidth}%` }}
                        >
                          {failedCount > 0 && (
                            <span className="text-[10px] sm:text-xs font-semibold text-white">
                              {failedCount}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 sm:mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-semibold min-h-[48px] touch-manipulation"
          aria-label="Close statistics"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default StatsModal;

