import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Hints from './Hints';
import { PuzzleData } from '../types';

describe('Hints', () => {
  const mockPuzzle: PuzzleData = {
    date: '2024-01-01',
    set_num: '12345-1',
    set_name: 'Test Set Name',
    set_year: 2024,
    set_num_parts: 500,
    set_theme: 'Star Wars',
    parts: [
      // Initial 4 pieces (shown in puzzle display)
      {
        part_num: '3001',
        part_name: 'Brick 2x4',
        color_name: 'Red',
        color_rgb: 'DC143C',
        image: '/data/images/2024-01-01/part1.png',
      },
      {
        part_num: '3002',
        part_name: 'Brick 2x3',
        color_name: 'Blue',
        color_rgb: '0000FF',
        image: '/data/images/2024-01-01/part2.png',
      },
      {
        part_num: '3003',
        part_name: 'Brick 2x2',
        color_name: 'Green',
        color_rgb: '008000',
        image: '/data/images/2024-01-01/part3.png',
      },
      {
        part_num: '3004',
        part_name: 'Brick 1x4',
        color_name: 'Yellow',
        color_rgb: 'FFFF00',
        image: '/data/images/2024-01-01/part4.png',
      },
      // Pieces revealed by hints (indices 4-7)
      {
        part_num: '3005',
        part_name: 'Plate 2x4',
        color_name: 'Red',
        color_rgb: 'DC143C',
        image: '/data/images/2024-01-01/part5.png',
      },
      {
        part_num: '3006',
        part_name: 'Plate 2x3',
        color_name: 'Blue',
        color_rgb: '0000FF',
        image: '/data/images/2024-01-01/part6.png',
      },
      {
        part_num: '3007',
        part_name: 'Plate 2x2',
        color_name: 'Green',
        color_rgb: '008000',
        image: '/data/images/2024-01-01/part7.png',
      },
      {
        part_num: '3008',
        part_name: 'Plate 1x4',
        color_name: 'Yellow',
        color_rgb: 'FFFF00',
        image: '/data/images/2024-01-01/part8.png',
      },
    ],
  };

  let mockOnUseHint: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnUseHint = vi.fn();
  });

  it('renders 8 hint cards (4 piece hints + 4 word hints)', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set()} onUseHint={mockOnUseHint} />);
    
    // Should have 8 hint buttons total
    expect(screen.getByLabelText(/Hint 1: Piece/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hint 2: Piece/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hint 3: Piece/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hint 4: Piece/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hint 5: Year/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hint 6: Parts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hint 7: Theme/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hint 8: Letters/i)).toBeInTheDocument();
  });

  it('shows hint indicator when hints available', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set()} onUseHint={mockOnUseHint} />);
    
    expect(screen.getByText(/Tap any hint to reveal/i)).toBeInTheDocument();
  });

  it('calls onUseHint when clicking any hint', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set()} onUseHint={mockOnUseHint} />);
    
    // Click hint 5 (Year) - should work even though no hints used yet
    const hint5Button = screen.getByLabelText(/Hint 5: Year: Click to use and reveal/i);
    fireEvent.click(hint5Button);
    
    expect(mockOnUseHint).toHaveBeenCalledWith(4); // Hint indices are 0-based: 0-3 piece, 4-7 word
    expect(mockOnUseHint).toHaveBeenCalledTimes(1);
  });

  it('allows clicking any hint in any order', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set()} onUseHint={mockOnUseHint} />);
    
    // Click hint 7 (Theme) first - index 6
    const hint7Button = screen.getByLabelText(/Hint 7: Theme: Click to use and reveal/i);
    fireEvent.click(hint7Button);
    expect(mockOnUseHint).toHaveBeenCalledWith(6);
    
    // Then click hint 2 (Piece) - index 1
    const hint2Button = screen.getByLabelText(/Hint 2: Piece: Click to use and reveal/i);
    fireEvent.click(hint2Button);
    expect(mockOnUseHint).toHaveBeenCalledWith(1);
    
    // Then click hint 1 (Piece) - index 0
    const hint1Button = screen.getByLabelText(/Hint 1: Piece: Click to use and reveal/i);
    fireEvent.click(hint1Button);
    expect(mockOnUseHint).toHaveBeenCalledWith(0);
    
    expect(mockOnUseHint).toHaveBeenCalledTimes(3);
  });

  it('reveals hint content when clicked', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set([0])} onUseHint={mockOnUseHint} />);
    
    // Hint 1 (index 0) is already used, click to reveal
    const hint1Button = screen.getByLabelText(/Hint 1: Piece: Click to reveal/i);
    fireEvent.click(hint1Button);
    
    // After clicking, should show the piece image (piece at index 4)
    expect(screen.getByAltText('Piece 1')).toBeInTheDocument();
    expect(screen.getByAltText('Piece 1')).toHaveAttribute('src', '/data/images/2024-01-01/part5.png');
  });

  it('does not call onUseHint again if hint already used', () => {
    const usedHints = new Set([4]); // Hint 5 is index 4
    mockOnUseHint.mockClear(); // Clear any previous calls
    render(<Hints puzzle={mockPuzzle} usedHints={usedHints} onUseHint={mockOnUseHint} />);
    
    // Click hint 5 again (already used)
    const hint5Button = screen.getByLabelText(/Hint 5: Year: Click to reveal/i);
    fireEvent.click(hint5Button);
    
    // Should not call onUseHint again (hint already used)
    expect(mockOnUseHint).not.toHaveBeenCalled();
  });

  it('displays year when hint 5 is revealed', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set([4])} onUseHint={mockOnUseHint} />); // Hint 5 is index 4
    
    // Click hint 5 to reveal it
    const hint5Button = screen.getByLabelText(/Hint 5: Year: Click to reveal/i);
    fireEvent.click(hint5Button);
    
    // Should show year
    expect(screen.getByText(/Year: 2024/i)).toBeInTheDocument();
  });

  it('displays parts when hint 6 is revealed', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set([5])} onUseHint={mockOnUseHint} />); // Hint 6 is index 5
    
    // Click hint 6 to reveal it
    const hint6Button = screen.getByLabelText(/Hint 6: Parts: Click to reveal/i);
    fireEvent.click(hint6Button);
    
    expect(screen.getByText(/Parts: 500/i)).toBeInTheDocument();
  });

  it('displays theme when hint 7 is revealed', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set([6])} onUseHint={mockOnUseHint} />); // Hint 7 is index 6
    
    // Click hint 7 to reveal it
    const hint7Button = screen.getByLabelText(/Hint 7: Theme: Click to reveal/i);
    fireEvent.click(hint7Button);
    
    expect(screen.getByText('Star Wars')).toBeInTheDocument();
  });

  it('displays letters when hint 8 is revealed', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set([7])} onUseHint={mockOnUseHint} />); // Hint 8 is index 7
    
    // Click hint 8 to reveal it
    const hint8Button = screen.getByLabelText(/Hint 8: Letters: Click to reveal/i);
    fireEvent.click(hint8Button);
    
    // Should show word structure (T S N for "Test Set Name")
    expect(screen.getByText(/T S N/i)).toBeInTheDocument();
  });

  it('toggles hint reveal on click', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set([0])} onUseHint={mockOnUseHint} />); // Hint 1 is index 0
    
    const hint1Button = screen.getByLabelText(/Hint 1: Piece: Click to reveal/i);
    
    // First click reveals - should show piece image
    fireEvent.click(hint1Button);
    expect(screen.getByAltText('Piece 1')).toBeInTheDocument();
    
    // Second click hides
    fireEvent.click(hint1Button);
    expect(screen.queryByAltText('Piece 1')).not.toBeInTheDocument();
  });

  it('shows piece image when piece hint is revealed', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set([0])} onUseHint={mockOnUseHint} />);
    
    // Hint 1 (index 0) is used, click to reveal
    const hint1Button = screen.getByLabelText(/Hint 1: Piece: Click to reveal/i);
    fireEvent.click(hint1Button);
    
    // Should show the piece image (piece at index 4)
    const pieceImage = screen.getByAltText('Piece 1');
    expect(pieceImage).toBeInTheDocument();
    expect(pieceImage).toHaveAttribute('src', '/data/images/2024-01-01/part5.png');
  });

  it('shows correct piece image for each piece hint', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set([0, 1, 2, 3])} onUseHint={mockOnUseHint} />);
    
    // Reveal hint 1 (should show piece at index 4)
    const hint1Button = screen.getByLabelText(/Hint 1: Piece: Click to reveal/i);
    fireEvent.click(hint1Button);
    expect(screen.getByAltText('Piece 1')).toHaveAttribute('src', '/data/images/2024-01-01/part5.png');
    
    // Reveal hint 2 (should show piece at index 5)
    const hint2Button = screen.getByLabelText(/Hint 2: Piece: Click to reveal/i);
    fireEvent.click(hint2Button);
    expect(screen.getByAltText('Piece 2')).toHaveAttribute('src', '/data/images/2024-01-01/part6.png');
    
    // Reveal hint 3 (should show piece at index 6)
    const hint3Button = screen.getByLabelText(/Hint 3: Piece: Click to reveal/i);
    fireEvent.click(hint3Button);
    expect(screen.getByAltText('Piece 3')).toHaveAttribute('src', '/data/images/2024-01-01/part7.png');
    
    // Reveal hint 4 (should show piece at index 7)
    const hint4Button = screen.getByLabelText(/Hint 4: Piece: Click to reveal/i);
    fireEvent.click(hint4Button);
    expect(screen.getByAltText('Piece 4')).toHaveAttribute('src', '/data/images/2024-01-01/part8.png');
  });

  it('shows "No piece" text if piece is not available for hint', () => {
    const puzzleWithoutEnoughParts: PuzzleData = {
      ...mockPuzzle,
      parts: mockPuzzle.parts.slice(0, 5), // Only 5 parts, so hint 2 (index 1) won't have a piece
    };
    
    render(<Hints puzzle={puzzleWithoutEnoughParts} usedHints={new Set([1])} onUseHint={mockOnUseHint} />);
    
    // Reveal hint 2 (should show "No piece" since part at index 5 doesn't exist)
    const hint2Button = screen.getByLabelText(/Hint 2: Piece: Click to reveal/i);
    fireEvent.click(hint2Button);
    
    expect(screen.getByText('No piece')).toBeInTheDocument();
  });

  it('shows hint labels for all hints even when not used', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set()} onUseHint={mockOnUseHint} />);
    
    // All hints should show their labels, not "?"
    expect(screen.getByText(/Hint 1: Piece/i)).toBeInTheDocument();
    expect(screen.getByText(/Hint 5: Year/i)).toBeInTheDocument();
    expect(screen.getByText(/Hint 7: Theme/i)).toBeInTheDocument();
  });

  it('hides hint indicator when all hints used', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set([0, 1, 2, 3, 4, 5, 6, 7])} onUseHint={mockOnUseHint} />);
    
    expect(screen.queryByText(/Tap any hint/i)).not.toBeInTheDocument();
  });

  it('disables hints when disabled prop is true', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set()} onUseHint={mockOnUseHint} disabled={true} />);
    
    // All hints should be disabled
    const hint1Button = screen.getByLabelText(/Hint 1: Piece:/i);
    expect(hint1Button).toBeDisabled();
  });

  it('allows clicking multiple hints in sequence', () => {
    render(<Hints puzzle={mockPuzzle} usedHints={new Set()} onUseHint={mockOnUseHint} />);
    
    // Click hint 3 (index 2)
    const hint3Button = screen.getByLabelText(/Hint 3: Piece: Click to use and reveal/i);
    fireEvent.click(hint3Button);
    expect(mockOnUseHint).toHaveBeenCalledWith(2);
    
    // Click hint 6 (index 5)
    const hint6Button = screen.getByLabelText(/Hint 6: Parts: Click to use and reveal/i);
    fireEvent.click(hint6Button);
    expect(mockOnUseHint).toHaveBeenCalledWith(5);
    
    // Click hint 1 (index 0)
    const hint1Button = screen.getByLabelText(/Hint 1: Piece: Click to use and reveal/i);
    fireEvent.click(hint1Button);
    expect(mockOnUseHint).toHaveBeenCalledWith(0);
    
    expect(mockOnUseHint).toHaveBeenCalledTimes(3);
  });
});
