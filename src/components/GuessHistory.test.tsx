import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GuessHistory from './GuessHistory';
import { GuessFeedback } from '../utils/api';

describe('GuessHistory', () => {
  it('returns null when no guesses', () => {
    const { container } = render(<GuessHistory guesses={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays guess history', () => {
    const guesses: GuessFeedback[] = [
      {
        set_name: 'Test Set 1',
        set_num: '123',
        sharedParts: 50,
        totalTargetParts: 100,
        totalGuessParts: 100,
        matchPercentage: 50,
        isCorrect: false,
      },
      {
        set_name: 'Correct Set',
        set_num: '456',
        sharedParts: 100,
        totalTargetParts: 100,
        totalGuessParts: 100,
        matchPercentage: 100,
        isCorrect: true,
      },
    ];

    render(<GuessHistory guesses={guesses} />);
    
    expect(screen.getByText('Your Guesses')).toBeInTheDocument();
    expect(screen.getByText('Test Set 1')).toBeInTheDocument();
    expect(screen.getByText('Correct Set')).toBeInTheDocument();
    // Check for checkmark symbol (now just "✓" instead of "✓ Correct!")
    const checkmark = screen.getByText('✓');
    expect(checkmark).toBeInTheDocument();
  });

  it('displays match percentage', () => {
    const guesses: GuessFeedback[] = [
      {
        set_name: 'Test Set',
        set_num: '123',
        sharedParts: 75,
        totalTargetParts: 100,
        totalGuessParts: 100,
        matchPercentage: 75,
        isCorrect: false,
      },
    ];

    render(<GuessHistory guesses={guesses} />);
    
    expect(screen.getByText(/75 shared \(75%\)/i)).toBeInTheDocument();
  });

  it('shows progress bar for non-correct guesses', () => {
    const guesses: GuessFeedback[] = [
      {
        set_name: 'Test Set',
        set_num: '123',
        sharedParts: 50,
        totalTargetParts: 100,
        totalGuessParts: 100,
        matchPercentage: 50,
        isCorrect: false,
      },
    ];

    const { container } = render(<GuessHistory guesses={guesses} />);
    
    // Progress bar has been removed - verify it doesn't exist
    const progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toBeFalsy();
  });

  it('shows loading spinner when isLoadingExtraInfo is true', () => {
    const guesses: GuessFeedback[] = [
      {
        set_name: 'Test Set',
        set_num: '123',
        sharedParts: 50,
        totalTargetParts: 100,
        totalGuessParts: 100,
        matchPercentage: 50,
        isCorrect: false,
        isLoadingExtraInfo: true,
      },
    ];

    render(<GuessHistory guesses={guesses} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Check for spinner SVG
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('hides loading spinner when isLoadingExtraInfo is false', () => {
    const guesses: GuessFeedback[] = [
      {
        set_name: 'Test Set',
        set_num: '123',
        sharedParts: 50,
        totalTargetParts: 100,
        totalGuessParts: 100,
        matchPercentage: 50,
        isCorrect: false,
        isLoadingExtraInfo: false,
      },
    ];

    render(<GuessHistory guesses={guesses} />);
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('hides loading spinner when isLoadingExtraInfo is undefined', () => {
    const guesses: GuessFeedback[] = [
      {
        set_name: 'Test Set',
        set_num: '123',
        sharedParts: 50,
        totalTargetParts: 100,
        totalGuessParts: 100,
        matchPercentage: 50,
        isCorrect: false,
      },
    ];

    render(<GuessHistory guesses={guesses} />);
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});

