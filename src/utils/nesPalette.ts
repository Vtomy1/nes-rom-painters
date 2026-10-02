/**
 * NES 64-Color 2C02 Master Palette and Subpalette Utilities
 */

import { NESPaletteConfig } from '../types/nes';

// Standard 2C02 PPU palette (64 colors: 0x00 to 0x3F)
export const NES_MASTER_PALETTE = [
  '#666666', '#002A88', '#1412A7', '#3B00A4', '#5C007E', '#6E0040', '#6C0600', '#561D00',
  '#333500', '#0B4800', '#005200', '#004F08', '#00404D', '#000000', '#000000', '#000000',
  '#ADADAD', '#155FD9', '#4240FF', '#7527FE', '#A01ACC', '#B71E7B', '#B53120', '#994E00',
  '#6B6D00', '#388700', '#0C9300', '#008F32', '#007C8D', '#000000', '#000000', '#000000',
  '#FFFEFF', '#64B0FF', '#9290FF', '#C676FF', '#F36AFF', '#FE6ECC', '#FE8170', '#EA9E22',
  '#BCBE00', '#88D800', '#5CE430', '#45E082', '#48CDDE', '#4F4F4F', '#000000', '#000000',
  '#FFFEFF', '#C0DFFF', '#D3D2FF', '#E8C8FF', '#FBC2FF', '#FEC4EA', '#FECCC5', '#F7D8A5',
  '#E4E594', '#CFEF96', '#BDF4AB', '#B3F3CC', '#B5EBF2', '#B8B8B8', '#000000', '#000000',
];

export const PALETTE_NAMES_64 = [
  '$00 Gray', '$01 Dark Blue', '$02 Deep Blue', '$03 Dark Purple', '$04 Dark Magenta', '$05 Wine', '$06 Brick', '$07 Brown',
  '$08 Olive', '$09 Forest', '$0A Dark Green', '$0B Pine', '$0C Dark Cyan', '$0D Black 1', '$0E Black 2', '$0F Black 3',
  '$10 Light Gray', '$11 Med Blue', '$12 Blue-Violet', '$13 Purple', '$14 Magenta', '$15 Cerise', '$16 Red-Orange', '$17 Amber',
  '$18 Mustard', '$19 Lime Green', '$1A Grass', '$1B Mint', '$1C Teal', '$1D Black 4', '$1E Black 5', '$1F Black 6',
  '$20 White', '$21 Sky Blue', '$22 Periwinkle', '$23 Lavender', '$24 Pink', '$25 Carnation', '$26 Peach', '$27 Marigold',
  '$28 Chartreuse', '$29 Bright Lime', '$2A Spring', '$2B Seafoam', '$2C Aqua', '$2D Mid Gray', '$2E Black 7', '$2F Black 8',
  '$30 Crisp White', '$31 Pale Blue', '$32 Pale Lavender', '$33 Pastel Violet', '$34 Pastel Pink', '$35 Soft Rose', '$36 Coral Tint', '$37 Sand',
  '$38 Pale Yellow', '$39 Pale Mint', '$3A Soft Green', '$3B Sea Mist', '$3C Light Aqua', '$3D Silver Gray', '$3E Black 9', '$3F Black 10',
];

export const DEFAULT_NES_PALETTE: NESPaletteConfig = {
  universalBg: 0x0f, // Pure black
  bg: [
    [0x30, 0x16, 0x27], // 0: White, Red-Orange, Marigold (Classic Mario style)
    [0x30, 0x12, 0x21], // 1: White, Blue, Sky Blue
    [0x30, 0x0a, 0x2a], // 2: White, Dark Green, Bright Lime
    [0x30, 0x17, 0x28], // 3: White, Amber, Chartreuse
  ],
  spr: [
    [0x16, 0x27, 0x17], // 0: Red, Peach, Amber (Hero)
    [0x0f, 0x12, 0x21], // 1: Black, Blue, Light Blue
    [0x0f, 0x0a, 0x2a], // 2: Black, Green, Lime
    [0x0f, 0x14, 0x24], // 3: Black, Magenta, Pink
  ],
};

export const PRESET_THEMES: { name: string; palette: NESPaletteConfig }[] = [
  {
    name: 'Overworld Adventure',
    palette: {
      universalBg: 0x21, // Sky blue
      bg: [
        [0x30, 0x17, 0x07], // White, Orange-Brown, Dark Brown (Bricks & Blocks)
        [0x30, 0x1a, 0x09], // White, Bright Green, Deep Forest (Bushes & Pipes)
        [0x30, 0x28, 0x18], // White, Yellow, Mustard (Coins & Clouds)
        [0x30, 0x16, 0x06], // White, Red, Crimson (Castle)
      ],
      spr: [
        [0x16, 0x27, 0x17], // Red, Peach, Brown (Player 1)
        [0x1a, 0x27, 0x09], // Green, Peach, Deep Green (Player 2)
        [0x28, 0x17, 0x0f], // Yellow, Orange, Black (Enemy 1)
        [0x30, 0x16, 0x0f], // White, Red, Black (Mushroom)
      ],
    },
  },
  {
    name: 'Gothic Dungeon',
    palette: {
      universalBg: 0x0f, // Deep black
      bg: [
        [0x10, 0x00, 0x20], // Med Gray, Dark Gray, White (Stone Walls)
        [0x16, 0x06, 0x27], // Red-Orange, Deep Brick, Orange (Torch / Fire)
        [0x12, 0x02, 0x30], // Blue-Violet, Dark Blue, Pale Lavender (Crypt)
        [0x19, 0x09, 0x29], // Moss, Dark Moss, Lime (Slime & Vines)
      ],
      spr: [
        [0x27, 0x17, 0x30], // Peach, Brown, White (Hero Belmont style)
        [0x30, 0x10, 0x00], // White, Gray, Dark Gray (Skeleton)
        [0x16, 0x05, 0x30], // Red, Wine, White (Vampire)
        [0x28, 0x18, 0x08], // Gold, Ochre, Dark Olive (Holy Relic)
      ],
    },
  },
  {
    name: 'Cyberpunk 8-Bit',
    palette: {
      universalBg: 0x0f, // Midnight black
      bg: [
        [0x21, 0x11, 0x01], // Sky Cyan, Electric Blue, Deep Navy
        [0x24, 0x14, 0x04], // Neon Pink, Magenta, Dark Magenta
        [0x2a, 0x1a, 0x0a], // Acid Lime, Matrix Green, Dark Forest
        [0x27, 0x17, 0x07], // Neon Orange, Rust, Copper
      ],
      spr: [
        [0x30, 0x21, 0x14], // White, Cyan, Magenta (Cyber Runner)
        [0x2a, 0x11, 0x30], // Lime, Blue, White (Drone)
        [0x24, 0x16, 0x30], // Pink, Red, White (Laser)
        [0x27, 0x28, 0x30], // Orange, Gold, White (Power Cell)
      ],
    },
  },
  {
    name: 'Metroid Caverns',
    palette: {
      universalBg: 0x0f,
      bg: [
        [0x23, 0x13, 0x03], // Alien Purple, Dark Violet, Void
        [0x2c, 0x1c, 0x0c], // Cyan, Deep Teal, Abyssal Blue
        [0x26, 0x16, 0x06], // Lava Peach, Volcanic Red, Basalt
        [0x29, 0x19, 0x09], // Spore Yellow, Acid Ochre, Swamp
      ],
      spr: [
        [0x27, 0x16, 0x2a], // Orange, Red, Lime (Power Suit)
        [0x2c, 0x12, 0x30], // Aqua, Blue, White (Varia Suit)
        [0x24, 0x16, 0x30], // Neon Pink, Red, White (Alien Larva)
        [0x28, 0x17, 0x30], // Gold, Amber, White (Energy Tank)
      ],
    },
  },
];

export function nesIndexToHex(index: number): string {
  const safeIndex = (index & 0x3f);
  return NES_MASTER_PALETTE[safeIndex] || '#000000';
}

/**
 * Returns the 4 hex colors corresponding to pixel color indices 0, 1, 2, 3
 * for a chosen subpalette (bg or spr, index 0..3).
 */
export function getSubpaletteHexColors(
  palette: NESPaletteConfig,
  type: 'bg' | 'spr',
  subpaletteIdx: number
): [string, string, string, string] {
  const sub = type === 'bg' ? palette.bg[subpaletteIdx] : palette.spr[subpaletteIdx];
  return [
    nesIndexToHex(palette.universalBg),
    nesIndexToHex(sub[0]),
    nesIndexToHex(sub[1]),
    nesIndexToHex(sub[2]),
  ];
}

/**
 * Parses hex color '#RRGGBB' to [r, g, b]
 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Finds the index (0x00 - 0x3F) of the closest NES master palette color to an [r, g, b]
 */
export function findNearestNesColor(r: number, g: number, b: number): number {
  let bestIdx = 0;
  let minDistance = Infinity;

  for (let i = 0; i < NES_MASTER_PALETTE.length; i++) {
    const [nr, ng, nb] = hexToRgb(NES_MASTER_PALETTE[i]);
    // Weighted Euclidean distance for human perception
    const dr = r - nr;
    const dg = g - ng;
    const db = b - nb;
    const dist = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
    if (dist < minDistance) {
      minDistance = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Finds which subpalette color index (0, 1, 2, or 3) matches closest to [r, g, b]
 */
export function findNearestSubpaletteIndex(
  r: number,
  g: number,
  b: number,
  subHexColors: [string, string, string, string],
  alpha: number = 255
): number {
  if (alpha < 64) {
    return 0; // Transparent / background
  }

  let bestIdx = 0;
  let minDistance = Infinity;

  for (let i = 0; i < 4; i++) {
    const [cr, cg, cb] = hexToRgb(subHexColors[i]);
    const dr = r - cr;
    const dg = g - cg;
    const db = b - cb;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDistance) {
      minDistance = dist;
      bestIdx = i;
    }
  }

  return bestIdx;
}
