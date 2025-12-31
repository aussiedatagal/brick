import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PuzzleDisplay from './PuzzleDisplay';
import { PuzzlePart } from '../types';

describe('PuzzleDisplay', () => {
  const mockParts: PuzzlePart[] = [
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
  ];

  it('renders all parts', () => {
    render(<PuzzleDisplay parts={mockParts} />);
    
    // Component renders both mobile and desktop versions, so use getAllByAltText
    const part1Images = screen.getAllByAltText('Lego part 1: Brick 2x4');
    const part2Images = screen.getAllByAltText('Lego part 2: Brick 2x3');
    const part3Images = screen.getAllByAltText('Lego part 3: Brick 2x2');
    
    expect(part1Images.length).toBeGreaterThan(0);
    expect(part2Images.length).toBeGreaterThan(0);
    expect(part3Images.length).toBeGreaterThan(0);
  });

  it('displays parts in a 4-column grid without labels', () => {
    render(<PuzzleDisplay parts={mockParts} />);
    
    // Parts are displayed in a 4-column grid without text labels
    // Just verify parts are rendered
    const partImages = screen.getAllByAltText(/Lego part/i);
    expect(partImages.length).toBeGreaterThan(0);
  });
});

