import { useState, useEffect } from 'react';
import PuzzleDisplay from './components/PuzzleDisplay';
import GuessInput from './components/GuessInput';
import ResultModal from './components/ResultModal';
import Hints from './components/Hints';
import GuessHistory from './components/GuessHistory';
import Toast from './components/Toast';
import StatsModal from './components/StatsModal';
import InstructionsModal from './components/InstructionsModal';
import { PuzzleData } from './types';
import { searchSets, GuessFeedback, calculateNameSimilarity, getSetParts, calculateColorOverlap } from './utils/api';
import { updateStatsForWin, updateStatsForLoss } from './utils/stats';
import { calculateScore } from './utils/share';

function App() {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [guess, setGuess] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedHints, setUsedHints] = useState<Set<number>>(new Set());
  const [guesses, setGuesses] = useState<GuessFeedback[]>([]);
  const [isProcessingGuess, setIsProcessingGuess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type?: 'error' | 'info' | 'success' } | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [hasPrevPuzzle, setHasPrevPuzzle] = useState<boolean>(true);
  const [hasNextPuzzle, setHasNextPuzzle] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const MAX_GUESSES = 5;

  // Get date from URL params or use today's date
  const getDateFromUrl = (): string => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    return new Date().toISOString().split('T')[0];
  };

  // Fallback to most recent available puzzle if today's doesn't exist
  const findMostRecentPuzzle = async (startDate: string): Promise<string> => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    // Parse date components to avoid timezone issues
    const [year, month, day] = startDate.split('-').map(Number);
    let currentDate = new Date(Date.UTC(year, month - 1, day));
    const maxDaysBack = 30; // Check up to 30 days back
    
    for (let i = 0; i < maxDaysBack; i++) {
      const dateStr = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;
      const puzzleUrl = `${baseUrl}data/puzzles/${dateStr}.json`;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // Quick check
        const response = await fetch(puzzleUrl, { 
          method: 'HEAD',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return dateStr;
        }
      } catch {
        // Continue to next date
      }
      
      currentDate.setUTCDate(currentDate.getUTCDate() - 1);
    }
    
    return startDate; // Return original if none found
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    // Parse date components to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Navigate to a different date
  const navigateToDate = (date: string) => {
    const params = new URLSearchParams(window.location.search);
    if (date === new Date().toISOString().split('T')[0]) {
      params.delete('date');
    } else {
      params.set('date', date);
    }
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.pushState({}, '', newUrl);
    loadPuzzle(date);
  };

  // Check if a puzzle exists for a given date
  const checkPuzzleExists = async (date: string): Promise<boolean> => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const puzzleUrl = `${baseUrl}data/puzzles/${date}.json`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for existence check
      
      // Use HEAD request for efficiency (just check if file exists)
      const response = await fetch(puzzleUrl, { 
        method: 'HEAD',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      
      return response.ok;
    } catch {
      // If check fails, assume it doesn't exist to be safe
      return false;
    }
  };

  // Navigate to previous/next day
  const navigateDay = (direction: 'prev' | 'next') => {
    // Always use URL as source of truth for current date
    const dateStr = getDateFromUrl();
    
    // Parse date components to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    
    // Add or subtract one day
    date.setUTCDate(date.getUTCDate() + (direction === 'next' ? 1 : -1));
    
    // Format back to YYYY-MM-DD
    const newDateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    navigateToDate(newDateStr);
  };

  // Load puzzle for a specific date
  const loadPuzzle = async (date: string) => {
    setLoading(true);
    setError(null);
    setGuess('');
    setShowResult(false);
    setUsedHints(new Set());
    setGuesses([]);
    // Set currentDate immediately so navigation works even if loading fails
    setCurrentDate(date);
    
    const baseUrl = import.meta.env.BASE_URL || '/';
    // Always use date-based path
    const puzzleUrl = `${baseUrl}data/puzzles/${date}.json`;
    
    // Check for prev/next puzzles in parallel with loading current puzzle
    // Parse date components to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    
    const prevDate = new Date(dateObj);
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
    const prevDateStr = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}-${String(prevDate.getUTCDate()).padStart(2, '0')}`;
    
    const nextDate = new Date(dateObj);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextDateStr = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDate.getUTCDate()).padStart(2, '0')}`;
    
    const today = new Date().toISOString().split('T')[0];
    // Next date should be disabled if it's after today (future date)
    const isNextDateFuture = nextDateStr > today;
    
    // Check prev/next puzzle existence in parallel
    const [hasPrev, hasNext] = await Promise.all([
      checkPuzzleExists(prevDateStr),
      isNextDateFuture ? Promise.resolve(false) : checkPuzzleExists(nextDateStr),
    ]);
    
    setHasPrevPuzzle(hasPrev);
    setHasNextPuzzle(hasNext);
    
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(puzzleUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          // If today's puzzle doesn't exist, try to find the most recent one
          if (date === new Date().toISOString().split('T')[0]) {
            const mostRecentDate = await findMostRecentPuzzle(date);
            if (mostRecentDate !== date) {
              // Found a recent puzzle, load that instead
              console.log(`Today's puzzle not available, loading ${mostRecentDate} instead`);
              return loadPuzzle(mostRecentDate);
            }
          }
          // Format date for display
          const formattedDate = formatDate(date);
          throw new Error(`No puzzle available for ${formattedDate}. Puzzles are generated daily, so this date may not have a puzzle yet.`);
        }
        throw new Error(`Failed to load puzzle: ${response.status} ${response.statusText}`);
      }
      
      try {
        const data: PuzzleData = await response.json();
        // Validate puzzle data structure
        if (!data.date || !data.set_num || !data.set_name || !Array.isArray(data.parts)) {
          const formattedDate = formatDate(date);
          throw new Error(`Invalid puzzle data format for ${formattedDate}. The puzzle file may be corrupted.`);
        }
        setPuzzle(data);
        setCurrentDate(data.date);
        setLoading(false);
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message.includes('Invalid puzzle data format')) {
          throw parseErr;
        }
        const formattedDate = formatDate(date);
        throw new Error(`Failed to parse puzzle data for ${formattedDate}. The puzzle file may be corrupted or invalid.`);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please check your connection and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to load puzzle');
      }
      setLoading(false);
    }
  };

  // Preload hint images when puzzle loads
  useEffect(() => {
    if (puzzle && puzzle.parts.length > 0) {
      // Preload images for hints 0-3 (pieces at indices 4-7)
      const hintImages: string[] = [];
      for (let i = 0; i < 4; i++) {
        const pieceIndex = 4 + i;
        const piece = puzzle.parts[pieceIndex];
        if (piece?.image) {
          hintImages.push(piece.image);
        }
      }
      
      // Preload all hint images
      hintImages.forEach((imageUrl) => {
        const img = new Image();
        img.src = imageUrl;
      });
    }
  }, [puzzle]);

  // Load puzzle on mount and when URL changes
  useEffect(() => {
    const date = getDateFromUrl();
    setCurrentDate(date);
    loadPuzzle(date);
  }, []);

  // Check if user has seen instructions before and show modal on first visit
  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem('brick_hasSeenInstructions');
    if (!hasSeenInstructions) {
      setShowInstructionsModal(true);
    }
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const date = getDateFromUrl();
      setCurrentDate(date);
      loadPuzzle(date);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleGuess = async (guessText: string) => {
    if (!puzzle || isProcessingGuess) return;
    
    // Check if max guesses reached
    if (guesses.length >= MAX_GUESSES) {
      return;
    }

    // Remove year from both guess and answer for comparison
    const removeYear = (name: string) => {
      return name.replace(/\s*[-\u2013\u2014]\s*\d{4}\s*$/, '')
        .replace(/\s*\(\d{4}\)\s*$/, '')
        .replace(/\s+\d{4}\s*$/, '')
        .trim();
    };
    
    const guessWithoutYear = removeYear(guessText);
    const answerWithoutYear = removeYear(puzzle.set_name);
    const normalizedGuess = guessWithoutYear.toLowerCase().trim();
    const normalizedAnswer = answerWithoutYear.toLowerCase().trim();

    // Check if it's an exact match (compare without year)
    // Use strict equality - no partial matching to avoid "Death Star II" matching "Death Star"
    const isExactMatch = normalizedGuess === normalizedAnswer;

    if (isExactMatch) {
      const feedback: GuessFeedback = {
        set_name: puzzle.set_name,
        set_num: puzzle.set_num,
        sharedParts: puzzle.all_parts?.length || 0,
        totalTargetParts: puzzle.all_parts?.length || 0,
        totalGuessParts: puzzle.all_parts?.length || 0,
        matchPercentage: 100,
        isCorrect: true,
        sameTheme: true,
        sameYear: true,
        colorOverlapPercentage: 100,
        nameSimilarityPercentage: 100,
        partCountDifference: 0,
      };
      const newGuesses = [...guesses, feedback];
      setGuesses(newGuesses);
      setIsCorrect(true);
      setShowResult(true);
      setGuess('');
      
      // Update stats
      updateStatsForWin(newGuesses.length, usedHints.size);
      return;
    }

      // Find the guessed set in the popular sets list
      setIsProcessingGuess(true);
      try {
        const allSets = await searchSets(guessText);
        // searchSets already returns names without years, so compare directly
        let matchedSet = allSets.find(
          (s) => removeYear(s.name).toLowerCase() === normalizedGuess
        );

      if (!matchedSet) {
        // Set not found - invalid guess
        setToast({ message: `"${guessText}" not found. Please select from the autocomplete suggestions.`, type: 'error' });
        setIsProcessingGuess(false);
        return;
      }

      // Use pre-calculated comparison from backend
      let comparison = puzzle.set_comparisons?.[matchedSet.set_num];
      
      // If no comparison found, try to find another set with the same name that has comparison data
      // This handles cases where searchSets grouped by name and returned a different year variant
      if (!comparison) {
        // Load all sets to find one with the same name that has comparison data
        const baseUrl = import.meta.env.BASE_URL || '/';
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const setsResponse = await fetch(`${baseUrl}data/top_sets_complete.json`, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (setsResponse.ok) {
            const allPopularSets = await setsResponse.json();
            // Handle different formats
            let normalizedSets: any[];
            if (Array.isArray(allPopularSets)) {
              // Compact format (s/n keys) or full array format
              normalizedSets = allPopularSets.length > 0 && 's' in allPopularSets[0]
                ? allPopularSets.map((s: any) => ({
                    set_num: s.s,
                    name: s.n,
                    year: s.y,
                    num_parts: s.p,
                    theme: s.t,
                  }))
                : allPopularSets;
            } else {
              // Object format (top_sets_complete.json)
              normalizedSets = Object.entries(allPopularSets).map(([set_num, setData]: [string, any]) => ({
                set_num,
                name: setData.name || '',
                year: setData.Year || setData.year || undefined,
                num_parts: setData.num_parts || undefined,
                theme: setData.Theme || setData.theme || undefined,
              }));
            }
            
            const nameWithoutYear = removeYear(matchedSet.name).toLowerCase();
            
            // Find any set with the same name (without year) that has comparison data
            const alternativeSet = normalizedSets.find((s: any) => {
              const sNameWithoutYear = removeYear(s.name).toLowerCase();
              return sNameWithoutYear === nameWithoutYear && 
                     puzzle.set_comparisons?.[s.set_num];
            });
            
            if (alternativeSet && puzzle.set_comparisons) {
              matchedSet = {
                ...matchedSet,
                set_num: alternativeSet.set_num,
                name: alternativeSet.name,
              };
              comparison = puzzle.set_comparisons[alternativeSet.set_num];
            }
          }
        } catch (fetchErr) {
          // Silently fail - we'll show error below if no comparison found
          console.error('Error fetching popular sets:', fetchErr);
        }
      }
      
      if (!comparison) {
        console.error('No comparison data found for:', matchedSet);
        setToast({ message: 'Could not find comparison data for this set. Please try another guess.', type: 'error' });
        setIsProcessingGuess(false);
        return;
      }

      // Calculate additional comparison metrics (immediate)
      const sameTheme = puzzle.set_theme && matchedSet.theme 
        ? puzzle.set_theme.toLowerCase() === matchedSet.theme.toLowerCase()
        : undefined;
      
      const sameYear = puzzle.set_year && matchedSet.year
        ? puzzle.set_year === matchedSet.year
        : undefined;
      
      const nameSimilarityPercentage = calculateNameSimilarity(
        puzzle.set_name,
        matchedSet.name
      );
      
      const partCountDifference = puzzle.set_num_parts && matchedSet.num_parts
        ? Math.abs(puzzle.set_num_parts - matchedSet.num_parts)
        : undefined;

      // Create immediate feedback with basic info
      const feedback: GuessFeedback = {
        set_name: matchedSet.name,
        set_num: matchedSet.set_num,
        sharedParts: comparison.shared_parts,
        totalTargetParts: comparison.total_target_parts,
        totalGuessParts: comparison.total_guess_parts,
        matchPercentage: comparison.match_percentage,
        isCorrect: false,
        sameTheme,
        sameYear,
        nameSimilarityPercentage,
        partCountDifference,
        year: matchedSet.year,
        theme: matchedSet.theme,
        num_parts: matchedSet.num_parts,
        targetYear: puzzle.set_year,
        isLoadingExtraInfo: true, // Show spinner for extra info
      };
      
      // Add feedback immediately
      const newGuesses = [...guesses, feedback];
      setGuesses(newGuesses);
      setGuess('');
      setIsProcessingGuess(false);
      
      // Load extra info (color overlap) asynchronously
      if (puzzle.all_parts && puzzle.all_parts.length > 0) {
        getSetParts(matchedSet.set_num)
          .then((guessParts) => {
            if (guessParts.length > 0) {
              const targetParts = puzzle.all_parts!.map(p => ({
                part_num: p.part_num,
                color_id: p.color_id,
              }));
              const colorOverlapPercentage = calculateColorOverlap(targetParts, guessParts);
              
              // Update the feedback with color overlap
              setGuesses((prevGuesses) => {
                const updatedGuesses = [...prevGuesses];
                const lastGuess = updatedGuesses[updatedGuesses.length - 1];
                if (lastGuess && lastGuess.set_num === matchedSet.set_num) {
                  updatedGuesses[updatedGuesses.length - 1] = {
                    ...lastGuess,
                    colorOverlapPercentage,
                    isLoadingExtraInfo: false,
                  };
                }
                return updatedGuesses;
              });
            } else {
              // No parts found, just mark as not loading
              setGuesses((prevGuesses) => {
                const updatedGuesses = [...prevGuesses];
                const lastGuess = updatedGuesses[updatedGuesses.length - 1];
                if (lastGuess && lastGuess.set_num === matchedSet.set_num) {
                  updatedGuesses[updatedGuesses.length - 1] = {
                    ...lastGuess,
                    isLoadingExtraInfo: false,
                  };
                }
                return updatedGuesses;
              });
            }
          })
          .catch((error) => {
            console.error('Error calculating color overlap:', error);
            // Mark as not loading even if it failed
            setGuesses((prevGuesses) => {
              const updatedGuesses = [...prevGuesses];
              const lastGuess = updatedGuesses[updatedGuesses.length - 1];
              if (lastGuess && lastGuess.set_num === matchedSet.set_num) {
                updatedGuesses[updatedGuesses.length - 1] = {
                  ...lastGuess,
                  isLoadingExtraInfo: false,
                };
              }
              return updatedGuesses;
            });
          });
      } else {
        // No parts to compare, mark as not loading
        setGuesses((prevGuesses) => {
          const updatedGuesses = [...prevGuesses];
          const lastGuess = updatedGuesses[updatedGuesses.length - 1];
          if (lastGuess && lastGuess.set_num === matchedSet.set_num) {
            updatedGuesses[updatedGuesses.length - 1] = {
              ...lastGuess,
              isLoadingExtraInfo: false,
            };
          }
          return updatedGuesses;
        });
      }
      
      // Check if max guesses reached
      if (newGuesses.length >= MAX_GUESSES) {
        // Game over - didn't guess correctly
        setIsCorrect(false);
        setShowResult(true);
        updateStatsForLoss();
      }
    } catch (error) {
      console.error('Error processing guess:', error);
      setToast({ message: 'Error processing your guess. Please try again.', type: 'error' });
    } finally {
      setIsProcessingGuess(false);
    }
  };

  const handleCloseModal = () => {
    setShowResult(false);
    setGuess('');
    setUsedHints(new Set());
    setGuesses([]);
  };

  const handleGiveUp = () => {
    if (!puzzle) return;
    setIsCorrect(false);
    setShowResult(true);
    updateStatsForLoss();
  };

  const handleUseHint = (hintIndex: number) => {
    if (usedHints.size < 8 && !usedHints.has(hintIndex)) {
      setUsedHints(new Set([...usedHints, hintIndex]));
    }
  };

  const getVisibleParts = () => {
    if (!puzzle) return [];
    // Show 4 pieces initially
    // Hints 1-4: +1 piece each (5, 6, 7, 8 total)
    // Only count hints 1-4 for revealing pieces
    const pieceHintsUsed = Array.from(usedHints).filter(h => h < 4).length;
    let partsToShow = 4 + pieceHintsUsed;
    // Cap at total available parts
    return puzzle.parts.slice(0, Math.min(partsToShow, puzzle.parts.length));
  };

  const today = new Date().toISOString().split('T')[0];
  const isToday = currentDate === today;

  // Calculate current game score (potential score if they win on next guess)
  const currentScore = puzzle && !showResult && guesses.length < MAX_GUESSES
    ? calculateScore(guesses.length + 1, usedHints.size) // +1 because next guess would be this count
    : 0;

  return (
    <div className="min-h-screen bg-gray-100 py-1 px-3 sm:py-2 sm:px-4 overflow-x-hidden">
      <div className="max-w-2xl mx-auto w-full">
        <header className="text-center mb-1 sm:mb-2">
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
            <div className="flex-1 flex flex-col items-center">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 leading-tight">Brick</h1>
              <p className="text-[10px] sm:text-xs text-gray-600 leading-tight -mt-0.5 whitespace-nowrap">Guess the Lego Set</p>
            </div>
            <div className="flex-1 flex justify-end gap-1">
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation"
                aria-label="View instructions"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowStatsModal(true)}
                className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center touch-manipulation"
                aria-label="View statistics"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {loading && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs text-blue-800 text-center">
              Loading puzzle...
            </div>
          </div>
        )}

        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-xs text-red-800 text-center">
              {error}
            </div>
          </div>
        )}

        {puzzle && (
          <>
            <PuzzleDisplay parts={getVisibleParts()} />

            <Hints
              puzzle={puzzle}
              usedHints={usedHints}
              onUseHint={handleUseHint}
              disabled={showResult}
            />
          </>
        )}

        {puzzle && (
          <div className="mt-1.5 sm:mt-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-gray-600">
                Guesses: {guesses.length}/{MAX_GUESSES}
              </span>
              {puzzle && !showResult && guesses.length < MAX_GUESSES && currentScore > 0 && (
                <span className="text-[10px] sm:text-xs text-gray-500">
                  Score: {currentScore}/100
                </span>
              )}
            </div>
            {guesses.length >= MAX_GUESSES && !showResult && (
              <span className="text-[10px] sm:text-xs text-red-600 font-semibold">
                Max guesses reached!
              </span>
            )}
          </div>
          <GuessInput
            value={guess}
            onChange={setGuess}
            onSubmit={handleGuess}
            disabled={showResult || isProcessingGuess || guesses.length >= MAX_GUESSES}
          />
          <div className="flex gap-1.5">
            {!showResult && guesses.length < MAX_GUESSES && (
              <button
                onClick={handleGiveUp}
                className="flex-1 px-2 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 active:bg-gray-700 transition-colors text-[11px] sm:text-sm font-semibold min-h-[44px] touch-manipulation"
                aria-label="Give up and reveal the answer"
              >
                Give Up
              </button>
            )}
          </div>
          {isProcessingGuess && (
            <div className="text-center text-[10px] sm:text-xs text-gray-600">
              Processing your guess...
            </div>
          )}
          </div>
        )}

        {puzzle && <GuessHistory guesses={guesses} />}

        {puzzle && showResult && (
          <ResultModal
            isCorrect={isCorrect}
            setData={puzzle}
            guesses={guesses}
            usedHints={usedHints.size}
            onClose={handleCloseModal}
            isLatestPuzzle={isToday}
            onNavigateToPuzzle={navigateToDate}
          />
        )}

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {showStatsModal && (
          <StatsModal onClose={() => setShowStatsModal(false)} />
        )}

        {showInstructionsModal && (
          <InstructionsModal 
            onClose={() => {
              setShowInstructionsModal(false);
              localStorage.setItem('brick_hasSeenInstructions', 'true');
            }} 
          />
        )}

        {/* Date Navigation - Bottom */}
        {currentDate && !loading && (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => navigateDay('prev')}
                disabled={!hasPrevPuzzle}
                className="px-2.5 py-1.5 bg-white rounded-lg shadow hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-semibold min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous day"
              >
                ←
              </button>
              <div className="bg-white px-2.5 py-1.5 rounded-lg shadow min-h-[44px] flex items-center justify-center flex-1 max-w-xs">
                <div className="text-center w-full">
                  <div className="text-xs text-gray-600 font-medium">
                    {formatDate(currentDate)}
                  </div>
                  {!isToday && (
                    <div className="text-[10px] text-gray-500 mt-0.5">Past Puzzle</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigateDay('next')}
                disabled={isToday || !hasNextPuzzle}
                className="px-2.5 py-1.5 bg-white rounded-lg shadow hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm font-semibold min-h-[44px] min-w-[44px] touch-manipulation flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next day"
              >
                →
              </button>
            </div>
            {!isToday && (
              <button
                onClick={() => navigateToDate(today)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline w-full text-center min-h-[44px] flex items-center justify-center touch-manipulation"
              >
                Go to Today's Puzzle
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-4 sm:mt-6 pt-2 sm:pt-3 border-t border-gray-200">
          <div className="text-center">
            <a
              href="http://aussiedatagal.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] sm:text-xs text-gray-500 hover:text-gray-700 underline min-h-[44px] inline-flex items-center justify-center touch-manipulation"
            >
              aussiedatagal.github.io
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;

