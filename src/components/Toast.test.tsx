import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders message', () => {
    const onClose = vi.fn();
    render(<Toast message="Test message" onClose={onClose} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('calls onClose after duration', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} duration={1000} />);
    
    expect(onClose).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(1000);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders with error type styling', () => {
    const onClose = vi.fn();
    render(<Toast message="Error message" type="error" onClose={onClose} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-red-600');
  });

  it('renders with success type styling', () => {
    const onClose = vi.fn();
    render(<Toast message="Success message" type="success" onClose={onClose} />);
    
    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-green-600');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} />);
    
    const closeButton = screen.getByLabelText('Close notification');
    closeButton.click();
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

