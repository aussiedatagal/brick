#!/usr/bin/env python3
"""
Generate puzzles backwards from today, committing and pushing after each.
Usage:
    python scripts/generate_and_commit_puzzles.py [start_date] [max_days]
    If start_date is not provided, uses today's date.
    If max_days is not provided, generates until an existing puzzle is found or 365 days.
"""

import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

def generate_and_commit_puzzle(date_str):
    """Generate a puzzle for a date, then commit and push it."""
    print(f"\n{'='*60}")
    print(f"Generating puzzle for {date_str}...")
    print(f"{'='*60}\n")
    
    # Check if puzzle already exists
    puzzle_file = Path('public/data/puzzles') / f'{date_str}.json'
    if puzzle_file.exists():
        print(f"  ⊘ Puzzle for {date_str} already exists. Skipping...")
        return False
    
    # Generate puzzle
    try:
        result = subprocess.run(
            [sys.executable, 'scripts/daily_update.py', date_str],
            cwd='.',
            timeout=600  # 10 minute timeout
        )
        
        if result.returncode != 0:
            print(f"  ✗ Error generating puzzle (exit code: {result.returncode})")
            return False
        
        if not puzzle_file.exists():
            print(f"  ✗ Puzzle file was not created")
            return False
        
        print(f"  ✓ Puzzle generated successfully")
        
        # Commit the puzzle
        print(f"\n  Committing puzzle for {date_str}...")
        commit_result = subprocess.run(
            ['git', 'add', str(puzzle_file)],
            cwd='.',
            capture_output=True,
            text=True
        )
        
        if commit_result.returncode != 0:
            print(f"  ✗ Error staging file: {commit_result.stderr}")
            return False
        
        commit_result = subprocess.run(
            ['git', 'commit', '-m', f'Add puzzle for {date_str}'],
            cwd='.',
            capture_output=True,
            text=True
        )
        
        if commit_result.returncode != 0:
            print(f"  ✗ Error committing: {commit_result.stderr}")
            return False
        
        print(f"  ✓ Committed puzzle for {date_str}")
        
        # Push the commit
        print(f"  Pushing to remote...")
        push_result = subprocess.run(
            ['git', 'push'],
            cwd='.',
            capture_output=True,
            text=True
        )
        
        if push_result.returncode != 0:
            print(f"  ✗ Error pushing: {push_result.stderr}")
            return False
        
        print(f"  ✓ Pushed puzzle for {date_str}")
        return True
        
    except subprocess.TimeoutExpired:
        print(f"  ✗ Timeout generating puzzle (exceeded 10 minutes)")
        return False
    except Exception as e:
        print(f"  ✗ Exception: {e}")
        return False

def main():
    # Parse arguments
    if len(sys.argv) > 1:
        try:
            start_date = datetime.strptime(sys.argv[1], '%Y-%m-%d')
        except ValueError:
            print(f"Error: Invalid date format '{sys.argv[1]}'. Use YYYY-MM-DD format.")
            return
    else:
        start_date = datetime.now()
    
    max_days = int(sys.argv[2]) if len(sys.argv) > 2 else 365
    
    current_date = start_date
    success_count = 0
    skip_count = 0
    error_count = 0
    
    print(f"Generating puzzles backwards from {start_date.strftime('%Y-%m-%d')}")
    print(f"Maximum {max_days} days")
    
    for day in range(max_days):
        date_str = current_date.strftime('%Y-%m-%d')
        
        # Check if puzzle already exists
        puzzle_file = Path('public/data/puzzles') / f'{date_str}.json'
        if puzzle_file.exists():
            print(f"\n  ⊘ Puzzle for {date_str} already exists. Stopping.")
            break
        
        success = generate_and_commit_puzzle(date_str)
        
        if success:
            success_count += 1
        else:
            error_count += 1
            # Continue even on error, but you might want to stop
            # Uncomment the next line to stop on first error:
            # break
        
        # Move to previous day
        current_date -= timedelta(days=1)
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  ✓ Successfully generated and committed: {success_count}")
    print(f"  ⊘ Already existed (skipped): {skip_count}")
    print(f"  ✗ Errors: {error_count}")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()

