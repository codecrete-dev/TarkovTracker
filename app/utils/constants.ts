export const GAME_EDITIONS = [
  {
    title: "Standard Edition",
    value: 1,
    traderRep: 0.0,
    defaultStashLevel: 1,
  },
  {
    title: "Left Behind Edition",
    value: 2,
    traderRep: 0.0,
    defaultStashLevel: 2,
  },
  {
    title: "Prepare for Escape Edition",
    value: 3,
    traderRep: 0.2,
    defaultStashLevel: 3,
  },
  {
    title: "Edge of Darkness (Limited Edition)",
    value: 4,
    traderRep: 0.2,
    defaultStashLevel: 4,
  },
  {
    title: "Unheard Edition",
    value: 5,
    traderRep: 0.2,
    defaultStashLevel: 5,
  },
  {
    title: "Unheard + Edge Of Darkness (EOD) Edition",
    value: 6,
    traderRep: 0.2,
    defaultStashLevel: 5,
  },
];

export const STASH_STATION_ID = "5d484fc0654e76006657e0ab";
export const CULTIST_CIRCLE_STATION_ID = "667298e75ea6b4493c08f266";

export const PMC_FACTIONS = [
  { title: "USEC", value: "USEC" },
  { title: "BEAR", value: "BEAR" },
];

// Map internal game modes to API game modes
// Internal: "pvp" | "pve"
// API: "regular" | "pve"
export const GAME_MODES = {
  PVP: "pvp",
  PVE: "pve",
} as const;
export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];
export const API_GAME_MODES = {
  [GAME_MODES.PVP]: "regular",
  [GAME_MODES.PVE]: "pve",
} as const;
export const GAME_MODE_OPTIONS = [
  {
    label: "PvP",
    value: GAME_MODES.PVP,
    icon: "mdi-sword-cross",
    description: "Player vs Player (Standard)",
  },
  {
    label: "PvE",
    value: GAME_MODES.PVE,
    icon: "mdi-account-group",
    description: "Player vs Environment (Co-op)",
  },
];

export function getEditionName(edition: number | undefined): string {
  if (!edition) return "N/A";
  const found = GAME_EDITIONS.find((e) => e.value === edition);
  return found ? found.title : `Edition ${edition}`;
}

// Scav Karma (Fence Rep) tasks excluded from tracking
// These "Compensation for Damage" tasks require Scav Karma validation which isn't yet implemented
// They would always show as incomplete without proper Fence reputation tracking
export const EXCLUDED_SCAV_KARMA_TASKS = [
  "61e6e5e0f5b9633f6719ed95", // Compensation for Damage - Trust (Scav Karma -1 Quest)
  "61e6e60223374d168a4576a6", // Compensation for Damage - Wager (Scav Karma -1 Quest)
  "61e6e621bfeab00251576265", // Compensation for Damage - Collection (Scav Karma -1 Quest)
  "61e6e615eea2935bc018a2c5", // Compensation for Damage - Barkeep (Scav Karma -1 Quest)
  "61e6e60c5ca3b3783662be27", // Compensation for Damage - Wergild (Scav Karma -3 Quest)
];

// Currency item IDs to exclude from quest item tracking
// These represent in-game currencies that are always obtainable and don't need to be tracked
export const CURRENCY_ITEM_IDS = [
  "5696686a4bdc2da3298b456a", // Dollars (USD)
  "5449016a4bdc2d6f028b456f", // Roubles (RUB)
  "569668774bdc2da2298b4568", // Euros (EUR)
] as const;
