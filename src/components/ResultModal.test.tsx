import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultModal from './ResultModal';
import { PuzzleData } from '../types';
import { GuessFeedback } from '../utils/api';

describe('ResultModal', () => {
  const mockSetData: PuzzleData = {
    date: '2024-01-01',
    set_num: '12345-1',
    set_name: 'Test Set',
    set_year: 2024,
    set_num_parts: 500,
    parts: [],
  };

  const mockOnClose = vi.fn();
  const mockGuesses: GuessFeedback[] = [];
  const mockUsedHints = 0;

  it('shows success message when correct', () => {
    render(
      <ResultModal
        isCorrect={true}
        setData={mockSetData}
        guesses={mockGuesses}
        usedHints={mockUsedHints}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText(/You guessed it!/)).toBeInTheDocument();
  });

  it('shows failure message when incorrect', () => {
    render(
      <ResultModal
        isCorrect={false}
        setData={mockSetData}
        guesses={mockGuesses}
        usedHints={mockUsedHints}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Not quite!')).toBeInTheDocument();
    expect(screen.getByText(/The correct answer is/)).toBeInTheDocument();
  });

  it('displays set information', () => {
    render(
      <ResultModal
        isCorrect={true}
        setData={mockSetData}
        guesses={mockGuesses}
        usedHints={mockUsedHints}
        onClose={mockOnClose}
      />
    );

    // Check that set name appears in the "Correct Answer" section
    expect(screen.getByText('Correct Answer')).toBeInTheDocument();
    // Get the parent container div (the bg-gray-100 div)
    const correctAnswerSection = screen.getByText('Correct Answer').closest('.bg-gray-100');
    expect(correctAnswerSection).toHaveTextContent('Test Set');
    expect(correctAnswerSection).toHaveTextContent('12345-1');
    expect(correctAnswerSection).toHaveTextContent('2024');
    expect(correctAnswerSection).toHaveTextContent('500');
  });
});

