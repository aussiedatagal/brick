export interface PuzzlePart {
  part_num: string;
  part_name: string;
  color_name: string;
  color_rgb: string;
  image: string;
}

export interface PartReference {
  part_num: string;
  color_id: number;
}

export interface SetComparison {
  shared_parts: number;
  total_target_parts: number;
  total_guess_parts: number;
  match_percentage: number;
}

export interface PuzzleData {
  date: string;
  set_num: string;
  set_name: string;
  set_year?: number;
  set_num_parts?: number;
  set_theme?: string;
  set_image_url?: string;  // URL to image of the completed set
  parts: PuzzlePart[];
  all_parts?: PartReference[];  // All parts in the set for comparison
  set_comparisons?: Record<string, SetComparison>;  // Pre-calculated comparisons by set_num
}

