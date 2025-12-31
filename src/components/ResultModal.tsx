import { useState, useEffect } from 'react';
import { PuzzleData } from '../types';
import { GuessFeedback } from '../utils/api';
import { getStats } from '../utils/stats';
import { generateShareableResult, calculateScore, copyToClipboard } from '../utils/share';
import Toast from './Toast';

interface ResultModalProps {
  isCorrect: boolean;
  setData: PuzzleData;
  guesses: GuessFeedback[];
  usedHints: number;
  onClose: () => void;
  isLatestPuzzle?: boolean;
  onNavigateToPuzzle?: (date: string) => void;
}

function ResultModal({ isCorrect, setData, guesses, usedHints, onClose, isLatestPuzzle = true, onNavigateToPuzzle }: ResultModalProps) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'error' | 'info' | 'success' } | null>(null);
  const stats = getStats();
  const score = isCorrect ? calculateScore(guesses.length, usedHints) : 0;
  const shareableText = generateShareableResult(guesses, isCorrect, usedHints, setData.date);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleShare = async () => {
    // Try Web Share API first (mobile-friendly)
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Brick ${setData.date}`,
          text: shareableText,
        });
        return;
      } catch (err) {
        // User cancelled or error - fall through to clipboard
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
    
    // Fallback to clipboard
    try {
      await copyToClipboard(shareableText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setToast({ message: 'Failed to copy to clipboard', type: 'error' });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 shadow-xl my-4 max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation z-10"
          aria-label="Close"
        >
          ×
        </button>
        <div className="text-center">
          {isCorrect ? (
            <>
              <h2 id="result-title" className="text-xl sm:text-2xl font-bold text-green-600 mb-2">
                Correct!
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-2 break-words">
                You guessed it! The set is{' '}
                <span className="font-semibold">{setData.set_name}</span>
              </p>
              {score > 0 && (
                <p className="text-base sm:text-lg font-bold text-blue-600 mb-3 sm:mb-4">
                  Score: {score}/100
                </p>
              )}
            </>
          ) : (
            <>
              <h2 id="result-title" className="text-xl sm:text-2xl font-bold text-red-600 mb-2">
                Not quite!
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 break-words">
                The correct answer is{' '}
                <span className="font-semibold">{setData.set_name}</span>
              </p>
            </>
          )}

          {/* Completed Set Image - Main Reveal */}
          {setData.set_image_url && (
            <div className="mb-4 sm:mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4 shadow-md border-2 border-blue-200">
                <img
                  src={setData.set_image_url}
                  alt={`${setData.set_name} completed set`}
                  className="w-full h-auto rounded-lg object-contain max-h-64 sm:max-h-80 mx-auto"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Set Details - Above guesses */}
          <div className="bg-gray-100 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm sm:text-base text-gray-900">Correct Answer</h3>
              <a
                href={`https://rebrickable.com/sets/${setData.set_num}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm underline flex items-center gap-1"
              >
                View
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 break-words mb-2">
              <span className="font-semibold">Set:</span> {setData.set_name}
            </p>
            <p className="text-xs sm:text-sm text-gray-600 break-words">
              <span className="font-semibold">Set Number:</span> {setData.set_num}
            </p>
            {setData.set_year && (
              <p className="text-xs sm:text-sm text-gray-600">
                <span className="font-semibold">Year:</span> {setData.set_year}
              </p>
            )}
            {setData.set_num_parts && (
              <p className="text-xs sm:text-sm text-gray-600">
                <span className="font-semibold">Parts:</span> {setData.set_num_parts}
              </p>
            )}
            {setData.set_theme && (
              <p className="text-xs sm:text-sm text-gray-600">
                <span className="font-semibold">Theme:</span> {setData.set_theme}
              </p>
            )}
          </div>

          {/* Your Guesses */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-3">Your Guesses</h3>
            <div className="space-y-2 mb-3">
              {guesses.length === 0 ? (
                <div className="p-3 rounded-lg border bg-gray-100 border-gray-300">
                  <div className="font-medium text-sm sm:text-base text-gray-500 break-words text-center">
                    No guesses
                  </div>
                </div>
              ) : (
                [...guesses].reverse().map((guess, index) => (
                  <div
                    key={index}
                    className={`p-2.5 sm:p-3 rounded-lg border ${
                      guess.isCorrect
                        ? 'bg-green-50 border-green-300'
                        : 'bg-red-50 border-red-300'
                    }`}
                  >
                    <div className="flex items-start sm:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={`font-medium text-sm sm:text-base break-words ${
                            guess.isCorrect ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {guess.set_name}
                          </div>
                          {guess.set_num && (
                            <a
                              href={`https://rebrickable.com/sets/${guess.set_num}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                      {guess.isCorrect && (
                        <div className="text-green-600 font-bold text-sm sm:text-base flex-shrink-0">✓</div>
                      )}
                      {!guess.isCorrect && (
                        <div className="text-red-600 font-bold text-sm sm:text-base flex-shrink-0">✗</div>
                      )}
                    </div>
                    
                    {/* Additional comparison metrics */}
                    {!guess.isCorrect && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            <span>🧩</span>
                            <span>
                              {guess.sharedParts} shared ({guess.matchPercentage}%)
                              {guess.num_parts !== undefined && ` • ${guess.num_parts} parts`}
                            </span>
                          </div>
                          {guess.year !== undefined && (() => {
                            let yearLabel = `📅 ${guess.year}`;
                            let bgClass = 'bg-gray-100 text-gray-700';
                            let indicator = '';
                            
                            if (guess.sameYear === true) {
                              indicator = '✓';
                              bgClass = 'bg-green-100 text-green-800';
                            } else if (guess.sameYear === false && guess.targetYear && guess.year) {
                              const sameDecade = Math.floor(guess.year / 10) === Math.floor(guess.targetYear / 10);
                              
                              if (sameDecade) {
                                indicator = '✓';
                                bgClass = 'bg-yellow-100 text-yellow-800';
                              } else {
                                indicator = '✗';
                                bgClass = 'bg-red-100 text-red-800';
                              }
                            } else if (guess.sameYear === false) {
                              indicator = '✗';
                              bgClass = 'bg-red-100 text-red-800';
                            }
                            
                            return (
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${bgClass}`}>
                                {indicator && <span className="font-semibold">{indicator}</span>}
                                <span>{yearLabel}</span>
                              </div>
                            );
                          })()}
                          {guess.theme && (
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                              guess.sameTheme === true ? 'bg-green-100 text-green-800' : 
                              guess.sameTheme === false ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-700'
                            }`}>
                              <span className="font-semibold">{guess.sameTheme === true ? '✓' : guess.sameTheme === false ? '✗' : ''}</span>
                              <span>🎨 {guess.theme}</span>
                            </div>
                          )}
                          {guess.nameSimilarityPercentage !== undefined && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                              <span>📝</span>
                              <span>{guess.nameSimilarityPercentage}% name match</span>
                            </div>
                          )}
                          {guess.colorOverlapPercentage !== undefined && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-100 text-pink-800">
                              <span>🌈</span>
                              <span>{guess.colorOverlapPercentage}% colors</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <button
              onClick={handleShare}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors text-sm font-semibold min-h-[48px] flex items-center justify-center touch-manipulation"
              aria-label="Share your results"
            >
              {copied ? '✓ Copied!' : (typeof navigator !== 'undefined' && 'share' in navigator ? '📤 Share Results' : '📋 Copy Results')}
            </button>
          </div>

          {/* Statistics */}
          <div className="bg-gray-100 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-2 sm:mb-3">Statistics</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.currentStreak}</div>
                <div className="text-gray-600">Current Streak</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.maxStreak}</div>
                <div className="text-gray-600">Max Streak</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.gamesPlayed}</div>
                <div className="text-gray-600">Games Played</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}%
                </div>
                <div className="text-gray-600">Win Rate</div>
              </div>
            </div>
          </div>


          {onNavigateToPuzzle ? (
            <button
              onClick={() => {
                if (isLatestPuzzle) {
                  // Navigate to yesterday's puzzle
                  const puzzleDate = new Date(setData.date);
                  puzzleDate.setUTCDate(puzzleDate.getUTCDate() - 1);
                  const yesterdayStr = `${puzzleDate.getUTCFullYear()}-${String(puzzleDate.getUTCMonth() + 1).padStart(2, '0')}-${String(puzzleDate.getUTCDate()).padStart(2, '0')}`;
                  onNavigateToPuzzle(yesterdayStr);
                } else {
                  // Navigate to latest (today's) puzzle
                  const today = new Date().toISOString().split('T')[0];
                  onNavigateToPuzzle(today);
                }
                onClose();
              }}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-semibold min-h-[48px] touch-manipulation"
              aria-label={isLatestPuzzle ? "Play yesterday's puzzle" : "Play latest puzzle"}
            >
              {isLatestPuzzle ? "Play Yesterday's" : "Play Latest"}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm font-semibold min-h-[48px] touch-manipulation"
              aria-label="Close results modal"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default ResultModal;

