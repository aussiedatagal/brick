import { useState } from 'react';
import { PuzzleData } from '../types';

interface HintsProps {
  puzzle: PuzzleData;
  usedHints: Set<number>;
  onUseHint: (hintIndex: number) => void;
  disabled?: boolean;
}

function Hints({ puzzle, usedHints, onUseHint, disabled }: HintsProps) {
  const [revealedHints, setRevealedHints] = useState<Set<number>>(new Set());

  const getWordStructure = () => {
    const words = puzzle.set_name.split(/\s+/);
    const firstLetters = words.map((word) => word[0]?.toUpperCase() || '').join(' ');
    return firstLetters;
  };

  const handleHintClick = (hintIndex: number) => {
    if (!disabled) {
      // If this hint hasn't been used yet, use it (costs points)
      if (!usedHints.has(hintIndex)) {
        onUseHint(hintIndex);
      }
      // Toggle reveal state
      setRevealedHints((prev) => {
        const next = new Set(prev);
        if (next.has(hintIndex)) {
          next.delete(hintIndex);
        } else {
          next.add(hintIndex);
        }
        return next;
      });
    }
  };
  
  const isHintDisabled = (): boolean => {
    return disabled ?? false;
  };

  const getPieceForHint = (hintIndex: number) => {
    // Hint 0 shows piece at index 4, hint 1 shows piece at index 5, etc.
    const pieceIndex = 4 + hintIndex;
    return puzzle.parts[pieceIndex] || null;
  };

  const getHintContent = (hintIndex: number): string => {
    switch (hintIndex) {
      case 0:
      case 1:
      case 2:
      case 3:
        // Piece hints - return empty string, will show image instead
        return '';
      case 4:
        return puzzle.set_year ? `Year: ${puzzle.set_year}` : 'Year: Unknown';
      case 5:
        return puzzle.set_num_parts ? `Parts: ${puzzle.set_num_parts}` : 'Parts: Unknown';
      case 6:
        return puzzle.set_theme || 'Theme: Unknown';
      case 7:
        return `Letters: ${getWordStructure()}`;
      default:
        return '';
    }
  };

  const getHintLabel = (hintIndex: number): string => {
    switch (hintIndex) {
      case 0:
        return 'Hint 1: Piece';
      case 1:
        return 'Hint 2: Piece';
      case 2:
        return 'Hint 3: Piece';
      case 3:
        return 'Hint 4: Piece';
      case 4:
        return 'Hint 5: Year';
      case 5:
        return 'Hint 6: Parts';
      case 6:
        return 'Hint 7: Theme';
      case 7:
        return 'Hint 8: Letters';
      default:
        return '';
    }
  };

  const isHintAvailable = (hintIndex: number): boolean => {
    return usedHints.has(hintIndex);
  };

  const isHintRevealed = (hintIndex: number): boolean => {
    return revealedHints.has(hintIndex);
  };

  return (
    <div className="mb-1.5 sm:mb-2">
      {/* Row 1: 4 Piece Hints */}
      <div className="mb-1 sm:mb-1.5">
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          {[0, 1, 2, 3].map((hintIndex) => {
            const available = isHintAvailable(hintIndex);
            const revealed = isHintRevealed(hintIndex);
            
            return (
              <button
                key={hintIndex}
                onClick={() => handleHintClick(hintIndex)}
                disabled={isHintDisabled()}
                className={`
                  relative aspect-square rounded border-2 transition-all touch-manipulation
                  ${available 
                    ? revealed
                      ? 'bg-blue-100 border-blue-400 shadow-inner'
                      : 'bg-gray-200 border-gray-400 hover:bg-gray-300 active:bg-gray-400'
                    : 'bg-gray-100 border-gray-300 opacity-60'
                  }
                  min-h-[44px] sm:min-h-[48px]
                `}
                aria-label={available ? `${getHintLabel(hintIndex)}: ${revealed ? (hintIndex < 4 ? 'Piece image revealed' : getHintContent(hintIndex)) : 'Click to reveal'}` : `${getHintLabel(hintIndex)}: Click to use and reveal (-10 points)`}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center">
                  {revealed ? (
                    // For piece hints, show the piece image
                    hintIndex < 4 ? (() => {
                      const piece = getPieceForHint(hintIndex);
                      return piece ? (
                        <img
                          src={piece.image}
                          alt={`Piece ${hintIndex + 1}`}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-[8px] sm:text-[10px] text-blue-900">No piece</div>
                      );
                    })() : (
                      <div className="text-[8px] sm:text-[10px] leading-tight font-medium text-blue-900 break-words overflow-hidden">
                        {getHintContent(hintIndex)}
                      </div>
                    )
                  ) : (
                    <div className="text-[8px] sm:text-[10px] font-semibold text-gray-600">
                      {available ? (
                        <>
                          <div className="text-[7px] sm:text-[9px]">{getHintLabel(hintIndex)}</div>
                          <div className="text-[6px] sm:text-[8px] mt-0.5 opacity-75">Tap</div>
                        </>
                      ) : (
                        <div className="text-[7px] sm:text-[9px] opacity-60">{getHintLabel(hintIndex)}</div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: 4 Word-Style Hints */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
        {[4, 5, 6, 7].map((hintIndex) => {
          const available = isHintAvailable(hintIndex);
          const revealed = isHintRevealed(hintIndex);
          
          return (
            <button
              key={hintIndex}
              onClick={() => handleHintClick(hintIndex)}
              disabled={isHintDisabled()}
              className={`
                relative aspect-square rounded border-2 transition-all touch-manipulation
                ${available 
                  ? revealed
                    ? 'bg-blue-100 border-blue-400 shadow-inner'
                    : 'bg-gray-200 border-gray-400 hover:bg-gray-300 active:bg-gray-400'
                  : 'bg-gray-100 border-gray-300 opacity-60'
                }
                min-h-[44px] sm:min-h-[48px]
              `}
              aria-label={available ? `${getHintLabel(hintIndex)}: ${revealed ? getHintContent(hintIndex) : 'Click to reveal'}` : `${getHintLabel(hintIndex)}: Click to use and reveal (-10 points)`}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center">
                {revealed ? (
                  <div className="text-[8px] sm:text-[10px] leading-tight font-medium text-blue-900 break-words overflow-hidden">
                    {getHintContent(hintIndex)}
                  </div>
                ) : (
                  <div className="text-[8px] sm:text-[10px] font-semibold text-gray-600">
                    {available ? (
                      <>
                        <div className="text-[7px] sm:text-[9px]">{getHintLabel(hintIndex)}</div>
                        <div className="text-[6px] sm:text-[8px] mt-0.5 opacity-75">Tap</div>
                      </>
                    ) : (
                      <div className="text-[7px] sm:text-[9px] opacity-60">{getHintLabel(hintIndex)}</div>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {usedHints.size < 8 && !disabled && (
        <p className="text-[8px] sm:text-[9px] text-gray-500 mt-0.5 text-center">
          Tap any hint to reveal (-10 points each)
        </p>
      )}
    </div>
  );
}

export default Hints;
