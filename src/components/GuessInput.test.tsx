import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuessInput from './GuessInput';

describe('GuessInput', () => {
  const mockOnChange = vi.fn();
  const mockOnSubmit = vi.fn();

  it('renders input and button', () => {
    render(
      <GuessInput
        value=""
        onChange={mockOnChange}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByPlaceholderText('Guess the Lego set name...')).toBeInTheDocument();
    expect(screen.getByLabelText('Submit your guess')).toBeInTheDocument();
  });

  it('calls onChange when input changes', () => {
    render(
      <GuessInput
        value=""
        onChange={mockOnChange}
        onSubmit={mockOnSubmit}
      />
    );

    const input = screen.getByPlaceholderText('Guess the Lego set name...');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(mockOnChange).toHaveBeenCalledWith('test');
  });

  it('calls onSubmit when form is submitted', () => {
    render(
      <GuessInput
        value="test guess"
        onChange={mockOnChange}
        onSubmit={mockOnSubmit}
      />
    );

    const button = screen.getByLabelText('Submit your guess');
    const form = button.closest('form');
    fireEvent.submit(form!);

    expect(mockOnSubmit).toHaveBeenCalledWith('test guess');
  });

  it('disables input when disabled prop is true', () => {
    render(
      <GuessInput
        value=""
        onChange={mockOnChange}
        onSubmit={mockOnSubmit}
        disabled={true}
      />
    );

    const input = screen.getByPlaceholderText('Guess the Lego set name...');
    expect(input).toBeDisabled();
  });
});

