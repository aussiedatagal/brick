export interface SetSearchResult {
  set_num: string;
  name: string;
  year?: number;
  num_parts?: number;
  theme?: string;
}

let setsCache: SetSearchResult[] | null = null;

async function loadSetsList(): Promise<SetSearchResult[]> {
  if (setsCache) {
    return setsCache;
  }

  try {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Try to load all_sets.json first (all sets with inventories), fallback to top_sets_complete.json
    let response = await fetch(`${baseUrl}data/all_sets.json`, { signal: controller.signal });
    
    if (!response.ok) {
      // Fallback to top_sets_complete.json
      clearTimeout(timeoutId);
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
      response = await fetch(`${baseUrl}data/top_sets_complete.json`, { signal: controller2.signal });
      clearTimeout(timeoutId2);
    } else {
      clearTimeout(timeoutId);
    }
    
    if (!response.ok) {
      console.error(`Failed to load sets list: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    // Handle multiple formats:
    // 1. Compact array format: [{s: set_num, n: name, y?: year, p?: num_parts, t?: theme}, ...]
    // 2. Full array format: [{set_num, name, year?, num_parts?, theme?}, ...]
    // 3. Object format: {set_num: {name, Year, ...}, ...}
    let sets: SetSearchResult[];
    if (Array.isArray(data)) {
      // Check if it's compact format (has 's' and 'n' keys) or full format
      if (data.length > 0 && 's' in data[0] && 'n' in data[0]) {
        // Compact format - expand to full format
        sets = data.map((item: any) => ({
          set_num: item.s,
          name: item.n,
          year: item.y,
          num_parts: item.p,
          theme: item.t,
        }));
      } else {
        // Full array format
        sets = data;
      }
    } else {
      // Convert object format (top_sets_complete.json) to array
      sets = Object.entries(data).map(([set_num, setData]: [string, any]) => ({
        set_num,
        name: setData.name || '',
        year: setData.Year || setData.year || undefined,
        num_parts: setData.num_parts || undefined,
        theme: setData.Theme || setData.theme || undefined,
      }));
    }
    
    setsCache = sets;
    return sets;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Request to load sets list timed out');
    } else {
      console.error('Error loading sets list:', error);
    }
    return [];
  }
}

// Remove year from set name for display
function removeYearFromName(name: string): string {
  // Remove patterns like " (2023)", " - 2023", " 2023", etc.
  return name.replace(/\s*[-\u2013\u2014]\s*\d{4}\s*$/, '') // " - 2023"
    .replace(/\s*\(\d{4}\)\s*$/, '') // " (2023)"
    .replace(/\s+\d{4}\s*$/, '') // " 2023"
    .trim();
}

export async function searchSets(query: string): Promise<SetSearchResult[]> {
  if (query.length < 2) {
    return [];
  }

  try {
    const allSets = await loadSetsList();
    const queryLower = query.toLowerCase().trim();
    
    // Filter sets that match the query (check both original and name without year)
    const matches = allSets.filter((set) => {
      const nameLower = set.name.toLowerCase();
      const nameWithoutYear = removeYearFromName(set.name).toLowerCase();
      return nameLower.includes(queryLower) || nameWithoutYear.includes(queryLower);
    });
    
    // Group by name without year to collapse year variations
    const grouped = new Map<string, SetSearchResult>();
    
    for (const set of matches) {
      const nameWithoutYear = removeYearFromName(set.name);
      const key = nameWithoutYear.toLowerCase();
      
      if (!grouped.has(key)) {
        // Use the set with the newest year, or first one if no year
        grouped.set(key, { ...set, name: nameWithoutYear });
      } else {
        const existing = grouped.get(key)!;
        const existingYear = existing.year || 0;
        const currentYear = set.year || 0;
        
        // Keep the one with the newest year
        if (currentYear > existingYear) {
          grouped.set(key, { ...set, name: nameWithoutYear });
        }
      }
    }
    
    // Convert back to array and score
    const uniqueMatches = Array.from(grouped.values());
    
    // Calculate relevance score for each match
    const scoredMatches = uniqueMatches.map((set) => {
      const nameLower = set.name.toLowerCase();
      let score = 0;
      
      // Exact match gets highest score
      if (nameLower === queryLower) {
        score = 1000;
      }
      // Starts with query gets high score
      else if (nameLower.startsWith(queryLower)) {
        score = 500;
      }
      // Word boundary match (query at start of a word, e.g., "AT" in "AT-ST" or "AT Walker")
      else if (new RegExp(`\\b${queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(nameLower)) {
        score = 300;
      }
      // Contains query gets lower score
      else if (nameLower.includes(queryLower)) {
        score = 100;
      }
      
      // Boost score by year (newer sets get slight boost)
      const year = set.year || 0;
      score += Math.min(year - 1950, 100) * 0.1; // Small boost for newer sets
      
      return { set, score };
    });
    
    // Sort by score (highest first), then by year (newest first) as tiebreaker
    scoredMatches.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.5) {
        return b.score - a.score;
      }
      // If scores are very close, sort by year (newest first)
      const aYear = a.set.year || 0;
      const bYear = b.set.year || 0;
      return bYear - aYear;
    });
    
    // Return top 10 results
    return scoredMatches.slice(0, 10).map(item => item.set);
  } catch (error) {
    console.error('Error searching sets:', error);
    return [];
  }
}

export interface SetPart {
  part_num: string;
  color_id: number;
}

export interface GuessFeedback {
  set_name: string;
  set_num: string;
  sharedParts: number;
  totalTargetParts: number;
  totalGuessParts: number;
  matchPercentage: number;
  isCorrect: boolean;
  sameTheme?: boolean;
  sameYear?: boolean;
  colorOverlapPercentage?: number;
  nameSimilarityPercentage?: number;
  partCountDifference?: number;
  year?: number;
  theme?: string;
  num_parts?: number;
  targetYear?: number;
  isLoadingExtraInfo?: boolean;
}

export async function getSetParts(setNum: string): Promise<SetPart[]> {
  try {
    const REBRICKABLE_BASE_URL = 'https://rebrickable.com/api/v3/lego';
    const url = `${REBRICKABLE_BASE_URL}/sets/${setNum}/parts/`;
    const params = new URLSearchParams({
      page_size: '500',
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.results || []).map((part: any) => ({
      part_num: part.part?.part_num || '',
      color_id: part.color?.id || 0,
    }));
  } catch (error) {
    console.error('Error fetching set parts:', error);
    return [];
  }
}

// Calculate color overlap percentage between two sets
// Returns the percentage of color instances in target that also appear in guess
export function calculateColorOverlap(targetParts: SetPart[], guessParts: SetPart[]): number {
  if (targetParts.length === 0 || guessParts.length === 0) {
    return 0;
  }

  // Count color instances in each set
  const targetColors = new Map<number, number>();
  const guessColors = new Map<number, number>();

  for (const part of targetParts) {
    targetColors.set(part.color_id, (targetColors.get(part.color_id) || 0) + 1);
  }

  for (const part of guessParts) {
    guessColors.set(part.color_id, (guessColors.get(part.color_id) || 0) + 1);
  }

  // Calculate overlap: for each color in target, count how many instances
  // are also present in guess (up to the count in target)
  let sharedColorInstances = 0;
  const totalColorInstances = targetParts.length;

  for (const [colorId, targetCount] of targetColors.entries()) {
    const guessCount = guessColors.get(colorId) || 0;
    // Count how many instances of this color overlap
    sharedColorInstances += Math.min(targetCount, guessCount);
  }

  // Calculate percentage: what % of target's color instances are in guess
  return totalColorInstances > 0
    ? Math.round((sharedColorInstances / totalColorInstances) * 100)
    : 0;
}

// Calculate name similarity percentage
export function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();

  if (s1 === s2) {
    return 100;
  }

  if (s1.length === 0 || s2.length === 0) {
    return 0;
  }

  // Use a simple approach: longest common subsequence ratio
  // This is simpler and faster than full Levenshtein for our use case
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  // Count matching characters in order
  let matches = 0;
  let shorterIndex = 0;

  for (let i = 0; i < longer.length && shorterIndex < shorter.length; i++) {
    if (longer[i] === shorter[shorterIndex]) {
      matches++;
      shorterIndex++;
    }
  }

  // Calculate similarity as a percentage
  const similarity = (matches / longer.length) * 100;
  return Math.round(similarity);
}

export function compareSets(
  targetParts: SetPart[],
  guessParts: SetPart[]
): GuessFeedback | null {
  if (guessParts.length === 0) {
    return null;
  }

  // Create sets of part+color combinations for efficient lookup
  const targetSet = new Set(
    targetParts.map((p) => `${p.part_num}:${p.color_id}`)
  );
  const guessSet = new Set(
    guessParts.map((p) => `${p.part_num}:${p.color_id}`)
  );

  // Count shared parts
  let sharedCount = 0;
  for (const part of targetSet) {
    if (guessSet.has(part)) {
      sharedCount++;
    }
  }

  const matchPercentage = targetParts.length > 0
    ? Math.round((sharedCount / targetParts.length) * 100)
    : 0;

  const colorOverlap = calculateColorOverlap(targetParts, guessParts);

  return {
    set_name: '',
    set_num: '',
    sharedParts: sharedCount,
    totalTargetParts: targetParts.length,
    totalGuessParts: guessParts.length,
    matchPercentage,
    isCorrect: false,
    colorOverlapPercentage: colorOverlap,
  };
}

