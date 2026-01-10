import type { NeededItemHideoutModule, NeededItemTaskObjective, TarkovItem } from '@/types/tarkov';
/**
 * Type guard to check if a needed item is a task objective (has markerItem property).
 */
function isNeededItemTaskObjective(
  need: NeededItemTaskObjective | NeededItemHideoutModule
): need is NeededItemTaskObjective {
  return need.needType === 'taskObjective';
}
/**
 * Extracts the item ID from a needed item (task objective or hideout module).
 * Handles both regular items and marker items for task objectives.
 * Uses nullish coalescing to only fallback for null/undefined.
 */
export const getNeededItemId = (
  need: NeededItemTaskObjective | NeededItemHideoutModule
): string | undefined => {
  return need.item?.id ?? (isNeededItemTaskObjective(need) ? need.markerItem?.id : undefined);
};
/**
 * Extracts the item data object from a needed item.
 * Returns either the item or markerItem for task objectives.
 * Uses nullish coalescing to only fallback for null/undefined.
 */
export const getNeededItemData = (
  need: NeededItemTaskObjective | NeededItemHideoutModule
): TarkovItem | undefined => {
  return need.item ?? (isNeededItemTaskObjective(need) ? need.markerItem : undefined);
};
const isSpecialEquipmentText = (value: string): boolean => {
  const lower = value.toLowerCase();
  return lower.includes('special') && lower.includes('equipment');
};
/**
 * Returns `true` when a need is a non-FIR "special equipment" task objective that should be hidden.
 *
 * Marker items are treated as special equipment because they represent objective equipment (e.g. markers,
 * cameras) that is commonly non-FIR and can add a lot of noise to the Needed Items list.
 */
export const isNonFirSpecialEquipment = (need: NeededItemTaskObjective): boolean => {
  if (need.foundInRaid === true) return false;
  if (need.markerItem?.id) return true;
  const itemData = need.item;
  const categoryName = itemData?.category?.name ?? '';
  if (categoryName && isSpecialEquipmentText(categoryName)) {
    return true;
  }
  return itemData?.types?.some((type) => isSpecialEquipmentText(type)) ?? false;
};
