/**
 * NES Graphics, Palettes, and iNES/NES 2.0 Header Data Types
 */

export type ToolType =
  | 'pencil'
  | 'brush'
  | 'line'
  | 'rect'
  | 'filled_rect'
  | 'circle'
  | 'fill'
  | 'eyedropper'
  | 'eraser';

export type CanvasMode = 'tile' | 'meta_2x2' | 'meta_4x4' | 'nametable';

export interface NESPaletteConfig {
  universalBg: number; // Index in NES master palette (0x00 - 0x3F)
  bg: [
    [number, number, number], // subpalette 0 (indices 1, 2, 3)
    [number, number, number], // subpalette 1
    [number, number, number], // subpalette 2
    [number, number, number], // subpalette 3
  ];
  spr: [
    [number, number, number], // sprite subpalette 0
    [number, number, number], // sprite subpalette 1
    [number, number, number], // sprite subpalette 2
    [number, number, number], // sprite subpalette 3
  ];
}

export type MirroringType = 'horizontal' | 'vertical' | 'four_screen';

export interface INESHeaderConfig {
  // Format version
  isNes2: boolean;

  // PRG and CHR sizes
  prgRomSize16K: number; // 1 = 16KB (NROM-128), 2 = 32KB (NROM-256), etc.
  chrRomSize8K: number;  // 1 = 8KB, 0 = CHR-RAM
  
  // Mapper configuration
  mapperNumber: number; // e.g. 0 = NROM, 1 = MMC1, 2 = UNROM, 3 = CNROM, 4 = MMC3, 7 = AxROM
  submapper: number;    // NES 2.0 submapper (0-15)

  // Flags 6 & 7
  mirroring: MirroringType;
  hasBattery: boolean;
  hasTrainer: boolean;
  vsUnisystem: boolean;
  playchoice10: boolean;

  // Flags 8-15 (iNES / NES 2.0)
  prgRamSize8K: number;
  prgNvramSize8K: number;
  chrRamSize8K: number;
  chrNvramSize8K: number;
  tvSystem: 'ntsc' | 'pal' | 'dual';
}

export interface HeaderByteAnnotation {
  offset: number;
  byteValue: number;
  hex: string;
  name: string;
  description: string;
  bitsMeaning?: { bit: string; meaning: string; active: boolean }[];
}

export interface PresetMapper {
  id: number;
  name: string;
  boardName: string;
  description: string;
  defaultPrg16K: number;
  defaultChr8K: number;
  defaultMirroring: MirroringType;
  notableGames: string[];
}
