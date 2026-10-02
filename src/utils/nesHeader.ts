/**
 * iNES 1.0 and NES 2.0 Header Encoder, Decoder, and Inspector
 */

import { INESHeaderConfig, HeaderByteAnnotation, PresetMapper } from '../types/nes';

export const CLASSIC_MAPPERS: PresetMapper[] = [
  {
    id: 0,
    name: 'NROM (Discrete Logic)',
    boardName: 'NROM-128 / NROM-256',
    description: 'The original baseline NES hardware. No bankswitching. Direct 16KB/32KB PRG and 8KB CHR.',
    defaultPrg16K: 2,
    defaultChr8K: 1,
    defaultMirroring: 'horizontal',
    notableGames: ['Super Mario Bros.', 'Donkey Kong', 'Duck Hunt', 'Pac-Man', 'Excitebike'],
  },
  {
    id: 1,
    name: 'MMC1 (Nintendo Custom ASIC)',
    boardName: 'SxROM (SNROM, SUROM, SAROM)',
    description: 'Serial shift-register mapper. 16KB PRG switching, 4KB CHR switching, programmable mirroring, battery backup.',
    defaultPrg16K: 8,
    defaultChr8K: 16,
    defaultMirroring: 'horizontal',
    notableGames: ['The Legend of Zelda', 'Metroid', 'Mega Man 2', 'Kid Icarus', 'Final Fantasy'],
  },
  {
    id: 2,
    name: 'UNROM / UOROM',
    boardName: 'UxROM',
    description: 'Simple 74HC161/74HC32 logic. Switchable 16KB PRG bank at $8000, fixed 16KB PRG bank at $C000. Uses CHR-RAM.',
    defaultPrg16K: 8,
    defaultChr8K: 0,
    defaultMirroring: 'vertical',
    notableGames: ['Contra', 'Castlevania', 'Mega Man', 'DuckTales', 'Metal Gear'],
  },
  {
    id: 3,
    name: 'CNROM',
    boardName: 'CNROM',
    description: 'Bankswitched CHR-ROM (up to 32KB) with fixed 16KB or 32KB PRG-ROM. Popular for early arcade conversions.',
    defaultPrg16K: 2,
    defaultChr8K: 4,
    defaultMirroring: 'vertical',
    notableGames: ['Dragon Warrior', 'Solomon\'s Key', 'Adventure Island', 'Gr縫ius'],
  },
  {
    id: 4,
    name: 'MMC3 (Advanced Memory Controller)',
    boardName: 'TxROM (TKROM, TSROM, TLROM)',
    description: 'Scanline IRQ counter, 8KB PRG switching, 1KB/2KB CHR switching, hardware split-screen scrolling.',
    defaultPrg16K: 16,
    defaultChr8K: 16,
    defaultMirroring: 'vertical',
    notableGames: ['Super Mario Bros. 3', 'Mega Man 3-6', 'Kirby\'s Adventure', 'Castlevania III'],
  },
  {
    id: 7,
    name: 'AxROM',
    boardName: 'AOROM, AMROM, ANROM',
    description: '32KB PRG bankswitching with single-screen mirroring switched via software.',
    defaultPrg16K: 8,
    defaultChr8K: 0,
    defaultMirroring: 'horizontal',
    notableGames: ['Battletoads', 'Marble Madness', 'Wizards & Warriors', 'Cabaret'],
  },
];

export const DEFAULT_HEADER_CONFIG: INESHeaderConfig = {
  isNes2: false,
  prgRomSize16K: 2, // 32KB PRG-ROM (NROM-256)
  chrRomSize8K: 1,  // 8KB CHR-ROM
  mapperNumber: 0,  // NROM
  submapper: 0,
  mirroring: 'horizontal',
  hasBattery: false,
  hasTrainer: false,
  vsUnisystem: false,
  playchoice10: false,
  prgRamSize8K: 0,
  prgNvramSize8K: 0,
  chrRamSize8K: 0,
  chrNvramSize8K: 0,
  tvSystem: 'ntsc',
};

/**
 * Builds the 16-byte iNES / NES 2.0 header
 */
export function generateInesHeaderBytes(config: INESHeaderConfig): Uint8Array {
  const header = new Uint8Array(16);

  // Bytes 0-3: Magic numbers 'NES\x1A'
  header[0] = 0x4e; // 'N'
  header[1] = 0x45; // 'E'
  header[2] = 0x53; // 'S'
  header[3] = 0x1a; // MS-DOS EOF

  // Byte 4: PRG-ROM size (LSB in 16KB units)
  header[4] = config.prgRomSize16K & 0xff;

  // Byte 5: CHR-ROM size (LSB in 8KB units, 0 = CHR RAM)
  header[5] = config.chrRomSize8K & 0xff;

  // Byte 6: Flags 6
  // bit 0: Mirroring (0 = Horizontal, 1 = Vertical)
  // bit 1: Battery-backed PRG RAM
  // bit 2: 512-byte Trainer present
  // bit 3: Four-screen VRAM
  // bits 4-7: Mapper lower 4 bits
  let flags6 = 0;
  if (config.mirroring === 'vertical') flags6 |= 0x01;
  if (config.mirroring === 'four_screen') flags6 |= 0x08;
  if (config.hasBattery) flags6 |= 0x02;
  if (config.hasTrainer) flags6 |= 0x04;
  flags6 |= (config.mapperNumber & 0x0f) << 4;
  header[6] = flags6;

  // Byte 7: Flags 7
  // bit 0: VS Unisystem
  // bit 1: PlayChoice-10
  // bits 2-3: NES 2.0 identifier (%10 = NES 2.0)
  // bits 4-7: Mapper upper 4 bits
  let flags7 = 0;
  if (config.vsUnisystem) flags7 |= 0x01;
  if (config.playchoice10) flags7 |= 0x02;
  if (config.isNes2) {
    flags7 |= 0x08; // bit 3 set, bit 2 clear = 0b1000 => bits 2-3 = 0b10
  }
  flags7 |= config.mapperNumber & 0xf0;
  header[7] = flags7;

  if (config.isNes2) {
    // NES 2.0 format extensions
    // Byte 8: Mapper bits 8-11 in D0..D3, Submapper in D4..D7
    const mapperHi = (config.mapperNumber >> 8) & 0x0f;
    const submapperNibble = (config.submapper & 0x0f) << 4;
    header[8] = mapperHi | submapperNibble;

    // Byte 9: PRG-ROM MSB (bits 0-3) and CHR-ROM MSB (bits 4-7)
    const prgMsb = ((config.prgRomSize16K >> 8) & 0x0f);
    const chrMsb = ((config.chrRomSize8K >> 8) & 0x0f) << 4;
    header[9] = prgMsb | chrMsb;

    // Byte 10: PRG-RAM shift count (non-volatile in high nibble, volatile in low)
    const prgRamShift = config.prgRamSize8K > 0 ? 7 : 0;
    const prgNvramShift = config.prgNvramSize8K > 0 ? 7 : 0;
    header[10] = (prgNvramShift << 4) | (prgRamShift & 0x0f);

    // Byte 11: CHR-RAM shift count
    const chrRamShift = config.chrRamSize8K > 0 ? 7 : 0;
    const chrNvramShift = config.chrNvramSize8K > 0 ? 7 : 0;
    header[11] = (chrNvramShift << 4) | (chrRamShift & 0x0f);

    // Byte 12: Timing (0 = NTSC, 1 = PAL, 2 = Multiple/Dual)
    header[12] = config.tvSystem === 'pal' ? 1 : config.tvSystem === 'dual' ? 2 : 0;

    // Bytes 13-15 reserved
    header[13] = 0x00;
    header[14] = 0x00;
    header[15] = 0x00;
  } else {
    // iNES 1.0 format
    // Byte 8: PRG RAM size in 8KB units (0 implies 8KB)
    header[8] = config.prgRamSize8K & 0xff;

    // Byte 9: TV system (bit 0: 0 = NTSC, 1 = PAL)
    header[9] = config.tvSystem === 'pal' ? 1 : 0;

    // Byte 10: TV system, PRG-RAM presence (rarely used, kept 0 for clean compatibility)
    header[10] = 0x00;

    // Bytes 11-15: Zero padding
    header[11] = 0x00;
    header[12] = 0x00;
    header[13] = 0x00;
    header[14] = 0x00;
    header[15] = 0x00;
  }

  return header;
}

/**
 * Parses a 16-byte header into configuration object
 */
export function parseInesHeaderBytes(bytes: Uint8Array): INESHeaderConfig {
  if (bytes.length < 16) {
    throw new Error('Header must be at least 16 bytes');
  }

  // Check magic 'NES\x1A'
  if (bytes[0] !== 0x4e || bytes[1] !== 0x45 || bytes[2] !== 0x53 || bytes[3] !== 0x1a) {
    throw new Error('Not a valid NES ROM: Missing "NES\\x1A" magic signature');
  }

  const isNes2 = (bytes[7] & 0x0c) === 0x08;

  let mapper = (bytes[6] >> 4) | (bytes[7] & 0xf0);
  let submapper = 0;
  let prgSize = bytes[4];
  let chrSize = bytes[5];

  if (isNes2) {
    mapper |= (bytes[8] & 0x0f) << 8;
    submapper = (bytes[8] >> 4) & 0x0f;
    prgSize |= (bytes[9] & 0x0f) << 8;
    chrSize |= (bytes[9] & 0xf0) << 4;
  }

  let mirroring: 'horizontal' | 'vertical' | 'four_screen' = 'horizontal';
  if (bytes[6] & 0x08) {
    mirroring = 'four_screen';
  } else if (bytes[6] & 0x01) {
    mirroring = 'vertical';
  }

  const hasBattery = (bytes[6] & 0x02) !== 0;
  const hasTrainer = (bytes[6] & 0x04) !== 0;
  const vsUnisystem = (bytes[7] & 0x01) !== 0;
  const playchoice10 = (bytes[7] & 0x02) !== 0;

  let tvSystem: 'ntsc' | 'pal' | 'dual' = 'ntsc';
  if (isNes2) {
    const timing = bytes[12] & 0x03;
    if (timing === 1) tvSystem = 'pal';
    else if (timing === 2) tvSystem = 'dual';
  } else {
    if (bytes[9] & 0x01) tvSystem = 'pal';
  }

  return {
    isNes2,
    prgRomSize16K: Math.max(1, prgSize),
    chrRomSize8K: chrSize,
    mapperNumber: mapper,
    submapper,
    mirroring,
    hasBattery,
    hasTrainer,
    vsUnisystem,
    playchoice10,
    prgRamSize8K: bytes[8],
    prgNvramSize8K: 0,
    chrRamSize8K: 0,
    chrNvramSize8K: 0,
    tvSystem,
  };
}

/**
 * Creates rich educational bitfield breakdown for every single byte of the 16-byte header
 */
export function annotateHeaderBytes(
  bytes: Uint8Array,
  config: INESHeaderConfig
): HeaderByteAnnotation[] {
  const toHex = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');

  return [
    {
      offset: 0,
      byteValue: bytes[0],
      hex: `$${toHex(bytes[0])}`,
      name: 'Magic Identification [0]',
      description: 'ASCII "N" (0x4E). Standard iNES container magic header.',
    },
    {
      offset: 1,
      byteValue: bytes[1],
      hex: `$${toHex(bytes[1])}`,
      name: 'Magic Identification [1]',
      description: 'ASCII "E" (0x45). Standard iNES container magic header.',
    },
    {
      offset: 2,
      byteValue: bytes[2],
      hex: `$${toHex(bytes[2])}`,
      name: 'Magic Identification [2]',
      description: 'ASCII "S" (0x53). Standard iNES container magic header.',
    },
    {
      offset: 3,
      byteValue: bytes[3],
      hex: `$${toHex(bytes[3])}`,
      name: 'Magic Identification [3]',
      description: 'ASCII 0x1A (MS-DOS End-of-File marker). Terminates terminal print if dumped.',
    },
    {
      offset: 4,
      byteValue: bytes[4],
      hex: `$${toHex(bytes[4])}`,
      name: 'PRG-ROM Size',
      description: `Program ROM bank count in 16KB units. Value ${bytes[4]} = ${bytes[4] * 16} KB total CPU code/data.`,
    },
    {
      offset: 5,
      byteValue: bytes[5],
      hex: `$${toHex(bytes[5])}`,
      name: 'CHR-ROM Size',
      description: bytes[5] === 0
        ? 'Value $00 = Board uses CHR-RAM (8KB RAM populated dynamically by PRG code).'
        : `Character ROM bank count in 8KB units. Value ${bytes[5]} = ${bytes[5] * 8} KB Pattern Table graphics.`,
    },
    {
      offset: 6,
      byteValue: bytes[6],
      hex: `$${toHex(bytes[6])}`,
      name: 'Flags 6 (Mapper low & Hardware flags)',
      description: 'Defines name-table mirroring, battery save circuit, trainer, and mapper lower nibble.',
      bitsMeaning: [
        { bit: 'D0', meaning: `Mirroring: ${bytes[6] & 0x01 ? 'Vertical (Horizontal scroll)' : 'Horizontal (Vertical scroll)'}`, active: (bytes[6] & 0x01) !== 0 },
        { bit: 'D1', meaning: 'Battery-backed PRG-RAM ($6000-$7FFF)', active: (bytes[6] & 0x02) !== 0 },
        { bit: 'D2', meaning: '512-byte Trainer ($7000-$71FF)', active: (bytes[6] & 0x04) !== 0 },
        { bit: 'D3', meaning: 'Four-screen VRAM layout', active: (bytes[6] & 0x08) !== 0 },
        { bit: 'D4..D7', meaning: `Mapper Lower Nibble: ${(bytes[6] >> 4) & 0x0f} ($${((bytes[6] >> 4) & 0x0f).toString(16).toUpperCase()})`, active: true },
      ],
    },
    {
      offset: 7,
      byteValue: bytes[7],
      hex: `$${toHex(bytes[7])}`,
      name: 'Flags 7 (Mapper high & Format identifier)',
      description: 'Defines arcade VS/PlayChoice hardware, NES 2.0 format signature, and mapper upper nibble.',
      bitsMeaning: [
        { bit: 'D0', meaning: 'VS Unisystem arcade cabinet', active: (bytes[7] & 0x01) !== 0 },
        { bit: 'D1', meaning: 'PlayChoice-10 (hint screen in ROM)', active: (bytes[7] & 0x02) !== 0 },
        { bit: 'D2..D3', meaning: (bytes[7] & 0x0c) === 0x08 ? 'NES 2.0 Specification active' : 'iNES 1.0 Legacy Format', active: (bytes[7] & 0x0c) === 0x08 },
        { bit: 'D4..D7', meaning: `Mapper Upper Nibble: ${(bytes[7] >> 4) & 0x0f} ($${((bytes[7] >> 4) & 0x0f).toString(16).toUpperCase()})`, active: true },
      ],
    },
    {
      offset: 8,
      byteValue: bytes[8],
      hex: `$${toHex(bytes[8])}`,
      name: config.isNes2 ? 'NES 2.0: Mapper High & Submapper' : 'iNES 1.0: PRG-RAM Size',
      description: config.isNes2
        ? `Submapper: ${(bytes[8] >> 4) & 0x0f}, Mapper bits 8-11: ${bytes[8] & 0x0f}`
        : `PRG-RAM size in 8KB units (Value ${bytes[8]} = ${bytes[8] === 0 ? '8KB default' : bytes[8] * 8 + ' KB'})`,
    },
    {
      offset: 9,
      byteValue: bytes[9],
      hex: `$${toHex(bytes[9])}`,
      name: config.isNes2 ? 'NES 2.0: PRG/CHR ROM MSBs' : 'iNES 1.0: TV System',
      description: config.isNes2
        ? `PRG-ROM upper nibble: ${bytes[9] & 0x0f}, CHR-ROM upper nibble: ${(bytes[9] >> 4) & 0x0f}`
        : `TV System: ${bytes[9] & 0x01 ? 'PAL (50Hz / 312 scanlines)' : 'NTSC (60Hz / 262 scanlines)'}`,
    },
    {
      offset: 10,
      byteValue: bytes[10],
      hex: `$${toHex(bytes[10])}`,
      name: config.isNes2 ? 'NES 2.0: PRG-RAM Shift Count' : 'Flags 10 (Unofficial PRG-RAM / Bus conflicts)',
      description: config.isNes2
        ? `Volatile RAM: ${bytes[10] & 0x0f ? 64 << (bytes[10] & 0x0f) : 0} bytes, Non-volatile NVRAM: ${(bytes[10] >> 4) & 0x0f ? 64 << ((bytes[10] >> 4) & 0x0f) : 0} bytes`
        : 'Reserved/Compatibility flags in iNES 1.0 ($00 recommended).',
    },
    {
      offset: 11,
      byteValue: bytes[11],
      hex: `$${toHex(bytes[11])}`,
      name: config.isNes2 ? 'NES 2.0: CHR-RAM Shift Count' : 'Padding [11]',
      description: config.isNes2
        ? `Volatile CHR-RAM: ${bytes[11] & 0x0f ? 64 << (bytes[11] & 0x0f) : 0} bytes`
        : 'Reserved zero padding byte for iNES 1.0.',
    },
    {
      offset: 12,
      byteValue: bytes[12],
      hex: `$${toHex(bytes[12])}`,
      name: config.isNes2 ? 'NES 2.0: CPU/PPU Timing' : 'Padding [12]',
      description: config.isNes2
        ? `Timing: ${['RP2C02 (NTSC NES)', 'RP2C07 (PAL NES)', 'Multiple-region', 'UA6538 (Dendy)'][bytes[12] & 0x03]}`
        : 'Reserved zero padding byte.',
    },
    {
      offset: 13,
      byteValue: bytes[13],
      hex: `$${toHex(bytes[13])}`,
      name: config.isNes2 ? 'NES 2.0: Extended Console Type' : 'Padding [13]',
      description: config.isNes2 ? 'Standard NES/Famicom / Vs System hardware type' : 'Reserved zero padding byte.',
    },
    {
      offset: 14,
      byteValue: bytes[14],
      hex: `$${toHex(bytes[14])}`,
      name: config.isNes2 ? 'NES 2.0: Miscellaneous ROMs' : 'Padding [14]',
      description: config.isNes2 ? 'Number of miscellaneous ROMs present' : 'Reserved zero padding byte.',
    },
    {
      offset: 15,
      byteValue: bytes[15],
      hex: `$${toHex(bytes[15])}`,
      name: config.isNes2 ? 'NES 2.0: Default Expansion Device' : 'Padding [15]',
      description: config.isNes2 ? 'Default controller/expansion device configuration' : 'Reserved zero padding byte.',
    },
  ];
}

/**
 * Returns formatted 16-byte hex dump string
 */
export function formatHexDump(bytes: Uint8Array): string {
  let hex = '';
  let ascii = '';
  for (let i = 0; i < 16; i++) {
    const b = bytes[i];
    hex += b.toString(16).toUpperCase().padStart(2, '0') + ' ';
    ascii += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
  }
  return `00000000: ${hex.trim()} |${ascii}|`;
}
