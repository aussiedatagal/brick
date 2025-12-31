import { GuessFeedback } from '../utils/api';

interface GuessHistoryProps {
  guesses: GuessFeedback[];
}

function GuessHistory({ guesses }: GuessHistoryProps) {
  if (guesses.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 sm:mt-1.5 space-y-1">
      <h3 className="font-semibold text-[10px] sm:text-xs text-gray-700 mb-0.5">Your Guesses</h3>
      <div className="space-y-1">
        {[...guesses].reverse().map((guess, index) => (
          <div
            key={index}
            className={`p-1.5 sm:p-2 rounded-lg border ${
              guess.isCorrect
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}
          >
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <div className={`font-medium text-xs sm:text-sm break-words ${
                    guess.isCorrect ? 'text-green-900' : 'text-red-900'
                  }`}>{guess.set_name}</div>
                  {guess.set_num && (
                    <a
                      href={`https://rebrickable.com/sets/${guess.set_num}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-[10px] sm:text-xs underline flex items-center gap-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
              {guess.isCorrect && (
                <div className="text-green-600 font-bold text-xs sm:text-sm flex-shrink-0">✓</div>
              )}
              {!guess.isCorrect && (
                <div className="text-red-600 font-bold text-xs sm:text-sm flex-shrink-0">✗</div>
              )}
            </div>
            
            {/* Additional comparison metrics */}
            {!guess.isCorrect && (
              <div className="mt-1">
                <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[9px] sm:text-[10px]">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    <span>🧩</span>
                    <span>
                      {guess.sharedParts} shared ({guess.matchPercentage}%)
                      {guess.num_parts !== undefined && ` • ${guess.num_parts} parts`}
                    </span>
                  </div>
                  {guess.isLoadingExtraInfo && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Loading...</span>
                    </div>
                  )}
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
        ))}
      </div>
    </div>
  );
}

export default GuessHistory;

