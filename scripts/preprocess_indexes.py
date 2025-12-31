#!/usr/bin/env python3
"""
Pre-process CSV files to create indexes that speed up puzzle generation.

This script creates:
1. set_num_to_inventory_id.json - Maps set_num -> inventory_id (O(1) lookup)
2. inventory_to_parts.json - Maps inventory_id -> list of parts (O(1) lookup)
3. part_to_sets.json - Maps part_num:color_id -> list of set_nums (for uniqueness analysis)

These indexes can be checked into git and will dramatically speed up puzzle generation.
"""

import csv
import json
import time
from collections import defaultdict
from pathlib import Path
from datetime import datetime

def load_csv_dict(csv_path):
    """Load CSV file into a list of dictionaries."""
    print(f"  Loading {csv_path.name}...")
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def main():
    overall_start = time.time()
    cache_dir = Path(__file__).parent.parent / '.cache'
    output_dir = Path(__file__).parent.parent / 'public' / 'data' / 'indexes'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("Pre-processing CSV files to create indexes...")
    print("=" * 60)
    
    # Check if CSV files exist
    required_files = ['inventories.csv', 'inventory_parts.csv']
    csv_paths = {}
    for filename in required_files:
        csv_path = cache_dir / filename
        if not csv_path.exists():
            raise FileNotFoundError(
                f"Required CSV file not found: {csv_path}\n"
                f"Please run daily_update.py first to download CSV files."
            )
        csv_paths[filename] = csv_path
    
    # Load CSV files
    print("\n1. Loading CSV files...")
    inventories_csv = load_csv_dict(csv_paths['inventories.csv'])
    inventory_parts_csv = load_csv_dict(csv_paths['inventory_parts.csv'])
    
    print(f"  ✓ Loaded {len(inventories_csv):,} inventories")
    print(f"  ✓ Loaded {len(inventory_parts_csv):,} inventory parts")
    
    # Build index 1: set_num -> inventory_id
    print("\n2. Building set_num -> inventory_id index...")
    start_time = time.time()
    set_num_to_inventory_id = {}
    for inv in inventories_csv:
        set_num = inv.get('set_num')
        inv_id = inv.get('id')
        if set_num and inv_id:
            # Some sets have multiple inventories (variants), use the first one
            if set_num not in set_num_to_inventory_id:
                set_num_to_inventory_id[set_num] = inv_id
    
    elapsed = time.time() - start_time
    print(f"  ✓ Indexed {len(set_num_to_inventory_id):,} sets in {elapsed:.1f}s")
    
    # Build index 2: inventory_id -> list of parts
    print("\n3. Building inventory_id -> parts index...")
    start_time = time.time()
    inventory_to_parts = defaultdict(list)
    processed = 0
    for inv_part in inventory_parts_csv:
        inv_id = inv_part.get('inventory_id')
        if inv_id:
            inventory_to_parts[inv_id].append({
                'part_num': inv_part.get('part_num', ''),
                'color_id': inv_part.get('color_id', '0'),
                'quantity': int(inv_part.get('quantity', 1) or 1),
            })
        processed += 1
        if processed % 200000 == 0:
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            remaining = (len(inventory_parts_csv) - processed) / rate if rate > 0 else 0
            print(f"    Processed {processed:,}/{len(inventory_parts_csv):,} inventory parts "
                  f"({processed*100//len(inventory_parts_csv)}%) - "
                  f"ETA: {int(remaining//60)}m {int(remaining%60)}s")
    
    # Convert defaultdict to regular dict for JSON serialization
    inventory_to_parts = dict(inventory_to_parts)
    elapsed = time.time() - start_time
    print(f"  ✓ Indexed {len(inventory_to_parts):,} inventories with parts in {elapsed:.1f}s")
    
    # Build index 3: part_num:color_id -> list of set_nums
    # This is the expensive one but only needs to be done once
    print("\n4. Building part_num:color_id -> set_nums index...")
    print("  This is the most time-consuming step and may take several minutes...")
    start_time = time.time()
    part_to_sets = defaultdict(set)
    
    # Build inventory_id -> set_num mapping for fast lookup
    print("  Building inventory_id -> set_num mapping...")
    inv_id_to_set_num = {}
    for inv in inventories_csv:
        inv_id = inv.get('id')
        set_num = inv.get('set_num')
        if inv_id and set_num:
            inv_id_to_set_num[inv_id] = set_num
    print(f"  ✓ Mapped {len(inv_id_to_set_num):,} inventories to set numbers")
    
    # Process inventory parts
    print("  Processing inventory parts to build part-to-sets mapping...")
    processed = 0
    for inv_part in inventory_parts_csv:
        inv_id = inv_part.get('inventory_id')
        if inv_id and inv_id in inv_id_to_set_num:
            set_num = inv_id_to_set_num[inv_id]
            part_key = f"{inv_part.get('part_num')}:{inv_part.get('color_id')}"
            part_to_sets[part_key].add(set_num)
        
        processed += 1
        if processed % 100000 == 0:
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            remaining = (len(inventory_parts_csv) - processed) / rate if rate > 0 else 0
            pct = processed * 100 // len(inventory_parts_csv)
            print(f"    Processed {processed:,}/{len(inventory_parts_csv):,} inventory parts "
                  f"({pct}%) - ETA: {int(remaining//60)}m {int(remaining%60)}s")
    
    elapsed = time.time() - start_time
    print(f"  ✓ Built part-to-sets mapping in {int(elapsed//60)}m {int(elapsed%60)}s")
    
    # Convert sets to lists for JSON serialization
    print("  Converting sets to lists for JSON serialization...")
    conversion_start = time.time()
    part_to_sets_list = {k: sorted(list(v)) for k, v in part_to_sets.items()}
    conversion_elapsed = time.time() - conversion_start
    print(f"  ✓ Indexed {len(part_to_sets_list):,} unique part:color combinations "
          f"(conversion took {conversion_elapsed:.1f}s)")
    
    # Save indexes to JSON files
    print("\n5. Saving indexes to JSON files...")
    save_start = time.time()
    
    # Save set_num_to_inventory_id
    print("  Saving set_num_to_inventory_id.json...")
    set_num_index_file = output_dir / 'set_num_to_inventory_id.json'
    with open(set_num_index_file, 'w') as f:
        json.dump(set_num_to_inventory_id, f, indent=2)
    set_num_size = set_num_index_file.stat().st_size / 1024
    print(f"    ✓ Saved ({set_num_size:.1f} KB)")
    
    # Save inventory_to_parts
    print("  Saving inventory_to_parts.json...")
    inventory_index_file = output_dir / 'inventory_to_parts.json'
    with open(inventory_index_file, 'w') as f:
        json.dump(inventory_to_parts, f, indent=2)
    inventory_size = inventory_index_file.stat().st_size / (1024 * 1024)
    print(f"    ✓ Saved ({inventory_size:.1f} MB)")
    
    # Save part_to_sets
    print("  Saving part_to_sets.json (this may take a moment)...")
    part_index_file = output_dir / 'part_to_sets.json'
    with open(part_index_file, 'w') as f:
        json.dump(part_to_sets_list, f, indent=2)
    part_size = part_index_file.stat().st_size / (1024 * 1024)
    print(f"    ✓ Saved ({part_size:.1f} MB)")
    
    save_elapsed = time.time() - save_start
    print(f"  ✓ All files saved in {save_elapsed:.1f}s")
    
    # Add metadata
    metadata = {
        'generated_at': datetime.now().isoformat(),
        'inventories_count': len(inventories_csv),
        'inventory_parts_count': len(inventory_parts_csv),
        'sets_count': len(set_num_to_inventory_id),
        'unique_parts_count': len(part_to_sets_list),
    }
    metadata_file = output_dir.parent / 'indexes_metadata.json'
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"  ✓ Saved indexes_metadata.json")
    
    overall_elapsed = time.time() - overall_start
    print("\n" + "=" * 60)
    print("✓ Pre-processing complete!")
    print("=" * 60)
    print(f"\nIndex files saved to: {output_dir}")
    print(f"Total size: {set_num_size + inventory_size * 1024 + part_size * 1024:.1f} KB")
    print(f"Total time: {int(overall_elapsed//60)}m {int(overall_elapsed%60)}s")
    print("\nThese files can be checked into git and will speed up puzzle generation.")

if __name__ == '__main__':
    main()

