import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InstructionsModal from './InstructionsModal';

describe('InstructionsModal', () => {
  it('renders instructions modal with title', () => {
    const mockOnClose = vi.fn();
    render(<InstructionsModal onClose={mockOnClose} />);
    
    expect(screen.getByText('How to Play')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    render(<InstructionsModal onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking outside the modal', () => {
    const mockOnClose = vi.fn();
    const { container } = render(<InstructionsModal onClose={mockOnClose} />);
    
    // Click on the backdrop (the outer div)
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).toBeInTheDocument();
    
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('does not call onClose when clicking inside the modal', () => {
    const mockOnClose = vi.fn();
    render(<InstructionsModal onClose={mockOnClose} />);
    
    // Click on the modal content
    const content = screen.getByText('Objective');
    fireEvent.click(content);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('displays all instruction sections', () => {
    const mockOnClose = vi.fn();
    render(<InstructionsModal onClose={mockOnClose} />);
    
    expect(screen.getByText('Objective')).toBeInTheDocument();
    expect(screen.getByText('Gameplay')).toBeInTheDocument();
    expect(screen.getByText('Hints')).toBeInTheDocument();
    expect(screen.getByText('Feedback')).toBeInTheDocument();
    expect(screen.getByText('Scoring')).toBeInTheDocument();
  });

  it('displays "Got it!" button', () => {
    const mockOnClose = vi.fn();
    render(<InstructionsModal onClose={mockOnClose} />);
    
    const gotItButton = screen.getByText('Got it!');
    expect(gotItButton).toBeInTheDocument();
  });

  it('calls onClose when "Got it!" button is clicked', () => {
    const mockOnClose = vi.fn();
    render(<InstructionsModal onClose={mockOnClose} />);
    
    const gotItButton = screen.getByText('Got it!');
    fireEvent.click(gotItButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    const mockOnClose = vi.fn();
    const { container } = render(<InstructionsModal onClose={mockOnClose} />);
    
    const modal = container.querySelector('[role="dialog"]');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'instructions-title');
  });
});

