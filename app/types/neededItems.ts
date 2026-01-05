export type FilterType = 'all' | 'tasks' | 'hideout' | 'completed';
export type ViewMode = 'list' | 'grid';
export type FirFilter = 'all' | 'fir' | 'non-fir';

export interface FilterTab {
  label: string;
  value: FilterType;
  icon: string;
  count: number;
  badgeColor?: string;
}
