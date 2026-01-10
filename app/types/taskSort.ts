export const TASK_SORT_MODES = [
  'default',
  'impact',
  'alphabetical',
  'level',
  'trader',
  'teammates',
  'xp',
] as const;
export type TaskSortMode = (typeof TASK_SORT_MODES)[number];
export const TASK_SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type TaskSortDirection = (typeof TASK_SORT_DIRECTIONS)[number];
