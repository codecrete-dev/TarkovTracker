import type { API_PERMISSIONS, GameMode } from '@/utils/constants';
export type TokenPermission = keyof typeof API_PERMISSIONS;
export interface TokenRow {
  id: string;
  note: string | null;
  permissions: TokenPermission[];
  gameMode: GameMode;
  createdAt: string;
  lastUsedAt: string | null;
  usageCount: number | null;
  isActive: boolean;
}
export interface RawTokenRow {
  token_id: string;
  note: string | null;
  permissions: TokenPermission[];
  game_mode: GameMode;
  created_at: string;
  last_used_at: string | null;
  usage_count: number | null;
  is_active: boolean | null;
}
export interface UpdateProgressPayload {
  level?: number;
  faction?: string;
  taskCompletions?: Record<string, boolean>;
  taskObjectives?: Record<string, boolean>;
  hideoutModules?: Record<string, number>;
  hideoutParts?: Record<string, number>;
}
