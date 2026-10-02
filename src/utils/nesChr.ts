/**
 * NES CHR 2-bitplane Encoding & Tile Manipulation Utilities
 */

/**
 * Encodes an 8x8 tile (64 values, each 0..3) into 16 bytes of NES CHR format:
 * Bytes 0-7: Bitplane 0 (low bits of rows 0..7)
 * Bytes 8-15: Bitplane 1 (high bits of rows 0..7)
 */
export function encodeTileToChrBytes(pixels: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(16);

  for (let y = 0; y < 8; y++) {
    let p0 = 0;
    let p1 = 0;
    for (let x = 0; x < 8; x++) {
      const color = pixels[y * 8 + x] & 0x03;
      const bitWeight = 1 << (7 - x);
      if (color & 1) p0 |= bitWeight;
      if (color & 2) p1 |= bitWeight;
    }
    bytes[y] = p0;
    bytes[y + 8] = p1;
  }

  return bytes;
}

/**
 * Decodes 16 bytes of NES CHR data into an 8x8 tile (64 values, each 0..3)
 */
export function decodeChrBytesToTile(bytes: Uint8Array, offset: number = 0): Uint8Array {
  const pixels = new Uint8Array(64);

  for (let y = 0; y < 8; y++) {
    const p0 = bytes[offset + y];
    const p1 = bytes[offset + y + 8];
    for (let x = 0; x < 8; x++) {
      const bitWeight = 1 << (7 - x);
      const b0 = (p0 & bitWeight) ? 1 : 0;
      const b1 = (p1 & bitWeight) ? 2 : 0;
      pixels[y * 8 + x] = b0 | b1;
    }
  }

  return pixels;
}

/**
 * Encodes 512 tiles into an 8KB CHR ROM buffer (8192 bytes)
 */
export function encodePatternTablesToChrRom(tiles: Uint8Array[]): Uint8Array {
  const chrRom = new Uint8Array(8192); // 512 tiles * 16 bytes = 8192 bytes
  const count = Math.min(tiles.length, 512);

  for (let i = 0; i < count; i++) {
    const tileBytes = encodeTileToChrBytes(tiles[i]);
    chrRom.set(tileBytes, i * 16);
  }

  return chrRom;
}

/**
 * Decodes an 8KB CHR ROM into an array of 512 tiles
 */
export function decodeChrRomToTiles(chrRom: Uint8Array): Uint8Array[] {
  const numTiles = Math.floor(chrRom.length / 16);
  const tiles: Uint8Array[] = [];

  for (let i = 0; i < Math.max(numTiles, 512); i++) {
    if (i < numTiles) {
      tiles.push(decodeChrBytesToTile(chrRom, i * 16));
    } else {
      tiles.push(new Uint8Array(64));
    }
  }

  return tiles;
}

/**
 * Transformations for an 8x8 tile
 */
export function flipTileHorizontal(pixels: Uint8Array): Uint8Array {
  const res = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      res[y * 8 + (7 - x)] = pixels[y * 8 + x];
    }
  }
  return res;
}

export function flipTileVertical(pixels: Uint8Array): Uint8Array {
  const res = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      res[(7 - y) * 8 + x] = pixels[y * 8 + x];
    }
  }
  return res;
}

export function rotateTile90Clockwise(pixels: Uint8Array): Uint8Array {
  const res = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      res[x * 8 + (7 - y)] = pixels[y * 8 + x];
    }
  }
  return res;
}

export function shiftTile(pixels: Uint8Array, dx: number, dy: number): Uint8Array {
  const res = new Uint8Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const nx = (x + dx + 8) % 8;
      const ny = (y + dy + 8) % 8;
      res[ny * 8 + nx] = pixels[y * 8 + x];
    }
  }
  return res;
}

export function invertTileColors(pixels: Uint8Array): Uint8Array {
  const res = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    const val = pixels[i];
    if (val === 0) res[i] = 0; // keep transparent/background
    else res[i] = ((val - 1 + 1) % 3) + 1; // cycle 1->2->3->1
  }
  return res;
}

/**
 * Preset NES 8x8 tile sprites (indices 0..3)
 */
export const PRESET_TILES: { name: string; category: string; pixels: number[] }[] = [
  {
    name: 'Hero Facing Down',
    category: 'Characters',
    pixels: [
      0,0,1,1,1,1,0,0,
      0,1,2,2,2,2,1,0,
      0,1,2,3,3,2,1,0,
      0,1,2,2,2,2,1,0,
      0,0,1,1,1,1,0,0,
      0,1,3,1,1,3,1,0,
      0,1,1,1,1,1,1,0,
      0,1,0,0,0,0,1,0,
    ],
  },
  {
    name: 'Hero Running',
    category: 'Characters',
    pixels: [
      0,0,1,1,1,1,0,0,
      0,1,2,2,2,2,1,0,
      0,1,2,3,2,0,0,0,
      0,1,2,2,2,1,0,0,
      0,0,1,1,1,1,0,0,
      0,1,3,1,1,0,0,0,
      1,1,1,1,1,1,0,0,
      0,1,0,0,1,1,1,0,
    ],
  },
  {
    name: 'Power Mushroom',
    category: 'Items',
    pixels: [
      0,0,1,1,1,1,0,0,
      0,1,1,2,2,1,1,0,
      1,1,2,2,2,2,1,1,
      1,2,3,2,2,3,2,1,
      1,1,1,1,1,1,1,1,
      0,0,1,2,2,1,0,0,
      0,0,1,3,3,1,0,0,
      0,0,1,1,1,1,0,0,
    ],
  },
  {
    name: 'Question Block',
    category: 'Environment',
    pixels: [
      1,1,1,1,1,1,1,1,
      1,2,2,2,2,2,2,3,
      1,2,0,1,1,0,2,3,
      1,2,0,0,1,0,2,3,
      1,2,0,1,1,0,2,3,
      1,2,0,0,0,0,2,3,
      1,2,0,1,1,0,2,3,
      1,3,3,3,3,3,3,3,
    ],
  },
  {
    name: 'Brick Block',
    category: 'Environment',
    pixels: [
      1,1,1,1,1,1,1,1,
      2,2,3,2,2,2,3,2,
      2,2,3,2,2,2,3,2,
      1,1,1,1,1,1,1,1,
      3,2,2,2,3,2,2,2,
      3,2,2,2,3,2,2,2,
      1,1,1,1,1,1,1,1,
      2,2,3,2,2,2,3,2,
    ],
  },
  {
    name: 'Gold Coin',
    category: 'Items',
    pixels: [
      0,0,1,1,1,1,0,0,
      0,1,2,2,2,2,1,0,
      1,2,2,1,1,2,2,1,
      1,2,1,2,2,1,2,1,
      1,2,1,2,2,1,2,1,
      1,2,2,1,1,2,2,1,
      0,1,2,2,2,2,1,0,
      0,0,1,1,1,1,0,0,
    ],
  },
  {
    name: 'Retro Skull',
    category: 'Characters',
    pixels: [
      0,0,1,1,1,1,0,0,
      0,1,2,2,2,2,1,0,
      1,2,0,2,2,0,2,1,
      1,2,0,2,2,0,2,1,
      1,2,2,2,2,2,2,1,
      0,1,2,1,1,2,1,0,
      0,1,2,0,0,2,1,0,
      0,0,1,1,1,1,0,0,
    ],
  },
  {
    name: 'Spaceship Defender',
    category: 'Characters',
    pixels: [
      0,0,0,1,1,0,0,0,
      0,0,1,2,2,1,0,0,
      0,0,1,3,3,1,0,0,
      0,1,1,2,2,1,1,0,
      1,2,1,2,2,1,2,1,
      1,3,1,1,1,1,3,1,
      1,1,0,1,1,0,1,1,
      0,0,2,0,0,2,0,0,
    ],
  },
  {
    name: 'Heart Container',
    category: 'Items',
    pixels: [
      0,1,1,0,0,1,1,0,
      1,2,2,1,1,2,2,1,
      1,2,3,2,2,2,2,1,
      1,2,2,2,2,2,2,1,
      0,1,2,2,2,2,1,0,
      0,0,1,2,2,1,0,0,
      0,0,0,1,1,0,0,0,
      0,0,0,0,0,0,0,0,
    ],
  },
  {
    name: 'NES Font A',
    category: 'Typography',
    pixels: [
      0,0,1,1,1,1,0,0,
      0,1,1,0,0,1,1,0,
      1,1,0,0,0,0,1,1,
      1,1,1,1,1,1,1,1,
      1,1,0,0,0,0,1,1,
      1,1,0,0,0,0,1,1,
      1,1,0,0,0,0,1,1,
      0,0,0,0,0,0,0,0,
    ],
  },
];

/**
 * Initializes a full 512-tile array with default patterns and empty tiles
 */
export function createDefaultTileSet(): Uint8Array[] {
  const tiles: Uint8Array[] = [];

  for (let i = 0; i < 512; i++) {
    const tile = new Uint8Array(64);
    if (i < PRESET_TILES.length) {
      tile.set(PRESET_TILES[i].pixels);
    }
    tiles.push(tile);
  }

  return tiles;
}
