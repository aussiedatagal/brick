#!/usr/bin/env python3
"""
Analyze the relationship between part count and set distribution.
This helps determine data-driven cutoffs for "popular" sets.

Note: Rebrickable CSV doesn't include owner count, so we analyze
part count distribution instead.
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

# Try to import matplotlib, but make it optional
try:
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

def load_sets_csv(cache_dir):
    """Load sets CSV file."""
    sets_path = cache_dir / 'sets.csv'
    if not sets_path.exists():
        print(f"Error: {sets_path} does not exist. Run daily_update.py first to download CSV files.")
        return None
    
    sets = []
    with open(sets_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                num_parts = int(row.get('num_parts', 0) or 0)
                year = int(row.get('year', 0) or 0)
                if num_parts > 0 and year >= 2000:  # Filter for modern sets
                    sets.append({
                        'set_num': row.get('set_num', ''),
                        'name': row.get('name', ''),
                        'year': year,
                        'num_parts': num_parts,
                        'theme_id': row.get('theme_id', ''),
                    })
            except (ValueError, TypeError):
                continue
    
    return sets

def analyze_by_part_count(sets):
    """Analyze sets grouped by part count ranges."""
    # Group by part count ranges
    ranges = [
        (0, 20, "0-20"),
        (20, 50, "20-50"),
        (50, 100, "50-100"),
        (100, 200, "100-200"),
        (200, 500, "200-500"),
        (500, 1000, "500-1000"),
        (1000, 2000, "1000-2000"),
        (2000, 5000, "2000-5000"),
        (5000, float('inf'), "5000+"),
    ]
    
    print("\n" + "="*60)
    print("Analysis by Part Count Range (sets from 2000+)")
    print("="*60)
    print(f"{'Range':<15} {'Count':<10} {'Avg Parts':<12} {'% of Total':<12}")
    print("-"*60)
    
    total = len(sets)
    for min_parts, max_parts, label in ranges:
        filtered = [s for s in sets if min_parts <= s['num_parts'] < max_parts]
        count = len(filtered)
        if count > 0:
            avg_parts = sum(s['num_parts'] for s in filtered) / count
            pct = (count / total * 100) if total > 0 else 0
            print(f"{label:<15} {count:<10} {avg_parts:<12.1f} {pct:<12.1f}%")
    
    print(f"\nTotal sets (2000+): {total}")

def create_scatter_plot(sets, output_path):
    """Create a scatter plot of part count vs year."""
    if not HAS_MATPLOTLIB:
        return False
    
    years = [s['year'] for s in sets]
    parts = [s['num_parts'] for s in sets]
    
    plt.figure(figsize=(12, 8))
    plt.scatter(years, parts, alpha=0.3, s=10)
    plt.xlabel('Year', fontsize=12)
    plt.ylabel('Part Count', fontsize=12)
    plt.title('Set Part Count Distribution by Year (2000+)', fontsize=14)
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(output_path)
    print(f"\n✓ Saved scatter plot to {output_path}")
    return True

def create_histogram(sets, output_path):
    """Create histogram of part count distribution."""
    if not HAS_MATPLOTLIB:
        return False
    
    parts = [s['num_parts'] for s in sets]
    
    plt.figure(figsize=(12, 6))
    plt.hist(parts, bins=50, edgecolor='black', alpha=0.7)
    plt.xlabel('Part Count', fontsize=12)
    plt.ylabel('Number of Sets', fontsize=12)
    plt.title('Distribution of Part Counts (sets from 2000+)', fontsize=14)
    plt.yscale('log')  # Log scale for better visualization
    plt.grid(True, alpha=0.3, axis='y')
    plt.tight_layout()
    plt.savefig(output_path)
    print(f"✓ Saved histogram to {output_path}")
    return True

def create_box_plot_by_range(sets, output_path):
    """Create box plot showing part count distribution by range."""
    if not HAS_MATPLOTLIB:
        return False
    
    ranges = [
        (0, 20, "0-20"),
        (20, 50, "20-50"),
        (50, 100, "50-100"),
        (100, 200, "100-200"),
        (200, 500, "200-500"),
        (500, 1000, "500-1000"),
        (1000, 2000, "1000-2000"),
        (2000, 5000, "2000-5000"),
    ]
    
    data_by_range = []
    labels = []
    
    for min_parts, max_parts, label in ranges:
        filtered = [s['num_parts'] for s in sets if min_parts <= s['num_parts'] < max_parts]
        if len(filtered) > 0:
            data_by_range.append(filtered)
            labels.append(f"{label}\n(n={len(filtered)})")
    
    if data_by_range:
        plt.figure(figsize=(14, 8))
        plt.boxplot(data_by_range, labels=labels)
        plt.xlabel('Part Count Range', fontsize=12)
        plt.ylabel('Part Count', fontsize=12)
        plt.title('Part Count Distribution by Range (sets from 2000+)', fontsize=14)
        plt.xticks(rotation=45, ha='right')
        plt.grid(True, alpha=0.3, axis='y')
        plt.tight_layout()
        plt.savefig(output_path)
        print(f"✓ Saved box plot to {output_path}")
        return True
    return False

def main():
    cache_dir = Path(__file__).parent.parent / '.cache'
    output_dir = Path(__file__).parent.parent / 'scripts' / 'analysis'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("Loading sets data...")
    sets = load_sets_csv(cache_dir)
    
    if not sets:
        return
    
    print(f"Loaded {len(sets)} sets from 2000+")
    
    # Run analysis
    analyze_by_part_count(sets)
    
    # Create visualizations (if matplotlib is available)
    if HAS_MATPLOTLIB:
        print("\nGenerating visualizations...")
        try:
            create_scatter_plot(sets, output_dir / 'part_count_by_year.png')
            create_histogram(sets, output_dir / 'part_count_distribution.png')
            create_box_plot_by_range(sets, output_dir / 'part_count_by_range.png')
            print("\n✓ Analysis complete! Check the 'scripts/analysis' directory for graphs.")
        except Exception as e:
            print(f"\n⚠ Error creating graphs: {e}")
            print("Analysis data is still available above.")
    else:
        print("\n⚠ matplotlib not available. Install with: pip install matplotlib")
        print("Analysis data is still available above.")
        print("You can also export the data to CSV for analysis in Excel/Google Sheets.")

if __name__ == '__main__':
    main()

