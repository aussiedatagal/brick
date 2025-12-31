#!/usr/bin/env python3
"""
Daily puzzle update script for Brick.
Downloads CSV files from Rebrickable and selects 5 unique parts from a popular set.
Stores image URLs from Rebrickable CDN (does not download images).
"""

import csv
import json
import multiprocessing
import os
import random
import re
import requests
import subprocess
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

REBRICKABLE_BASE_URL = 'https://rebrickable.com'
REBRICKABLE_DOWNLOADS_URL = 'https://rebrickable.com/downloads/'

# CSV file URLs - these may require authentication or be at different paths
# Try common URL patterns
CSV_FILES = {
    'sets': [
        'https://cdn.rebrickable.com/media/downloads/sets.csv.gz',
        'https://rebrickable.com/media/downloads/sets.csv.gz',
        'https://rebrickable.com/downloads/sets.csv',
    ],
    'inventories': [
        'https://cdn.rebrickable.com/media/downloads/inventories.csv.gz',
        'https://rebrickable.com/media/downloads/inventories.csv.gz',
        'https://rebrickable.com/downloads/inventories.csv',
    ],
    'inventory_parts': [
        'https://cdn.rebrickable.com/media/downloads/inventory_parts.csv.gz',
        'https://rebrickable.com/media/downloads/inventory_parts.csv.gz',
        'https://rebrickable.com/downloads/inventory_parts.csv',
    ],
    'parts': [
        'https://cdn.rebrickable.com/media/downloads/parts.csv.gz',
        'https://rebrickable.com/media/downloads/parts.csv.gz',
        'https://rebrickable.com/downloads/parts.csv',
    ],
    'colors': [
        'https://cdn.rebrickable.com/media/downloads/colors.csv.gz',
        'https://rebrickable.com/media/downloads/colors.csv.gz',
        'https://rebrickable.com/downloads/colors.csv',
    ],
    'themes': [
        'https://cdn.rebrickable.com/media/downloads/themes.csv.gz',
        'https://rebrickable.com/media/downloads/themes.csv.gz',
        'https://rebrickable.com/downloads/themes.csv',
    ],
    'elements': [
        'https://cdn.rebrickable.com/media/downloads/elements.csv.gz',
        'https://rebrickable.com/media/downloads/elements.csv.gz',
        'https://rebrickable.com/downloads/elements.csv',
    ],
}

def download_csv(urls, cache_dir, file_key):
    """Download a CSV file (try multiple URLs) and cache it locally."""
    import gzip
    
    # Determine filename from first URL
    filename = urls[0].split('/')[-1]
    if filename.endswith('.gz'):
        filename = filename[:-3]  # Remove .gz extension
    cache_path = cache_dir / filename
    
    # Use cached file if it exists and is less than 7 days old (CSV files are updated monthly)
    if cache_path.exists():
        file_age = datetime.now().timestamp() - cache_path.stat().st_mtime
        if file_age < 604800:  # 7 days (CSV files updated monthly, so 7 days is safe)
            print(f"  Using cached {filename} (age: {int(file_age/3600)} hours)")
            return cache_path
        else:
            print(f"  Cache expired for {filename} (age: {int(file_age/3600)} hours), re-downloading...")
    
    # Try each URL until one works
    for url in urls:
        try:
            print(f"  Trying {url}...")
            response = requests.get(url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Handle gzipped files
            if url.endswith('.gz'):
                # Decompress directly from response
                decompressed = gzip.decompress(response.content)
                with open(cache_path, 'wb') as f:
                    f.write(decompressed)
            else:
                with open(cache_path, 'wb') as f:
                    f.write(response.content)
            
            print(f"  ✓ Downloaded {filename}")
            return cache_path
        except Exception as e:
            print(f"    Failed: {e}")
            continue
    
    raise Exception(f"Could not download {file_key} from any URL")

def load_csv_dict(csv_path):
    """Load CSV file into a list of dictionaries."""
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def load_csv_indexed(csv_path, key_field):
    """Load CSV file and index by a key field."""
    data = {}
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = row[key_field]
            data[key] = row
    return data

def get_popular_sets_from_api(api_key, min_parts=10, min_year=2000, max_year=None, limit=500):
    """Get popular sets from Rebrickable API.
    
    Tries to fetch sets ordered by popularity if possible.
    Falls back to filtering by part count and year.
    """
    if max_year is None:
        max_year = datetime.now().year
    
    api_url = 'https://rebrickable.com/api/v3/lego/sets/'
    headers = {'Authorization': f'key {api_key}'} if api_key else {}
    
    sets = []
    page = 1
    page_size = 100
    
    try:
        while len(sets) < limit:
            params = {
                'page': page,
                'page_size': page_size,
                'min_parts': min_parts,
                'min_year': min_year,
                'max_year': max_year,
                'ordering': '-num_parts',  # Order by part count descending
            }
            
            response = requests.get(api_url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = data.get('results', [])
            if not results:
                break
            
            for set_data in results:
                sets.append({
                    'set_num': set_data.get('set_num', ''),
                    'name': set_data.get('name', ''),
                    'year': set_data.get('year', 0),
                    'num_parts': set_data.get('num_parts', 0),
                    'theme_id': set_data.get('theme_id', ''),
                    'img_url': set_data.get('set_img_url', ''),
                })
            
            if not data.get('next'):
                break
            
            page += 1
            
            # Rate limiting - be nice to the API
            import time
            time.sleep(0.5)
        
        return sets[:limit]
    except Exception as e:
        print(f"  ⚠ API request failed: {e}")
        return None

def get_popular_sets(sets_csv, min_parts=10, min_year=2000, max_year=None, limit=1000):
    """Get popular sets from CSV.
    
    Filters for sets that are:
    - Large enough (min_parts)
    - From recent years (min_year to max_year, or current year if max_year is None)
    - Sorted by part count (larger sets tend to be more well-known)
    """
    if max_year is None:
        max_year = datetime.now().year
    
    sets = []
    for row in sets_csv:
        try:
            num_parts = int(row.get('num_parts', 0) or 0)
            year = int(row.get('year', 0) or 0)
            
            # Filter by part count and year
            if num_parts >= min_parts and min_year <= year <= max_year:
                sets.append(row)
        except (ValueError, TypeError):
            continue
    
    # Sort by part count (descending) - larger sets are often more recognizable
    sets.sort(key=lambda x: int(x.get('num_parts', 0) or 0), reverse=True)
    return sets[:limit]

def get_set_inventory(set_num, inventories_csv=None, inventory_parts_csv=None, 
                      set_num_to_inventory_id=None, inventory_to_parts=None):
    """Get all parts for a specific set from CSV files or pre-computed indexes.
    
    If indexes are provided, uses them for O(1) lookup. Otherwise falls back to CSV search.
    """
    # Use pre-computed indexes if available (much faster)
    if set_num_to_inventory_id is not None and inventory_to_parts is not None:
        inventory_id = set_num_to_inventory_id.get(set_num)
        if not inventory_id:
            return []
        return inventory_to_parts.get(inventory_id, [])
    
    # Fallback to CSV search (slower, but works if indexes not available)
    # Find inventory_id for this set
    inventory_id = None
    for inv in inventories_csv:
        if inv.get('set_num') == set_num:
            inventory_id = inv.get('id')
            break
    
    if not inventory_id:
        return []
    
    # Get all parts for this inventory
    parts = []
    for inv_part in inventory_parts_csv:
        if inv_part.get('inventory_id') == inventory_id:
            parts.append({
                'part_num': inv_part.get('part_num', ''),
                'color_id': inv_part.get('color_id', '0'),
                'quantity': int(inv_part.get('quantity', 1) or 1),
            })
    
    return parts

def find_unique_parts(target_set_num, target_parts, all_inventories=None, inventory_parts_csv=None, 
                      parts_csv=None, part_to_sets_precomputed=None):
    """Find parts that are unique to the target set or appear in very few other sets.
    
    If part_to_sets_precomputed is provided, uses it directly (much faster).
    Otherwise falls back to building it from CSV files.
    """
    # Use pre-computed index if available (much faster)
    if part_to_sets_precomputed is not None:
        print(f"  Using pre-computed part-to-sets index...")
        # Convert list back to set for fast lookup
        part_to_sets = {k: set(v) for k, v in part_to_sets_precomputed.items()}
        print(f"  ✓ Loaded {len(part_to_sets):,} unique part:color combinations from index")
    else:
        # Fallback to building from CSV (slower)
        # Build a map of part_num:color_id -> list of set_nums that contain it
        part_to_sets = defaultdict(set)
        
        print(f"  Analyzing {len(all_inventories):,} inventories to find unique parts...")
        print(f"  Processing {len(inventory_parts_csv):,} inventory parts...")
        
        # Build index for faster lookup
        print(f"  Building inventory index...")
        inventory_to_parts = defaultdict(list)
        for inv_part in inventory_parts_csv:
            inv_id = inv_part.get('inventory_id')
            if inv_id:
                inventory_to_parts[inv_id].append(inv_part)
        
        print(f"  Indexed {len(inventory_to_parts):,} inventories")
        print(f"  Counting part occurrences across all sets...")
        
        processed = 0
        for inv in all_inventories:
            inv_id = inv.get('id')
            set_num = inv.get('set_num')
            
            if inv_id in inventory_to_parts:
                for inv_part in inventory_to_parts[inv_id]:
                    part_key = f"{inv_part.get('part_num')}:{inv_part.get('color_id')}"
                    part_to_sets[part_key].add(set_num)
            
            processed += 1
            if processed % 10000 == 0:
                print(f"    Processed {processed:,}/{len(all_inventories):,} inventories...")
        
        print(f"  ✓ Found {len(part_to_sets):,} unique part:color combinations")
    
    # Score parts based on uniqueness
    scored_parts = []
    for part in target_parts:
        part_key = f"{part['part_num']}:{part['color_id']}"
        sets_with_part = part_to_sets[part_key]
        
        # Remove target set from count
        other_sets_count = len(sets_with_part - {target_set_num})
        
        # Calculate uniqueness score
        # Lower other_sets_count = more unique = higher score
        uniqueness_score = 1000 if other_sets_count == 0 else max(0, 100 - (other_sets_count * 10))
        
        # Bonus for parts with images (check multiple possible fields)
        part_info = parts_csv.get(part['part_num'], {})
        has_image = bool(
            part_info.get('part_img_url') or 
            part_info.get('part_img_url') or
            part_info.get('part_img_url')
        )
        if has_image:
            uniqueness_score += 50
        else:
            # Penalty for parts without images - we need images!
            uniqueness_score -= 200
        
        # Penalty for parts unlikely to have images
        part_name = part_info.get('name', '').lower()
        if '1x1' in part_name and 'brick' in part_name:
            uniqueness_score -= 100
        # Heavy penalty for sticker sheets, strings, hoses - these rarely have images
        if any(word in part_name for word in ['sticker', 'string', 'hose', 'rubber', 'cord']):
            uniqueness_score -= 500
        
        scored_parts.append({
            'part': part,
            'part_info': part_info,
            'uniqueness_score': uniqueness_score,
            'other_sets_count': other_sets_count,
        })
    
    # Sort by uniqueness score (highest first)
    scored_parts.sort(key=lambda x: x['uniqueness_score'], reverse=True)
    
    # Filter to only parts with images available, then select top 5
    # Check which parts have images by trying to construct URLs
    parts_with_images = []
    for item in scored_parts:
        part_num = item['part']['part_num']
        part_info = item['part_info']
        
        # Check if part has image URL or if we can construct one
        has_url = bool(part_info.get('part_img_url'))
        if not has_url:
            # We'll try to download anyway, but prioritize ones with URLs
            # For now, include all parts and let download function handle it
            pass
        
        parts_with_images.append(item)
    
    # Select top 5 unique parts (prioritize those with image URLs)
    # Sort by: has image URL first, then by uniqueness score
    parts_with_images.sort(key=lambda x: (
        not bool(x['part_info'].get('part_img_url')),  # False (has URL) comes first
        -x['uniqueness_score']  # Higher score first
    ))
    
    selected = parts_with_images[:5]
    
    print(f"  ✓ Selected 5 unique parts:")
    for i, item in enumerate(selected, 1):
        part_name = item['part_info'].get('name', 'Unknown')
        other_count = item['other_sets_count']
        score = item['uniqueness_score']
        has_img = bool(item['part_info'].get('part_img_url'))
        print(f"    {i}. {part_name}")
        print(f"       - Appears in {other_count} other set(s)")
        print(f"       - Uniqueness score: {score}")
        print(f"       - Has image URL: {has_img}")
    
    return [item['part'] for item in selected]

def get_part_image_url(part_num, color_id, parts_csv, colors_csv, elements_csv):
    """Get part image URL from Rebrickable using element ID (no download)."""
    # Rebrickable uses element IDs for images, not part numbers
    # Find element_id for this part_num + color_id combination
    
    element_id = None
    if elements_csv:
        # Look for element with matching part_num and color_id
        for element in elements_csv.values():
            if (element.get('part_num') == part_num and 
                element.get('color_id') == str(color_id)):
                element_id = element.get('element_id')
                break
    
    # If no element found, try using part_num directly (some parts work this way)
    if not element_id:
        element_id = part_num
    
    # Try multiple URL patterns with element_id
    url_patterns = [
        f"https://cdn.rebrickable.com/media/parts/elements/{element_id}.jpg",
        f"https://cdn.rebrickable.com/media/parts/elements/{element_id}.png",
        # Try with leading zeros removed
        f"https://cdn.rebrickable.com/media/parts/elements/{element_id.lstrip('0')}.jpg",
    ]
    
    # Verify URL exists by checking if it returns a valid image
    for url in url_patterns:
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            if response.status_code == 200:
                # Check content type to ensure it's an image
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    print(f"    ✓ Found image URL")
                    return url
        except Exception as e:
            continue
    
    # If all URLs failed, return None
    return None

def get_set_image_url(set_img_url, set_num, api_key=None):
    """Get set image URL (no download, just return the URL if valid).
    
    Tries multiple methods:
    1. Verify the URL from CSV if provided
    2. Fetch from Rebrickable API if CSV URL is missing or invalid
    3. Try common URL patterns for set images
    """
    # First, try the URL from CSV if provided
    if set_img_url:
        try:
            response = requests.head(set_img_url, timeout=5, allow_redirects=True)
            if response.status_code == 200:
                # Check content type to ensure it's an image
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    print(f"  ✓ Found set image URL from CSV")
                    return set_img_url
        except Exception as e:
            print(f"  ⚠ CSV set image URL failed: {e}")
    
    # If CSV URL failed or missing, try fetching from API
    if api_key:
        try:
            api_url = f'https://rebrickable.com/api/v3/lego/sets/{set_num}/'
            headers = {'Authorization': f'key {api_key}'}
            response = requests.get(api_url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                api_img_url = data.get('set_img_url')
                if api_img_url:
                    # Verify the API URL works
                    try:
                        img_response = requests.head(api_img_url, timeout=5, allow_redirects=True)
                        if img_response.status_code == 200:
                            content_type = img_response.headers.get('content-type', '')
                            if 'image' in content_type:
                                print(f"  ✓ Found set image URL from API")
                                return api_img_url
                    except Exception as e:
                        print(f"  ⚠ API set image URL verification failed: {e}")
        except Exception as e:
            print(f"  ⚠ Failed to fetch set image from API: {e}")
    
    # Try common URL patterns as fallback
    # Try multiple variations of set number (with/without variant suffix)
    set_num_base = set_num.split('-')[0] if '-' in set_num else set_num
    url_patterns = [
        f"https://cdn.rebrickable.com/media/sets/{set_num}.jpg",
        f"https://cdn.rebrickable.com/media/sets/{set_num}.png",
        f"https://cdn.rebrickable.com/media/sets/{set_num_base}.jpg",
        f"https://cdn.rebrickable.com/media/sets/{set_num_base}.png",
        f"https://rebrickable.com/media/sets/{set_num}.jpg",
        f"https://rebrickable.com/media/sets/{set_num}.png",
        f"https://rebrickable.com/media/sets/{set_num_base}.jpg",
        f"https://rebrickable.com/media/sets/{set_num_base}.png",
        f"https://images.brickset.com/sets/images/{set_num}.jpg",
        f"https://images.brickset.com/sets/images/{set_num_base}.jpg",
    ]
    
    for url in url_patterns:
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image' in content_type:
                    print(f"  ✓ Found set image URL from pattern: {url}")
                    return url
        except Exception:
            continue
    
    print(f"  ⚠ WARNING: No set image URL found for {set_num}")
    print(f"     This puzzle will not show a solution image in the result modal.")
    return None

def compare_sets(target_parts, guess_parts):
    """Compare two sets and return match statistics."""
    if not guess_parts or len(guess_parts) == 0:
        return None
    
    # Create sets of part+color combinations
    target_set = set(
        f"{p['part_num']}:{p['color_id']}" for p in target_parts
    )
    guess_set = set(
        f"{p['part_num']}:{p['color_id']}" for p in guess_parts
    )
    
    # Count shared parts
    shared_count = len(target_set & guess_set)
    
    match_percentage = 0
    if len(target_parts) > 0:
        match_percentage = round((shared_count / len(target_parts)) * 100)
    
    return {
        'shared_parts': shared_count,
        'total_target_parts': len(target_parts),
        'total_guess_parts': len(guess_parts),
        'match_percentage': match_percentage,
    }

def remove_year_from_name(name):
    """Remove year from set name."""
    name = re.sub(r'\s*[-\u2013\u2014]\s*\d{4}\s*$', '', name)
    name = re.sub(r'\s*\(\d{4}\)\s*$', '', name)
    name = re.sub(r'\s+\d{4}\s*$', '', name)
    return name.strip().lower()

def process_set_batch(args):
    """Process a batch of sets and return comparisons (module-level for multiprocessing).
    
    Args:
        args: Tuple of (set_nums_batch, target_parts_set, target_parts_count, 
                       set_num, set_num_to_inventory_id, inventory_to_parts)
    
    Returns:
        List of (set_num, comparison_dict) tuples
    """
    (set_nums_batch, target_parts_set_local, target_parts_count_local, 
     target_set_num, set_num_to_inventory_id_local, inventory_to_parts_local) = args
    
    results = []
    for guess_set_num in set_nums_batch:
        if guess_set_num == target_set_num:
            # Target set - 100% match
            results.append((guess_set_num, {
                'shared_parts': target_parts_count_local,
                'total_target_parts': target_parts_count_local,
                'total_guess_parts': target_parts_count_local,
                'match_percentage': 100,
            }))
            continue
        
        try:
            # Get guess parts using indexes (O(1) lookup)
            inventory_id = set_num_to_inventory_id_local.get(guess_set_num)
            if not inventory_id:
                # Empty set - no match
                results.append((guess_set_num, {
                    'shared_parts': 0,
                    'total_target_parts': target_parts_count_local,
                    'total_guess_parts': 0,
                    'match_percentage': 0,
                }))
                continue
            
            guess_parts = inventory_to_parts_local.get(inventory_id, [])
            
            if not guess_parts:
                # Empty set - no match
                results.append((guess_set_num, {
                    'shared_parts': 0,
                    'total_target_parts': target_parts_count_local,
                    'total_guess_parts': 0,
                    'match_percentage': 0,
                }))
                continue
            
            # Fast comparison using pre-computed target set
            # Build guess parts set efficiently
            guess_parts_set = set()
            for p in guess_parts:
                part_key = f"{p['part_num']}:{p.get('color_id', '0')}"
                guess_parts_set.add(part_key)
            
            # Count shared parts using set intersection (very fast)
            shared_count = len(target_parts_set_local & guess_parts_set)
            match_percentage = round((shared_count / target_parts_count_local) * 100) if target_parts_count_local > 0 else 0
            
            comparison = {
                'shared_parts': shared_count,
                'total_target_parts': target_parts_count_local,
                'total_guess_parts': len(guess_parts),
                'match_percentage': match_percentage,
            }
            
            results.append((guess_set_num, comparison))
        except Exception:
            # Silently handle errors for individual sets
            results.append((guess_set_num, {
                'shared_parts': 0,
                'total_target_parts': target_parts_count_local,
                'total_guess_parts': 0,
                'match_percentage': 0,
            }))
    
    return results

def main(target_date=None):
    # Create cache directory for CSV files
    cache_dir = Path(__file__).parent.parent / '.cache'
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    # Create output directories
    if target_date:
        # Validate date format
        try:
            datetime.strptime(target_date, '%Y-%m-%d')
            today = target_date
        except ValueError:
            print(f"Error: Invalid date format '{target_date}'. Use YYYY-MM-DD format.")
            return
    else:
        today = datetime.now().strftime('%Y-%m-%d')
    data_dir = Path(__file__).parent.parent / 'public' / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Check if today's puzzle already exists
    puzzles_dir = data_dir / 'puzzles'
    puzzles_dir.mkdir(parents=True, exist_ok=True)
    date_puzzle_file = puzzles_dir / f'{today}.json'
    
    if date_puzzle_file.exists():
        print(f"Puzzle for {today} already exists. Skipping generation...")
        try:
            with open(date_puzzle_file, 'r') as f:
                puzzle_data = json.load(f)
            
            print(f"✓ Loaded existing puzzle from {date_puzzle_file}")
            print(f"\nSelected Set:")
            print(f"  Name: {puzzle_data.get('set_name', 'Unknown')}")
            print(f"  Number: {puzzle_data.get('set_num', 'Unknown')}")
            print(f"  Year: {puzzle_data.get('set_year', 'Unknown')}")
            print(f"  Parts: {puzzle_data.get('set_num_parts', 'Unknown')}")
            print(f"  Theme: {puzzle_data.get('set_theme', 'Unknown')}")
            return
        except Exception as e:
            print(f"⚠ Error loading existing puzzle: {e}")
            print("  Proceeding with new puzzle generation...")
    
    # Puzzle doesn't exist, proceed with generation
    print(f"Generating new puzzle for {today}...")
    
    # Download CSV files first (needed for index generation if indexes are missing)
    print("Downloading CSV files from Rebrickable...")
    csv_paths = {}
    for name, urls in CSV_FILES.items():
        try:
            csv_paths[name] = download_csv(urls, cache_dir, name)
        except Exception as e:
            print(f"  Error downloading {name}: {e}")
            raise
    
    # Try to load pre-computed indexes (much faster)
    print("\nLoading pre-computed indexes...")
    set_num_to_inventory_id = None
    inventory_to_parts = None
    part_to_sets_precomputed = None
    
    indexes_dir = data_dir / 'indexes'
    index_files = {
        'set_num_to_inventory_id': indexes_dir / 'set_num_to_inventory_id.json',
        'inventory_to_parts': indexes_dir / 'inventory_to_parts.json',
        'part_to_sets': indexes_dir / 'part_to_sets.json',
    }
    
    indexes_loaded = 0
    missing_indexes = []
    for index_name, index_file in index_files.items():
        if index_file.exists():
            try:
                with open(index_file, 'r') as f:
                    if index_name == 'set_num_to_inventory_id':
                        set_num_to_inventory_id = json.load(f)
                    elif index_name == 'inventory_to_parts':
                        inventory_to_parts = json.load(f)
                    elif index_name == 'part_to_sets':
                        part_to_sets_precomputed = json.load(f)
                indexes_loaded += 1
                print(f"  ✓ Loaded {index_name}")
            except Exception as e:
                print(f"  ⚠ Could not load {index_name}: {e}")
                missing_indexes.append(index_name)
        else:
            print(f"  ⚠ {index_name} not found")
            missing_indexes.append(index_name)
    
    # If indexes are missing, generate them now (CSV files are already downloaded)
    if missing_indexes:
        print(f"\n⚠ Missing {len(missing_indexes)} index file(s). Generating them now...")
        print("   This will make future puzzle generation much faster!")
        print("   The generated index files should be committed to git.")
        print("   Progress will be shown below:")
        print("   " + "-" * 56)
        try:
            # Run the preprocess script (don't capture output so it streams in real-time)
            preprocess_script = Path(__file__).parent / 'preprocess_indexes.py'
            result = subprocess.run(
                [sys.executable, str(preprocess_script)],
                cwd=Path(__file__).parent.parent,
                timeout=1800  # 30 minute timeout
            )
            print("   " + "-" * 56)
            if result.returncode == 0:
                print("  ✓ Successfully generated indexes!")
                # Reload the indexes we just generated
                for index_name in missing_indexes:
                    index_file = index_files[index_name]
                    if index_file.exists():
                        try:
                            with open(index_file, 'r') as f:
                                if index_name == 'set_num_to_inventory_id':
                                    set_num_to_inventory_id = json.load(f)
                                elif index_name == 'inventory_to_parts':
                                    inventory_to_parts = json.load(f)
                                elif index_name == 'part_to_sets':
                                    part_to_sets_precomputed = json.load(f)
                            print(f"  ✓ Loaded newly generated {index_name}")
                            indexes_loaded += 1
                        except Exception as e:
                            print(f"  ⚠ Could not load newly generated {index_name}: {e}")
            else:
                print(f"  ⚠ Index generation failed (exit code: {result.returncode})")
                print(f"     Puzzle generation will continue but will be slower")
        except subprocess.TimeoutExpired:
            print(f"  ⚠ Index generation timed out (exceeded 30 minutes)")
            print(f"     Puzzle generation will continue but will be slower")
        except Exception as e:
            print(f"  ⚠ Error generating indexes: {e}")
            print(f"     Puzzle generation will continue but will be slower")
    
    if indexes_loaded == len(index_files):
        print(f"  ✓ All indexes loaded - puzzle generation will be much faster!")
    elif indexes_loaded > 0:
        print(f"  ⚠ Only {indexes_loaded}/{len(index_files)} indexes loaded - some operations will be slower")
    else:
        print(f"  ⚠ No indexes available - puzzle generation will be slow")
    
    # Load CSV data (may not be needed if all indexes are available, but load for compatibility)
    print("\nLoading CSV data...")
    sets_csv = load_csv_indexed(csv_paths['sets'], 'set_num')
    # Only load inventories/inventory_parts if indexes not available
    inventories_csv = None
    inventory_parts_csv = None
    if set_num_to_inventory_id is None or inventory_to_parts is None:
        inventories_csv = load_csv_dict(csv_paths['inventories'])
        inventory_parts_csv = load_csv_dict(csv_paths['inventory_parts'])
    parts_csv = load_csv_indexed(csv_paths['parts'], 'part_num')
    colors_csv = load_csv_indexed(csv_paths['colors'], 'id')
    themes_csv = load_csv_indexed(csv_paths['themes'], 'id')
    
    # Try to load elements CSV (may not exist)
    elements_csv = None
    if 'elements' in csv_paths:
        try:
            elements_csv = load_csv_indexed(csv_paths['elements'], 'element_id')
            print(f"  Loaded {len(elements_csv)} elements")
        except Exception as e:
            print(f"  ⚠ Could not load elements CSV: {e}")
            elements_csv = None
    
    print(f"  Loaded {len(sets_csv)} sets")
    if inventories_csv:
        print(f"  Loaded {len(inventories_csv)} inventories")
    if inventory_parts_csv:
        print(f"  Loaded {len(inventory_parts_csv)} inventory parts")
    print(f"  Loaded {len(parts_csv)} parts")
    
    # Load popular sets from top_sets_complete.json
    print("\nLoading popular sets from top_sets_complete.json...")
    top_sets_file = data_dir / 'top_sets_complete.json'
    
    if not top_sets_file.exists():
        raise FileNotFoundError(f"top_sets_complete.json not found at {top_sets_file}")
    
    with open(top_sets_file, 'r', encoding='utf-8') as f:
        top_sets_data = json.load(f)
    
    print(f"  Loaded {len(top_sets_data)} sets from top_sets_complete.json")
    
    # Convert to format expected by the script
    # Build theme name to ID mapping
    theme_name_to_id = {}
    for theme_id, theme_data in themes_csv.items():
        theme_name = theme_data.get('name', '')
        if theme_name:
            theme_name_to_id[theme_name] = theme_id
    
    # Check which sets have already been used in previous puzzles
    print("\nChecking for previously used sets...")
    used_set_nums = set()
    for puzzle_file in puzzles_dir.glob('*.json'):
        if puzzle_file.name == f'{today}.json':
            continue  # Skip today's file if it exists
        try:
            with open(puzzle_file, 'r') as f:
                existing_puzzle = json.load(f)
                used_set_num = existing_puzzle.get('set_num')
                if used_set_num:
                    used_set_nums.add(used_set_num)
        except Exception as e:
            # Skip files that can't be read
            continue
    
    print(f"  Found {len(used_set_nums)} previously used sets")
    
    # Build available sets directly from top_sets_data with filters
    # Only include sets with ranking < 2000 (lower ranking = better) and not already used
    available_sets = []
    for set_num, set_info in top_sets_data.items():
        # Only include sets with ranking < 2000 (lower ranking = better)
        ranking = set_info.get('Ranking')
        if ranking is None or ranking >= 2000:
            continue
        
        # Skip already-used sets
        if set_num in used_set_nums:
            continue
        
        # Get additional info from sets_csv if available
        set_csv_data = sets_csv.get(set_num, {})
        
        # Look up theme_id from theme name
        theme_name = set_info.get('Theme', '')
        theme_id = theme_name_to_id.get(theme_name, '')
        
        available_sets.append({
            'set_num': set_num,
            'name': set_info.get('name', ''),
            'year': set_info.get('Year', 0),
            'num_parts': int(set_csv_data.get('num_parts', 0) or 0) if set_csv_data else 0,
            'theme_id': theme_id,
            'img_url': set_csv_data.get('set_img_url', '') if set_csv_data else '',
            'Theme': set_info.get('Theme', ''),
            'Count': set_info.get('Count', 0),
            'Ranking': ranking,
        })
    
    if len(available_sets) == 0:
        raise ValueError(f"No available sets! All sets with Ranking < 2000 have been used. "
                        f"Consider increasing the ranking threshold or using different criteria.")
    
    print(f"  {len(available_sets)} sets available (Ranking < 2000, excluding {len(used_set_nums)} used sets)")
    
    # Select a random popular set from available ones
    selected_set = random.choice(available_sets)
    set_num = selected_set['set_num']
    set_name = selected_set['name']
    set_year = int(selected_set.get('year', 0) or 0)
    set_num_parts = int(selected_set.get('num_parts', 0) or 0)
    theme_id = selected_set.get('theme_id', '')
    set_img_url = selected_set.get('img_url', '')
    
    print(f"\nSelected set: {set_name} ({set_num})")
    print(f"  Year: {set_year}, Parts: {set_num_parts}")
    if set_img_url:
        print(f"  Set image: {set_img_url}")
    
    # Get theme name (from CSV if available, otherwise from selected_set)
    theme_name = themes_csv.get(theme_id, {}).get('name', '') if theme_id else ''
    if not theme_name:
        # Fall back to theme from top_sets_complete.json
        theme_name = selected_set.get('Theme', '')
    
    # Get inventory for selected set
    print("\nGetting set inventory...")
    target_parts = get_set_inventory(
        set_num, 
        inventories_csv, 
        inventory_parts_csv,
        set_num_to_inventory_id,
        inventory_to_parts
    )
    print(f"  Found {len(target_parts)} parts in set")
    
    if len(target_parts) < 5:
        raise ValueError(f"Set has only {len(target_parts)} parts, need at least 5")
    
    # Find unique parts
    print(f"\nFinding unique parts from {len(target_parts)} total parts...")
    unique_parts = find_unique_parts(
        set_num,
        target_parts,
        inventories_csv,
        inventory_parts_csv,
        parts_csv,
        part_to_sets_precomputed
    )
    print(f"  ✓ Selected {len(unique_parts)} unique parts")
    
    # Get image URLs and prepare puzzle data
    # Try to get 8 parts with images (4 initial + 2 for hint 1 + 2 for hint 2) - if first 8 don't work, try more from target_parts
    print(f"\nFinding part image URLs...")
    puzzle_parts = []
    attempts = 0
    max_attempts = min(20, len(target_parts))  # Try up to 20 parts from the set
    
    # Start with the selected unique parts, but have backup options from all target parts
    all_candidate_parts = unique_parts.copy()
    # Add more parts from target_parts if needed (prioritize by uniqueness if we had that data)
    seen_part_keys = {f"{p['part_num']}:{p['color_id']}" for p in all_candidate_parts}
    for part in target_parts:
        part_key = f"{part['part_num']}:{part['color_id']}"
        if part_key not in seen_part_keys and len(all_candidate_parts) < max_attempts:
            all_candidate_parts.append(part)
            seen_part_keys.add(part_key)
    
    # Try to get 8 parts total: 4 initial + 2 for hint 1 + 2 for hint 2
    TARGET_PARTS_COUNT = 8
    for i, part in enumerate(all_candidate_parts, 1):
        if len(puzzle_parts) >= TARGET_PARTS_COUNT:
            break
        
        part_info = parts_csv.get(part['part_num'], {})
        part_name = part_info.get('name', 'Unknown')
        print(f"  [{i}/{len(all_candidate_parts)}] {part_name} ({part['part_num']})...")
        
        image_url = get_part_image_url(
            part['part_num'],
            part['color_id'],
            parts_csv,
            colors_csv,
            elements_csv
        )
        
        if image_url:
            color_info = colors_csv.get(part['color_id'], {})
            puzzle_parts.append({
                'part_num': part['part_num'],
                'part_name': part_name,
                'color_name': color_info.get('name', 'Unknown'),
                'color_rgb': color_info.get('rgb', '000000'),
                'image': image_url,
            })
        else:
            print(f"    ⚠ No image URL available")
        
        attempts += 1
    
    if len(puzzle_parts) < 4:
        raise ValueError(f"Only {len(puzzle_parts)} parts with images after {attempts} attempts, need at least 4. "
                        f"Selected set may not have enough parts with available images.")
    
    print(f"  ✓ Successfully found {len(puzzle_parts)} part image URLs (need at least 4, got {len(puzzle_parts)})")
    
    # Load API key if available
    api_key = None
    api_key_file = Path(__file__).parent.parent / 'rebrickable_api_key'
    if api_key_file.exists():
        try:
            with open(api_key_file, 'r') as f:
                api_key = f.read().strip()
        except Exception as e:
            print(f"  ⚠ Could not read API key: {e}")
    
    # Get set image URL
    print(f"\nFinding set image URL...")
    set_image_url_final = get_set_image_url(set_img_url, set_num, api_key)
    if not set_image_url_final:
        print(f"  ⚠ WARNING: Could not find set image URL for {set_num}")
        print(f"     The puzzle will be generated but will not have a solution image.")
    
    # Prepare all parts for comparison (part_num + color_id)
    # Only need the count for feedback, so we can just store the length
    # But keep minimal structure for compatibility
    all_parts_for_comparison = [
        {
            'part_num': p['part_num'],
            'color_id': int(p['color_id'] or 0),
        }
        for p in target_parts
    ]
    
    # Build sets list for autocomplete - include ALL sets with inventories
    # Use compact format with short field names to reduce JSON size and improve performance
    print(f"\nBuilding sets list for autocomplete (all sets with inventories)...")
    
    # Get all set numbers that have inventories (same as what we'll use for comparisons)
    if set_num_to_inventory_id:
        all_set_nums_for_autocomplete = set(set_num_to_inventory_id.keys())
    else:
        all_set_nums_for_autocomplete = set()
        for inv in inventories_csv:
            set_num_from_inv = inv.get('set_num')
            if set_num_from_inv:
                all_set_nums_for_autocomplete.add(set_num_from_inv)
    
    print(f"  Processing {len(all_set_nums_for_autocomplete):,} sets...")
    
    # Build compact format: use short keys to reduce JSON size
    # Format: {s: set_num, n: name, y?: year, p?: num_parts, t?: theme}
    sets_list = []
    processed = 0
    
    for set_num_item in sorted(all_set_nums_for_autocomplete):
        set_info = sets_csv.get(set_num_item, {})
        set_name_item = set_info.get('name', '')
        
        if not set_name_item:
            continue
        
        # Build compact entry (only include non-null optional fields)
        entry = {
            's': set_num_item,  # set_num
            'n': set_name_item,  # name
        }
        
        # Add optional fields only if they have values
        year_val = int(set_info.get('year', 0) or 0)
        if year_val > 0:
            entry['y'] = year_val  # year
        
        num_parts_val = int(set_info.get('num_parts', 0) or 0)
        if num_parts_val > 0:
            entry['p'] = num_parts_val  # num_parts
        
        # Get theme name
        theme_id_item = set_info.get('theme_id', '')
        theme_name_item = themes_csv.get(theme_id_item, {}).get('name', '') if theme_id_item else ''
        if theme_name_item:
            entry['t'] = theme_name_item  # theme
        
        sets_list.append(entry)
        processed += 1
        
        if processed % 5000 == 0:
            print(f"    Processed {processed:,}/{len(all_set_nums_for_autocomplete):,} sets...")
    
    # Sort alphabetically by name for better cache locality and binary search potential
    sets_list.sort(key=lambda x: x['n'].lower())
    
    print(f"  ✓ Created compact list with {len(sets_list):,} sets")
    
    # Pre-calculate comparisons for ALL sets (not just popular ones)
    # Get all unique set numbers that have inventories
    print(f"\nCollecting all sets with inventories...")
    collection_start = datetime.now()
    if set_num_to_inventory_id:
        # Use pre-computed index (much faster)
        all_set_nums_with_inventories = set(set_num_to_inventory_id.keys())
        print(f"  ✓ Using pre-computed index: {len(all_set_nums_with_inventories):,} sets")
    else:
        # Fallback to CSV search
        print(f"  ⚠ Index not available, scanning CSV files (this is slow)...")
        all_set_nums_with_inventories = set()
        for inv in inventories_csv:
            set_num_from_inv = inv.get('set_num')
            if set_num_from_inv:
                all_set_nums_with_inventories.add(set_num_from_inv)
        print(f"  ✓ Found {len(all_set_nums_with_inventories):,} sets")
    
    collection_elapsed = (datetime.now() - collection_start).total_seconds()
    print(f"  Collection took {collection_elapsed:.1f}s")
    
    print(f"\nPre-calculating set comparisons for ALL {len(all_set_nums_with_inventories):,} sets...")
    if set_num_to_inventory_id and inventory_to_parts:
        print("  ✓ Using pre-computed indexes - this should be much faster!")
    else:
        print("  ⚠ WARNING: Indexes not available - this will be very slow!")
    print("  This may take a while...")
    set_comparisons = {}
    
    # Build name grouping map for all sets (for year variant sharing)
    print("  Building name grouping map for all sets...")
    name_to_set_nums = {}
    for set_num_inv in all_set_nums_with_inventories:
        set_info = sets_csv.get(set_num_inv, {})
        set_name_inv = set_info.get('name', '')
        if set_name_inv:
            name_without_year = remove_year_from_name(set_name_inv)
            if name_without_year not in name_to_set_nums:
                name_to_set_nums[name_without_year] = []
            name_to_set_nums[name_without_year].append(set_num_inv)
    print(f"  ✓ Grouped {len(name_to_set_nums)} unique set names")
    
    # Pre-compute target parts set once for faster comparisons
    target_parts_set = set(
        f"{p['part_num']}:{p['color_id']}" for p in all_parts_for_comparison
    )
    target_parts_count = len(all_parts_for_comparison)
    
    # Calculate comparisons for all sets using parallel processing
    start_time = datetime.now()
    all_set_nums_list = sorted(all_set_nums_with_inventories)  # Sort for consistent processing
    
    # Determine number of CPU cores to use (leave 1 core free for system)
    num_workers = max(1, multiprocessing.cpu_count() - 1)
    print(f"  Using {num_workers} worker process(es) for parallel processing...")
    
    # Split sets into batches for parallel processing
    batch_size = max(100, len(all_set_nums_list) // (num_workers * 10))  # ~10 batches per worker
    batches = []
    for i in range(0, len(all_set_nums_list), batch_size):
        batches.append(all_set_nums_list[i:i + batch_size])
    
    print(f"  Processing {len(all_set_nums_list):,} sets in {len(batches)} batches...")
    
    # Prepare arguments for each batch
    batch_args = [
        (batch, target_parts_set, target_parts_count, set_num, 
         set_num_to_inventory_id, inventory_to_parts)
        for batch in batches
    ]
    
    # Process batches in parallel
    set_comparisons = {}
    processed_count = 0
    
    with multiprocessing.Pool(processes=num_workers) as pool:
        # Use imap_unordered for better progress tracking
        for batch_results in pool.imap_unordered(process_set_batch, batch_args):
            for guess_set_num, comparison in batch_results:
                set_comparisons[guess_set_num] = comparison
                
            processed_count += len(batch_results)
            
            # Progress updates
            elapsed = (datetime.now() - start_time).total_seconds()
            rate = processed_count / elapsed if elapsed > 0 else 0
            remaining = (len(all_set_nums_list) - processed_count) / rate if rate > 0 else 0
            pct = (processed_count * 100) // len(all_set_nums_list)
            print(f"  Progress: {processed_count:,}/{len(all_set_nums_list):,} sets ({pct}%) - "
                  f"ETA: {int(remaining//60)}m {int(remaining%60)}s")
    
    elapsed_total = (datetime.now() - start_time).total_seconds()
    print(f"  ✓ Completed in {int(elapsed_total//60)}m {int(elapsed_total%60)}s")
    
    # Handle year variant sharing (post-process, single-threaded for simplicity)
    print("  Sharing comparisons with year variants...")
    variant_count = 0
    for guess_set_num in all_set_nums_list:
        if guess_set_num not in set_comparisons:
            continue
        comparison = set_comparisons[guess_set_num]
        set_info = sets_csv.get(guess_set_num, {})
        set_name_variant = set_info.get('name', '')
        if set_name_variant:
            name_without_year = remove_year_from_name(set_name_variant)
            if name_without_year in name_to_set_nums:
                for variant_set_num in name_to_set_nums[name_without_year]:
                    if variant_set_num != guess_set_num and variant_set_num not in set_comparisons:
                        set_comparisons[variant_set_num] = comparison
                        variant_count += 1
    if variant_count > 0:
        print(f"  ✓ Shared comparisons with {variant_count} year variant sets")
    
    # Verify all sets have comparison data
    missing = all_set_nums_with_inventories - set(set_comparisons.keys())
    if missing:
        print(f"  Adding empty comparisons for {len(missing)} missing sets...")
        for set_num_missing in missing:
            set_comparisons[set_num_missing] = {
                'shared_parts': 0,
                'total_target_parts': len(all_parts_for_comparison),
                'total_guess_parts': 0,
                'match_percentage': 0,
            }
    
    print(f"  ✓ Pre-calculated comparisons for {len(set_comparisons):,} sets")
    
    # Save all sets list for autocomplete (all sets with inventories)
    print(f"\nSaving all sets list for autocomplete...")
    all_sets_file = data_dir / 'all_sets.json'
    with open(all_sets_file, 'w') as f:
        json.dump(sets_list, f, indent=2)
    all_sets_size = all_sets_file.stat().st_size
    all_sets_size_kb = all_sets_size / 1024
    print(f"  ✓ Saved all sets list to {all_sets_file}")
    print(f"  ✓ All sets file: {all_sets_size_kb:.2f} KB ({all_sets_size:,} bytes)")
    
    # Create puzzle data
    puzzle_data = {
        'date': today,
        'set_num': set_num,
        'set_name': set_name,
        'set_year': set_year if set_year > 0 else None,
        'set_num_parts': set_num_parts if set_num_parts > 0 else None,
        'set_theme': theme_name,
        'set_image_url': set_image_url_final if set_image_url_final else None,
        'parts': puzzle_parts,
        'all_parts': all_parts_for_comparison,
        'set_comparisons': set_comparisons,
    }
    
    # Save puzzle data
    print(f"\nSaving puzzle data...")
    
    # Save puzzle by date for historical access
    with open(date_puzzle_file, 'w') as f:
        json.dump(puzzle_data, f, indent=2)
    print(f"  ✓ Saved puzzle to {date_puzzle_file}")
    
    # Check file sizes
    puzzle_size = date_puzzle_file.stat().st_size
    puzzle_size_mb = puzzle_size / (1024 * 1024)
    print(f"  ✓ Puzzle file: {puzzle_size_mb:.2f} MB ({puzzle_size:,} bytes)")
    
    if puzzle_size_mb > 10:
        print(f"  ⚠ WARNING: Puzzle file is large ({puzzle_size_mb:.2f} MB).")
        print(f"     This is expected since it contains comparisons for all sets with inventories.")
    
    print(f"\n{'='*60}")
    print(f"✓ Puzzle saved to {date_puzzle_file}")
    print(f"\nSelected Set:")
    print(f"  Name: {set_name}")
    print(f"  Number: {set_num}")
    print(f"  Year: {set_year if set_year > 0 else 'Unknown'}")
    print(f"  Parts: {set_num_parts}")
    print(f"  Theme: {theme_name or 'Unknown'}")
    print(f"\nPuzzle Parts:")
    for i, part in enumerate(puzzle_parts, 1):
        print(f"  {i}. {part['part_name']} ({part['color_name']})")
    print(f"{'='*60}")

if __name__ == '__main__':
    import sys
    target_date = sys.argv[1] if len(sys.argv) > 1 else None
    main(target_date)
