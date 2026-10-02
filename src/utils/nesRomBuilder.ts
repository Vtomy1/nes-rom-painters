/**
 * NES ROM Generator & 6502 Machine Code Builder
 * Combines iNES Header + 16KB/32KB PRG-ROM + 8KB CHR-ROM
 */

import { INESHeaderConfig, NESPaletteConfig } from '../types/nes';
import { generateInesHeaderBytes } from './nesHeader';
import { encodePatternTablesToChrRom } from './nesChr';

/**
 * Builds the 6502 PRG ROM machine code for the interactive test runner
 */
export function buildPrgRom(
  palette: NESPaletteConfig,
  activeTileIdx: number = 0,
  prgRomSize16K: number = 2
): Uint8Array {
  const prgSize = prgRomSize16K * 16384;
  const prg = new Uint8Array(prgSize);

  // Address base: If 16KB, $C000 (mirrored at $8000). If 32KB, $8000.
  const baseAddr = prgRomSize16K === 1 ? 0xc000 : 0x8000;
  const offset = 0; // write starting at index 0 of PRG bank

  // Palette bytes to inject: 32 bytes ($3F00 - $3F1F)
  const palBytes: number[] = [
    palette.universalBg,
    palette.bg[0][0], palette.bg[0][1], palette.bg[0][2],
    palette.universalBg,
    palette.bg[1][0], palette.bg[1][1], palette.bg[1][2],
    palette.universalBg,
    palette.bg[2][0], palette.bg[2][1], palette.bg[2][2],
    palette.universalBg,
    palette.bg[3][0], palette.bg[3][1], palette.bg[3][2],

    palette.universalBg,
    palette.spr[0][0], palette.spr[0][1], palette.spr[0][2],
    palette.universalBg,
    palette.spr[1][0], palette.spr[1][1], palette.spr[1][2],
    palette.universalBg,
    palette.spr[2][0], palette.spr[2][1], palette.spr[2][2],
    palette.universalBg,
    palette.spr[3][0], palette.spr[3][1], palette.spr[3][2],
  ];

  // We write the 6502 program starting at $8000 (or $C000)
  // Let's create an assembler byte stream
  const code: number[] = [];

  // Table of palette data in PRG ROM (will be positioned right at startup)
  // JMP over data
  code.push(0x4c); // JMP RESET
  const resetAddrPlaceholder = code.length;
  code.push(0x00, 0x00); // placeholder for low, high

  const palDataOffset = code.length;
  for (let i = 0; i < 32; i++) {
    code.push(palBytes[i]);
  }

  // Text message: "NES ROM PAINTER"
  const textMsg = " NES ROM PAINTER ";
  const textDataOffset = code.length;
  for (let i = 0; i < textMsg.length; i++) {
    code.push(textMsg.charCodeAt(i));
  }

  // --- RESET ROUTINE ---
  const resetOffset = code.length;
  const resetAbsAddr = baseAddr + resetOffset;
  code[resetAddrPlaceholder] = resetAbsAddr & 0xff;
  code[resetAddrPlaceholder + 1] = (resetAbsAddr >> 8) & 0xff;

  // SEI
  code.push(0x78);
  // CLD
  code.push(0xd8);
  // LDX #$40; STX $4017 (disable APU frame IRQ)
  code.push(0xa2, 0x40, 0x8e, 0x17, 0x40);
  // LDX #$FF; TXS (init stack)
  code.push(0xa2, 0xff, 0x9a);
  // INX (=0); STX $2000; STX $2001; STX $4010
  code.push(0xe8, 0x8e, 0x00, 0x20, 0x8e, 0x01, 0x20, 0x8e, 0x10, 0x40);

  // vblankwait1: BIT $2002; BPL vblankwait1
  code.push(0x2c, 0x02, 0x20, 0x10, 0xfb);

  // Clear memory $0000-$07FF
  // LDX #$00; LDA #$00
  code.push(0xa2, 0x00, 0xa9, 0x00);
  // clrmem_loop: STA $0000, X; STA $0100, X; STA $0300, X; STA $0400, X; STA $0500, X; STA $0600, X; STA $0700, X; INX; BNE clrmem_loop
  const clrLoop = code.length;
  code.push(0x9d, 0x00, 0x00);
  code.push(0x9d, 0x00, 0x01);
  code.push(0x9d, 0x00, 0x03);
  code.push(0x9d, 0x00, 0x04);
  code.push(0x9d, 0x00, 0x05);
  code.push(0x9d, 0x00, 0x06);
  code.push(0x9d, 0x00, 0x07);
  code.push(0xe8);
  code.push(0xd0, ((clrLoop - (code.length + 1)) & 0xff));

  // Initialize OAM buffer at $0200 with $FE
  // LDA #$FE; LDX #$00
  code.push(0xa9, 0xfe, 0xa2, 0x00);
  const oamLoop = code.length;
  code.push(0x9d, 0x00, 0x02, 0xe8, 0xd0, ((oamLoop - (code.length + 1)) & 0xff));

  // vblankwait2: BIT $2002; BPL vblankwait2
  code.push(0x2c, 0x02, 0x20, 0x10, 0xfb);

  // Load palette data into PPU $3F00
  // LDA #$3F; STA $2006; LDA #$00; STA $2006
  code.push(0xa9, 0x3f, 0x8d, 0x06, 0x20, 0xa9, 0x00, 0x8d, 0x06, 0x20);
  // LDX #$00
  code.push(0xa2, 0x00);
  // load_pal: LDA $..., X; STA $2007; INX; CPX #32; BNE load_pal
  const loadPalLoop = code.length;
  const palAbsAddr = baseAddr + palDataOffset;
  code.push(0xbd, palAbsAddr & 0xff, (palAbsAddr >> 8) & 0xff); // LDA pal, X
  code.push(0x8d, 0x07, 0x20); // STA $2007
  code.push(0xe8); // INX
  code.push(0xe0, 0x20); // CPX #32
  code.push(0xd0, ((loadPalLoop - (code.length + 1)) & 0xff));

  // Clear Nametable 0 ($2000 - $23BF) with empty tile ($00)
  // LDA #$20; STA $2006; LDA #$00; STA $2006
  code.push(0xa9, 0x20, 0x8d, 0x06, 0x20, 0xa9, 0x00, 0x8d, 0x06, 0x20);
  // LDX #$00; LDY #$04; LDA #$00
  code.push(0xa2, 0x00, 0xa0, 0x04, 0xa9, 0x00);
  const clearNtLoop = code.length;
  code.push(0x8d, 0x07, 0x20); // STA $2007
  code.push(0xe8); // INX
  code.push(0xd0, ((clearNtLoop - (code.length + 1)) & 0xff));
  code.push(0x88); // DEY
  code.push(0xd0, (((clearNtLoop - 2) - (code.length + 1)) & 0xff));

  // Draw showcase tiles in the middle of Nametable 0 (Row 14, Col 12 = $21CC)
  // LDA #$21; STA $2006; LDA #$CC; STA $2006
  code.push(0xa9, 0x21, 0x8d, 0x06, 0x20, 0xa9, 0xcc, 0x8d, 0x06, 0x20);
  // Write active painted tile (e.g. tile activeTileIdx)
  code.push(0xa9, activeTileIdx & 0xff, 0x8d, 0x07, 0x20);

  // Set up player sprite in OAM buffer ($0200)
  // Y = 112 ($70)
  code.push(0xa9, 0x70, 0x8d, 0x00, 0x02);
  // Tile = activeTileIdx
  code.push(0xa9, activeTileIdx & 0xff, 0x8d, 0x01, 0x02);
  // Attribute = $00 (Palette 0, behind BG = 0, no flip)
  code.push(0xa9, 0x00, 0x8d, 0x02, 0x02);
  // X = 120 ($78)
  code.push(0xa9, 0x78, 0x8d, 0x03, 0x02);

  // Enable PPU:
  // LDA #%10010000; STA $2000 (NMI on, BG pattern table 0, Sprite pattern table 1)
  code.push(0xa9, 0x90, 0x8d, 0x00, 0x20);
  // LDA #%00011110; STA $2001 (Show BG & Sprites, no left column clipping)
  code.push(0xa9, 0x1e, 0x8d, 0x01, 0x20);

  // Main infinite loop
  const mainLoop = code.length;
  // JMP mainLoop (CPU spins, NMI handles 60FPS logic)
  const mainLoopAbs = baseAddr + mainLoop;
  code.push(0x4c, mainLoopAbs & 0xff, (mainLoopAbs >> 8) & 0xff);

  // --- NMI ROUTINE ---
  const nmiOffset = code.length;
  const nmiAbsAddr = baseAddr + nmiOffset;

  // PHA; TXA; PHA; TYA; PHA
  code.push(0x48, 0x8a, 0x48, 0x98, 0x48);

  // OAM DMA copy: LDA #$02; STA $4014
  code.push(0xa9, 0x02, 0x8d, 0x14, 0x40);

  // Reset scroll: LDA #$00; STA $2005; STA $2005
  code.push(0xa9, 0x00, 0x8d, 0x05, 0x20, 0x8d, 0x05, 0x20);

  // Read Joypad 1 ($4016)
  // LDA #$01; STA $4016; LDA #$00; STA $4016 (latch joypad)
  code.push(0xa9, 0x01, 0x8d, 0x16, 0x40, 0xa9, 0x00, 0x8d, 0x16, 0x40);

  // Read 8 buttons: A, B, Select, Start, Up, Down, Left, Right
  // Read A
  code.push(0xad, 0x16, 0x40);
  // Read B
  code.push(0xad, 0x16, 0x40);
  // Read Select
  code.push(0xad, 0x16, 0x40);
  // Read Start
  code.push(0xad, 0x16, 0x40);

  // Read UP: LDA $4016; AND #$01; BEQ not_up
  code.push(0xad, 0x16, 0x40, 0x29, 0x01);
  const skipUpBranch = code.length;
  code.push(0xf0, 0x00); // placeholder
  // Up pressed: DEC $0200
  code.push(0xce, 0x00, 0x02);
  code[skipUpBranch + 1] = (code.length - (skipUpBranch + 2)) & 0xff;

  // Read DOWN: LDA $4016; AND #$01; BEQ not_down
  code.push(0xad, 0x16, 0x40, 0x29, 0x01);
  const skipDownBranch = code.length;
  code.push(0xf0, 0x00);
  // Down pressed: INC $0200
  code.push(0xee, 0x00, 0x02);
  code[skipDownBranch + 1] = (code.length - (skipDownBranch + 2)) & 0xff;

  // Read LEFT: LDA $4016; AND #$01; BEQ not_left
  code.push(0xad, 0x16, 0x40, 0x29, 0x01);
  const skipLeftBranch = code.length;
  code.push(0xf0, 0x00);
  // Left pressed: DEC $0203
  code.push(0xce, 0x03, 0x02);
  code[skipLeftBranch + 1] = (code.length - (skipLeftBranch + 2)) & 0xff;

  // Read RIGHT: LDA $4016; AND #$01; BEQ not_right
  code.push(0xad, 0x16, 0x40, 0x29, 0x01);
  const skipRightBranch = code.length;
  code.push(0xf0, 0x00);
  // Right pressed: INC $0203
  code.push(0xee, 0x03, 0x02);
  code[skipRightBranch + 1] = (code.length - (skipRightBranch + 2)) & 0xff;

  // PLA; TAY; PLA; TAX; PLA; RTI
  code.push(0x68, 0xa8, 0x68, 0xaa, 0x68, 0x40);

  // Copy code into prg bank
  for (let i = 0; i < code.length; i++) {
    prg[offset + i] = code[i];
  }

  // --- INTERRUPT VECTORS AT $FFFA-$FFFF ---
  // In the PRG ROM buffer, the vectors are at the very last 6 bytes:
  // prgSize - 6: NMI ($FFFA-$FFFB)
  // prgSize - 4: RESET ($FFFC-$FFFD)
  // prgSize - 2: IRQ ($FFFE-$FFFF)

  const nmiPos = prgSize - 6;
  prg[nmiPos] = nmiAbsAddr & 0xff;
  prg[nmiPos + 1] = (nmiAbsAddr >> 8) & 0xff;

  const resetPos = prgSize - 4;
  prg[resetPos] = resetAbsAddr & 0xff;
  prg[resetPos + 1] = (resetAbsAddr >> 8) & 0xff;

  const irqPos = prgSize - 2;
  prg[irqPos] = resetAbsAddr & 0xff;
  prg[irqPos + 1] = (resetAbsAddr >> 8) & 0xff;

  return prg;
}

/**
 * Creates the complete `.nes` ROM file (Header + PRG + CHR)
 */
export function buildNesRom(
  headerConfig: INESHeaderConfig,
  tiles: Uint8Array[],
  palette: NESPaletteConfig,
  activeTileIdx: number = 0
): Uint8Array {
  // 1. Generate 16-byte Header
  const headerBytes = generateInesHeaderBytes(headerConfig);

  // 2. Generate PRG-ROM (16KB or 32KB)
  const prgRom = buildPrgRom(palette, activeTileIdx, headerConfig.prgRomSize16K);

  // 3. Generate CHR-ROM (8KB = 512 tiles, or empty if chrRomSize8K === 0)
  const chrRom = headerConfig.chrRomSize8K > 0
    ? encodePatternTablesToChrRom(tiles)
    : new Uint8Array(0);

  // Total size
  const totalLength = headerBytes.length + prgRom.length + chrRom.length;
  const rom = new Uint8Array(totalLength);

  // Write header
  rom.set(headerBytes, 0);

  // Write PRG
  rom.set(prgRom, headerBytes.length);

  // Write CHR
  if (chrRom.length > 0) {
    rom.set(chrRom, headerBytes.length + prgRom.length);
  }

  return rom;
}

/**
 * Generates 6502 Assembly code (.asm / ca65 format)
 */
export function exportToCa65Asm(
  headerConfig: INESHeaderConfig,
  tiles: Uint8Array[],
  palette: NESPaletteConfig
): string {
  let asm = `; =========================================================\n`;
  asm += `; NES ROM & CHR Export generated by NES ROM Painter Studio\n`;
  asm += `; Target Assembler: ca65 / NESASM / asm6\n`;
  asm += `; =========================================================\n\n`;

  asm += `.segment "HEADER"\n`;
  asm += `  .byte "NES", $1A             ; Magic identification\n`;
  asm += `  .byte ${headerConfig.prgRomSize16K}                     ; PRG-ROM in 16KB units\n`;
  asm += `  .byte ${headerConfig.chrRomSize8K}                     ; CHR-ROM in 8KB units\n`;
  asm += `  .byte %${(headerConfig.mirroring === 'vertical' ? 1 : 0) | (headerConfig.hasBattery ? 2 : 0) | ((headerConfig.mapperNumber & 0x0f) << 4)}.toString(2).padStart(8, '0')} ; Flags 6\n`;
  asm += `  .byte %${(headerConfig.isNes2 ? 8 : 0) | (headerConfig.mapperNumber & 0xf0)}.toString(2).padStart(8, '0')} ; Flags 7\n`;
  asm += `  .byte $00, $00, $00, $00, $00, $00, $00, $00 ; Padding / NES 2.0\n\n`;

  asm += `; NES Palette Data ($3F00 - $3F1F)\n`;
  asm += `.segment "RODATA"\n`;
  asm += `palette_data:\n`;
  asm += `  .byte $${palette.universalBg.toString(16).padStart(2, '0')}, $${palette.bg[0][0].toString(16).padStart(2, '0')}, $${palette.bg[0][1].toString(16).padStart(2, '0')}, $${palette.bg[0][2].toString(16).padStart(2, '0')} ; BG 0\n`;
  asm += `  .byte $${palette.universalBg.toString(16).padStart(2, '0')}, $${palette.bg[1][0].toString(16).padStart(2, '0')}, $${palette.bg[1][1].toString(16).padStart(2, '0')}, $${palette.bg[1][2].toString(16).padStart(2, '0')} ; BG 1\n`;
  asm += `  .byte $${palette.universalBg.toString(16).padStart(2, '0')}, $${palette.spr[0][0].toString(16).padStart(2, '0')}, $${palette.spr[0][1].toString(16).padStart(2, '0')}, $${palette.spr[0][2].toString(16).padStart(2, '0')} ; SPR 0\n`;
  asm += `  .byte $${palette.universalBg.toString(16).padStart(2, '0')}, $${palette.spr[1][0].toString(16).padStart(2, '0')}, $${palette.spr[1][1].toString(16).padStart(2, '0')}, $${palette.spr[1][2].toString(16).padStart(2, '0')} ; SPR 1\n\n`;

  asm += `.segment "TILES"\n`;
  asm += `; Sample CHR Tile (Tile 0, 16 bytes 2bpp):\n`;
  const tile0Bytes = tiles[0] ? Array.from(encodePatternTablesToChrRom([tiles[0]]).slice(0, 16)) : [];
  asm += `tile_0:\n`;
  asm += `  .byte ` + tile0Bytes.map(b => `$${b.toString(16).padStart(2, '0')}`).join(', ') + `\n`;

  return asm;
}

/**
 * Generates C Header array (.h) for cc65 / neslib projects
 */
export function exportToCHeader(
  tiles: Uint8Array[],
  palette: NESPaletteConfig
): string {
  let c = `/* NES Graphics C Header - Generated by NES ROM Painter Studio */\n`;
  c += `#ifndef NES_GRAPHICS_H\n#define NES_GRAPHICS_H\n\n`;

  c += `const unsigned char PALETTE_DATA[32] = {\n  `;
  const palBytes = [
    palette.universalBg, palette.bg[0][0], palette.bg[0][1], palette.bg[0][2],
    palette.universalBg, palette.bg[1][0], palette.bg[1][1], palette.bg[1][2],
    palette.universalBg, palette.bg[2][0], palette.bg[2][1], palette.bg[2][2],
    palette.universalBg, palette.bg[3][0], palette.bg[3][1], palette.bg[3][2],
    palette.universalBg, palette.spr[0][0], palette.spr[0][1], palette.spr[0][2],
    palette.universalBg, palette.spr[1][0], palette.spr[1][1], palette.spr[1][2],
    palette.universalBg, palette.spr[2][0], palette.spr[2][1], palette.spr[2][2],
    palette.universalBg, palette.spr[3][0], palette.spr[3][1], palette.spr[3][2],
  ];
  c += palBytes.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ');
  c += `\n};\n\n`;

  c += `/* 16-byte CHR tile definitions (Tile 0..15) */\n`;
  c += `const unsigned char TILE_DATA[16 * 16] = {\n`;
  for (let t = 0; t < Math.min(16, tiles.length); t++) {
    const tileBytes = encodePatternTablesToChrRom([tiles[t]]).slice(0, 16);
    c += `  /* Tile ${t} */\n  `;
    c += Array.from(tileBytes).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ');
    c += `,\n`;
  }
  c += `};\n\n#endif /* NES_GRAPHICS_H */\n`;

  return c;
}
