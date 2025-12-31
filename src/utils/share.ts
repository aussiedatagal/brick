import { GuessFeedback } from './api';

export function generateShareableResult(
  guesses: GuessFeedback[],
  isCorrect: boolean,
  usedHints: number,
  puzzleDate: string
): string {
  const maxGuesses = 5;
  const guessCount = guesses.length;
  
  // Create emoji grid similar to Wordle
  // Each guess shows match percentage as colored squares
  const lines: string[] = [];
  lines.push(`Brick ${puzzleDate}`);
  lines.push('');
  
  for (let i = 0; i < maxGuesses; i++) {
    if (i < guesses.length) {
      const guess = guesses[i];
      const percentage = guess.matchPercentage;
      
      // Create a row of squares based on percentage
      // 0-20%: ⬛ (black)
      // 21-40%: 🟨 (yellow)
      // 41-60%: 🟧 (orange)
      // 61-80%: 🟩 (light green)
      // 81-100%: 🟩 (green)
      // 100% and correct: 🟩 (green)
      
      let squares = '';
      const squaresPerRow = 5; // Show 5 squares per guess
      
      if (guess.isCorrect) {
        squares = '🟩'.repeat(squaresPerRow);
      } else {
        const filledSquares = Math.ceil((percentage / 100) * squaresPerRow);
        const emptySquares = squaresPerRow - filledSquares;
        
        if (percentage <= 20) {
          squares = '⬛'.repeat(filledSquares) + '⬜'.repeat(emptySquares);
        } else if (percentage <= 40) {
          squares = '🟨'.repeat(filledSquares) + '⬜'.repeat(emptySquares);
        } else if (percentage <= 60) {
          squares = '🟧'.repeat(filledSquares) + '⬜'.repeat(emptySquares);
        } else if (percentage <= 80) {
          squares = '🟩'.repeat(filledSquares) + '⬜'.repeat(emptySquares);
        } else {
          squares = '🟩'.repeat(filledSquares) + '⬜'.repeat(emptySquares);
        }
      }
      
      lines.push(`${squares} ${guess.matchPercentage}%`);
    } else {
      // Empty row
      lines.push('⬜'.repeat(5));
    }
  }
  
  lines.push('');
  
  if (isCorrect) {
    const score = calculateScore(guessCount, usedHints);
    lines.push(`Score: ${score}/100`);
    lines.push(`Guesses: ${guessCount}/${maxGuesses}`);
    if (usedHints > 0) {
      lines.push(`Hints used: ${usedHints} (-${usedHints * 10} points)`);
    }
  } else {
    lines.push('Failed to guess');
  }
  
  return lines.join('\n');
}

export function calculateScore(guessCount: number, usedHints: number): number {
  // Base score: 100 for guessing in 1 try, decreasing by 20 for each additional guess
  // Max score is 100, min is 0
  const baseScore = Math.max(0, 100 - (guessCount - 1) * 20);
  
  // Each hint reduces score by 10 points
  const hintPenalty = usedHints * 10;
  
  return Math.max(0, baseScore - hintPenalty);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  
  // Fallback for older browsers
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  
  try {
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return Promise.resolve();
  } catch (err) {
    document.body.removeChild(textArea);
    return Promise.reject(err);
  }
}

