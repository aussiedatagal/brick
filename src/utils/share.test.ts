import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateShareableResult, calculateScore, copyToClipboard } from './share';
import { GuessFeedback } from './api';

describe('share', () => {
  describe('calculateScore', () => {
    it('returns 100 for first guess with no hints', () => {
      expect(calculateScore(1, 0)).toBe(100);
    });

    it('decreases by 20 for each additional guess', () => {
      expect(calculateScore(2, 0)).toBe(80);
      expect(calculateScore(3, 0)).toBe(60);
      expect(calculateScore(4, 0)).toBe(40);
      expect(calculateScore(5, 0)).toBe(20);
    });

    it('subtracts 10 points per hint', () => {
      expect(calculateScore(1, 1)).toBe(90);
      expect(calculateScore(1, 2)).toBe(80);
      expect(calculateScore(1, 3)).toBe(70);
    });

    it('combines guess and hint penalties', () => {
      expect(calculateScore(2, 1)).toBe(70); // 80 - 10
      expect(calculateScore(3, 2)).toBe(40); // 60 - 20
    });

    it('never returns negative score', () => {
      expect(calculateScore(10, 10)).toBe(0);
    });
  });

  describe('generateShareableResult', () => {
    const puzzleDate = '2024-01-01';

    it('generates correct result for winning game', () => {
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

      const result = generateShareableResult(guesses, true, 0, puzzleDate);
      expect(result).toContain('Brick 2024-01-01');
      expect(result).toContain('Score: 80/100');
      expect(result).toContain('Guesses: 2/5');
    });

    it('includes hint penalty in result', () => {
      const guesses: GuessFeedback[] = [
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

      const result = generateShareableResult(guesses, true, 2, puzzleDate);
      expect(result).toContain('Hints used: 2 (-20 points)');
      expect(result).toContain('Score: 80/100');
    });

    it('generates failure result correctly', () => {
      const guesses: GuessFeedback[] = [
        {
          set_name: 'Wrong Set',
          set_num: '123',
          sharedParts: 20,
          totalTargetParts: 100,
          totalGuessParts: 100,
          matchPercentage: 20,
          isCorrect: false,
        },
      ];

      const result = generateShareableResult(guesses, false, 0, puzzleDate);
      expect(result).toContain('Failed to guess');
      expect(result).not.toContain('Score:');
    });
  });

  describe('copyToClipboard', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('uses clipboard API when available', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      await copyToClipboard('test text');
      expect(mockWriteText).toHaveBeenCalledWith('test text');
    });

    it('falls back to execCommand when clipboard API unavailable', async () => {
      // Remove clipboard API
      delete (navigator as any).clipboard;

      const mockExecCommand = vi.fn().mockReturnValue(true);
      const originalExecCommand = document.execCommand;
      document.execCommand = mockExecCommand;

      const createElementSpy = vi.spyOn(document, 'createElement');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      await copyToClipboard('test text');

      expect(createElementSpy).toHaveBeenCalledWith('textarea');
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      expect(removeChildSpy).toHaveBeenCalled();

      // Restore
      document.execCommand = originalExecCommand;
    });
  });
});

