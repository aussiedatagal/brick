#!/usr/bin/env python3
"""
Scrape top sets data from Rebrickable top sets report page.
Combines all sets from all-time, years, and themes into one flat structure.
"""

import json
import re
import requests
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urljoin
import time

REBRICKABLE_BASE_URL = 'https://rebrickable.com'
TOP_SETS_URL = 'https://rebrickable.com/media/uploads/reports/top_sets.html'

def scrape_sets_from_table(soup, is_alltime_page=False):
    """Extract sets from a table on the page. Returns list of set dicts.
    
    Args:
        soup: BeautifulSoup object of the page
        is_alltime_page: If True, use local_rank as global ranking when Ranking is missing
    """
    sets_data = []
    
    # Find all tables
    tables = soup.find_all('table')
    
    for table in tables:
        rows = table.find_all('tr')
        
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) == 0:
                continue
            
            # Get the first cell which contains the set information
            first_cell = cells[0]
            cell_text = first_cell.get_text()
            
            # Look for set number link (format: 12345-1)
            set_link_elem = first_cell.find('a', href=re.compile(r'/sets/\d+-\d+'))
            if not set_link_elem:
                continue
            
            set_num = set_link_elem.get_text(strip=True)
            set_link = urljoin(REBRICKABLE_BASE_URL, set_link_elem['href'])
            
            # Extract set name (text after set number, before "Total:")
            # Format: "RANK - SETNUM Set Name\nTotal: ..."
            text_after_setnum = cell_text.split(set_num, 1)[1] if set_num in cell_text else ''
            # Remove rank prefix if present
            text_after_setnum = re.sub(r'^\s*\d+\s*-\s*', '', text_after_setnum)
            # Extract name (everything before "Total:")
            name_match = re.match(r'^([^\n]+?)(?:\s*\n\s*Total:|\s*Total:)', text_after_setnum, re.DOTALL)
            if name_match:
                set_name = name_match.group(1).strip()
            else:
                # Fallback: take first line after set number
                lines = text_after_setnum.split('\n')
                set_name = lines[0].strip() if lines else ''
            
            # Look for "Total: XXXX sets" pattern
            total_match = re.search(r'Total:\s*(\d+)', cell_text, re.IGNORECASE)
            total_count = int(total_match.group(1)) if total_match else None
            
            # Look for "Year: XXXX" pattern
            year_match = re.search(r'Year:\s*(\d{4})', cell_text, re.IGNORECASE)
            if not year_match:
                # Try pattern like "- 2021" at the end
                year_match = re.search(r'-\s*(\d{4})\s*$', cell_text)
            year = int(year_match.group(1)) if year_match else None
            
            # Look for "Theme: [ThemeName]" pattern - get the link text
            theme_link = first_cell.find('a', href=re.compile(r'top_theme='))
            theme = theme_link.get_text(strip=True) if theme_link else None
            if not theme:
                # Try "Theme: ThemeName" pattern
                theme_match = re.search(r'Theme:\s*\[?([^\]]+)\]?', cell_text, re.IGNORECASE)
                if theme_match:
                    theme = theme_match.group(1).strip()
            
            # Look for "Ranking # X in total list" pattern
            ranking_match = re.search(r'Ranking\s*#\s*(\d+)', cell_text, re.IGNORECASE)
            ranking = int(ranking_match.group(1)) if ranking_match else None
            
            # Extract rank (local rank on page, like "1 -" at start)
            rank_match = re.match(r'^(\d+)\s*-\s*', cell_text)
            local_rank = int(rank_match.group(1)) if rank_match else None
            
            # Only use local_rank as global ranking on the all-time page
            # On year/theme pages, local_rank is just the rank within that category, not global
            if ranking is None and local_rank is not None and is_alltime_page:
                ranking = local_rank
            
            # Only add if we have a set number
            if set_num:
                set_data = {
                    'set_num': set_num,
                    'name': set_name,
                    'Count': total_count,
                    'Year': year,
                    'Theme': theme,
                    'Ranking': ranking,
                    'local_rank': local_rank,  # For debugging
                    'set_url': set_link,
                }
                sets_data.append(set_data)
    
    return sets_data

def scrape_page(url, is_alltime_page=False):
    """Scrape a single page and return list of sets.
    
    Args:
        url: URL to scrape
        is_alltime_page: If True, use local_rank as global ranking when Ranking is missing
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'lxml')
        return scrape_sets_from_table(soup, is_alltime_page=is_alltime_page)
    except Exception as e:
        print(f"  ⚠ Error scraping {url}: {e}")
        return []

def main():
    """Main scraping function."""
    print("=" * 60)
    print("Rebrickable Top Sets Scraper")
    print("=" * 60)
    
    # Fetch main page
    print(f"Fetching main page: {TOP_SETS_URL}")
    response = requests.get(TOP_SETS_URL, timeout=10)
    response.raise_for_status()
    soup = BeautifulSoup(response.content, 'lxml')
    
    # Dictionary to store all sets, keyed by set_num
    all_sets = {}
    
    # Extract all-time top sets from main page
    print("\nExtracting all-time top sets from main page...")
    alltime_section = soup.find('h1', {'id': 'alltime'})
    if alltime_section:
        # Pass is_alltime_page=True so local_rank is used as global ranking
        all_time_sets = scrape_sets_from_table(soup, is_alltime_page=True)
        print(f"Found {len(all_time_sets)} all-time top sets")
        for set_data in all_time_sets:
            set_num = set_data['set_num']
            # Keep the entry with highest Count if duplicate
            if set_num not in all_sets or (set_data.get('Count') or 0) > (all_sets[set_num].get('Count') or 0):
                all_sets[set_num] = set_data
    
    # Extract year links
    print("\nExtracting year links...")
    year_section = soup.find('h1', {'id': 'byyear'})
    year_urls = []
    
    if year_section:
        year_list = year_section.find_next('ul')
        if year_list:
            year_links = year_list.find_all('a', href=re.compile(r'top/year_\d+\.html'))
            for link in year_links:
                relative_url = link['href']
                url = urljoin(TOP_SETS_URL, relative_url)
                year_urls.append(url)
    
    print(f"Found {len(year_urls)} year pages")
    
    # Scrape all year pages
    print("\n" + "=" * 60)
    print("Scraping year pages...")
    print("=" * 60)
    
    for i, url in enumerate(sorted(year_urls), 1):
        year_match = re.search(r'year_(\d+)\.html', url)
        year = year_match.group(1) if year_match else 'unknown'
        print(f"[{i}/{len(year_urls)}] Scraping year {year}...")
        
        sets = scrape_page(url)
        print(f"  Found {len(sets)} sets")
        
        for set_data in sets:
            set_num = set_data['set_num']
            # Keep the entry with highest Count if duplicate
            if set_num not in all_sets or (set_data.get('Count') or 0) > (all_sets[set_num].get('Count') or 0):
                all_sets[set_num] = set_data
        
        # Rate limiting
        time.sleep(0.5)
    
    # Extract theme links
    print("\nExtracting theme links...")
    theme_section = soup.find('h1', {'id': 'bytheme'})
    theme_urls = []
    
    if theme_section:
        theme_list = theme_section.find_next('ul')
        if theme_list:
            theme_links = theme_list.find_all('a', href=re.compile(r'top/theme_.+\.html'))
            for link in theme_links:
                relative_url = link['href']
                url = urljoin(TOP_SETS_URL, relative_url)
                theme_urls.append(url)
    
    print(f"Found {len(theme_urls)} theme pages")
    
    # Scrape all theme pages
    print("\n" + "=" * 60)
    print("Scraping theme pages...")
    print("=" * 60)
    
    for i, url in enumerate(sorted(theme_urls), 1):
        theme_match = re.search(r'theme_([^.]+)\.html', url)
        theme = theme_match.group(1) if theme_match else 'unknown'
        print(f"[{i}/{len(theme_urls)}] Scraping theme: {theme}...")
        
        sets = scrape_page(url)
        print(f"  Found {len(sets)} sets")
        
        for set_data in sets:
            set_num = set_data['set_num']
            # Keep the entry with highest Count if duplicate
            if set_num not in all_sets or (set_data.get('Count') or 0) > (all_sets[set_num].get('Count') or 0):
                all_sets[set_num] = set_data
        
        # Rate limiting
        time.sleep(0.5)
    
    # Clean up the data - remove helper fields and ensure proper format
    cleaned_sets = {}
    for set_num, set_data in all_sets.items():
        cleaned_sets[set_num] = {
            'name': set_data.get('name', ''),
            'Count': set_data.get('Count'),
            'Year': set_data.get('Year'),
            'Theme': set_data.get('Theme', ''),
            'Ranking': set_data.get('Ranking'),
        }
        # Remove None values for cleaner JSON
        cleaned_sets[set_num] = {k: v for k, v in cleaned_sets[set_num].items() if v is not None}
    
    # Save results
    output_dir = Path(__file__).parent.parent / 'public' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / 'top_sets_complete.json'
    
    print("\n" + "=" * 60)
    print(f"Saving results to {output_file}")
    print("=" * 60)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cleaned_sets, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total unique sets: {len(cleaned_sets)}")
    print(f"Year pages scraped: {len(year_urls)}")
    print(f"Theme pages scraped: {len(theme_urls)}")
    print(f"\n✅ Complete! Data saved to {output_file}")

if __name__ == '__main__':
    main()
