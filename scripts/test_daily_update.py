#!/usr/bin/env python3
"""
Test script to verify that daily_update.py generates correct data structure.
This verifies that puzzle files include required fields.
"""

import json
import sys
from pathlib import Path

def test_puzzle_has_theme():
    """Test that puzzle JSON files include set_theme field."""
    data_dir = Path(__file__).parent.parent / 'public' / 'data'
    puzzles_dir = data_dir / 'puzzles'
    
    if not puzzles_dir.exists():
        print(f"⚠️  Puzzles directory not found at {puzzles_dir}")
        return True  # No puzzles yet is valid
    
    puzzle_files = list(puzzles_dir.glob('*.json'))
    if len(puzzle_files) == 0:
        print(f"⚠️  No puzzle files found")
        return True  # No puzzles yet is valid
    
    missing_theme = []
    for puzzle_file in puzzle_files[:5]:  # Check first 5 puzzles
        with open(puzzle_file, 'r') as f:
            puzzle_data = json.load(f)
        
        if 'set_theme' not in puzzle_data:
            missing_theme.append(puzzle_file.name)
    
    if missing_theme:
        print(f"❌ Found {len(missing_theme)} puzzle files without 'set_theme' field:")
        for filename in missing_theme:
            print(f"   {filename}")
        return False
    
    print(f"✓ All checked puzzle files have 'set_theme' field")
    return True

if __name__ == '__main__':
    print("Testing daily_update.py output...")
    print("=" * 60)
    
    test_passed = test_puzzle_has_theme()
    
    print()
    print("=" * 60)
    if test_passed:
        print("✓ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

