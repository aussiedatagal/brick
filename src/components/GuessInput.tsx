import { useState, useEffect, useRef } from 'react';
import { searchSets, SetSearchResult } from '../utils/api';
import { PuzzleData } from '../types';

interface GuessInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (guess: string) => void;
  disabled?: boolean;
  puzzle?: PuzzleData | null;
}

function GuessInput({ value, onChange, onSubmit, disabled }: GuessInputProps) {
  const [suggestions, setSuggestions] = useState<SetSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      justSelectedRef.current = false;
      return;
    }

    // Don't show suggestions if we just selected one
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      const results = await searchSets(value);
      setSuggestions(results);
      setShowSuggestions(true);
      setLoading(false);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit(value);
    }
  };

  const handleSuggestionClick = (suggestion: SetSearchResult) => {
    justSelectedRef.current = true;
    onChange(suggestion.name);
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={handleBlur}
            placeholder="Guess the Lego set name..."
            className="w-full px-2.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] text-xs sm:text-sm touch-manipulation"
            disabled={disabled}
            aria-label="Enter your guess for the Lego set name"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="suggestions-list"
          />
          {showSuggestions && (suggestions.length > 0 || loading) && (
            <div
              id="suggestions-list"
              className="absolute z-50 w-full mb-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[calc(100vh-200px)] sm:max-h-60 overflow-y-auto"
              role="listbox"
              style={{
                maxHeight: 'min(calc(100vh - 200px), 240px)',
                bottom: '100%',
                top: 'auto',
              }}
            >
              {loading ? (
                <div className="px-3 sm:px-4 py-3 text-gray-500 text-sm" role="status" aria-live="polite">
                  Searching...
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <button
                    key={suggestion.set_num}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 sm:px-4 py-3 hover:bg-gray-100 active:bg-gray-200 first:rounded-t-lg last:rounded-b-lg min-h-[48px] touch-manipulation text-sm sm:text-base"
                    role="option"
                    aria-label={`Select ${suggestion.name}`}
                  >
                    <div className="font-medium truncate">{suggestion.name}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="px-2 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors min-w-[50px] min-h-[44px] font-semibold touch-manipulation text-[11px] sm:text-sm whitespace-nowrap"
          aria-label="Submit your guess"
        >
          Guess
        </button>
      </form>
    </div>
  );
}

export default GuessInput;

