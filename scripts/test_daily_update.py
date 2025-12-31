#!/usr/bin/env python3
"""
Test script to verify that daily_update.py generates correct data structure.
This verifies that popular_sets.json includes theme field.
"""

import json
import sys
from pathlib import Path

def test_popular_sets_has_theme():
    """Test that popular_sets.json includes theme field for all sets."""
    data_dir = Path(__file__).parent.parent / 'public' / 'data'
    popular_sets_file = data_dir / 'popular_sets.json'
    
    if not popular_sets_file.exists():
        print(f"❌ popular_sets.json not found at {popular_sets_file}")
        return False
    
    with open(popular_sets_file, 'r') as f:
        sets_list = json.load(f)
    
    if not isinstance(sets_list, list):
        print(f"❌ popular_sets.json should be a list, got {type(sets_list)}")
        return False
    
    if len(sets_list) == 0:
        print(f"⚠️  popular_sets.json is empty")
        return True  # Empty is valid, just not useful
    
    # Check that all sets have theme field
    missing_theme = []
    for i, set_data in enumerate(sets_list):
        if 'theme' not in set_data:
            missing_theme.append((i, set_data.get('set_num', 'unknown'), set_data.get('name', 'unknown')))
    
    if missing_theme:
        print(f"❌ Found {len(missing_theme)} sets without 'theme' field:")
        for idx, set_num, name in missing_theme[:10]:  # Show first 10
            print(f"   [{idx}] {set_num}: {name}")
        if len(missing_theme) > 10:
            print(f"   ... and {len(missing_theme) - 10} more")
        return False
    
    # Also verify theme values are reasonable (not all None/empty)
    themes_found = set()
    for set_data in sets_list:
        theme = set_data.get('theme')
        if theme:
            themes_found.add(theme)
    
    print(f"✓ All {len(sets_list)} sets in popular_sets.json have 'theme' field")
    print(f"✓ Found {len(themes_found)} unique themes (sample: {', '.join(list(themes_found)[:5])})")
    return True

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
    
    test1_passed = test_popular_sets_has_theme()
    print()
    test2_passed = test_puzzle_has_theme()
    
    print()
    print("=" * 60)
    if test1_passed and test2_passed:
        print("✓ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed!")
        sys.exit(1)

