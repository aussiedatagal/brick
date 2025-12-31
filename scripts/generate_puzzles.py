#!/usr/bin/env python3
"""
Generate puzzles for a date range.
Usage:
    python scripts/generate_puzzles.py 2025-12-01 2025-12-31
    python scripts/generate_puzzles.py 2025-12-01  # Single date
"""

import subprocess
import sys
from datetime import datetime, timedelta

def generate_puzzles(start_date_str, end_date_str=None):
    """Generate puzzles for a date range."""
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
    except ValueError:
        print(f"Error: Invalid start date format '{start_date_str}'. Use YYYY-MM-DD format.")
        return
    
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        except ValueError:
            print(f"Error: Invalid end date format '{end_date_str}'. Use YYYY-MM-DD format.")
            return
    else:
        # Single date
        end_date = start_date
    
    if end_date < start_date:
        print("Error: End date must be after or equal to start date.")
        return
    
    current_date = start_date
    success_count = 0
    skip_count = 0
    error_count = 0
    
    total_days = (end_date - start_date).days + 1
    print(f"Generating puzzles from {start_date_str} to {end_date_str or start_date_str} ({total_days} day{'s' if total_days != 1 else ''})...")
    print(f"{'='*60}")
    
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        print(f"\n[{current_date.strftime('%B %d, %Y')}] Generating puzzle for {date_str}...")
        
        try:
            # Check if puzzle already exists before running
            from pathlib import Path
            puzzle_file = Path('public/data/puzzles') / f'{date_str}.json'
            file_existed_before = puzzle_file.exists()
            
            # Run without capturing output so it streams in real-time
            # This lets you see all the logging from daily_update.py
            result = subprocess.run(
                [sys.executable, 'scripts/daily_update.py', date_str],
                cwd='.',
                timeout=600  # 10 minute timeout per puzzle
            )
            
            if result.returncode == 0:
                file_exists_after = puzzle_file.exists()
                if file_existed_before:
                    skip_count += 1
                elif file_exists_after:
                    success_count += 1
                else:
                    # File doesn't exist - this shouldn't happen but handle it
                    error_count += 1
            else:
                print(f"  ✗ Error generating puzzle (exit code: {result.returncode})")
                error_count += 1
                
        except subprocess.TimeoutExpired:
            print(f"  ✗ Timeout generating puzzle (exceeded 10 minutes)")
            error_count += 1
        except Exception as e:
            print(f"  ✗ Exception: {e}")
            error_count += 1
        
        current_date += timedelta(days=1)
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  ✓ Successfully generated: {success_count}")
    print(f"  ⊘ Already existed (skipped): {skip_count}")
    print(f"  ✗ Errors: {error_count}")
    print(f"  Total: {success_count + skip_count + error_count} / {total_days}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python scripts/generate_puzzles.py START_DATE [END_DATE]")
        print("Example: python scripts/generate_puzzles.py 2025-12-01 2025-12-31")
        print("Example: python scripts/generate_puzzles.py 2025-12-01  # Single date")
        sys.exit(1)
    
    start_date = sys.argv[1]
    end_date = sys.argv[2] if len(sys.argv) > 2 else None
    generate_puzzles(start_date, end_date)

