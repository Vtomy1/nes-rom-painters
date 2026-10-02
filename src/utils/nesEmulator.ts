/**
 * Lightweight In-Browser NES PPU Display & Interactive Runner
 * Renders 256x240 resolution using the authentic NES palette, pattern tables, and OAM.
 */

import { NESPaletteConfig } from '../types/nes';
import { nesIndexToHex, hexToRgb } from './nesPalette';

export interface JoypadState {
  a: boolean;
  b: boolean;
  select: boolean;
  start: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface NesEmulatorState {
  spriteX: number;
  spriteY: number;
  spriteTile: number;
  spritePalette: number;
  spriteFlipH: boolean;
  spriteFlipV: boolean;
  frameCount: number;
  fps: number;
  isRunning: boolean;
}

export class SimpleNesPpu {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private imageData: ImageData | null = null;
  private width = 256;
  private height = 240;

  public joypad: JoypadState = {
    a: false,
    b: false,
    select: false,
    start: false,
    up: false,
    down: false,
    left: false,
    right: false,
  };

  public state: NesEmulatorState = {
    spriteX: 124,
    spriteY: 112,
    spriteTile: 0,
    spritePalette: 0,
    spriteFlipH: false,
    spriteFlipV: false,
    frameCount: 0,
    fps: 60,
    isRunning: true,
  };

  private animationFrameId: number | null = null;
  private lastTime = performance.now();
  private framesThisSecond = 0;
  private lastFpsUpdate = performance.now();

  constructor(
    private tiles: Uint8Array[],
    private palette: NESPaletteConfig,
    private activeTileIdx: number = 0
  ) {}

  public attachCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (this.ctx) {
      this.imageData = this.ctx.createImageData(this.width, this.height);
    }
  }

  public updateData(tiles: Uint8Array[], palette: NESPaletteConfig, activeTileIdx: number) {
    this.tiles = tiles;
    this.palette = palette;
    this.activeTileIdx = activeTileIdx;
    this.state.spriteTile = activeTileIdx;
  }

  public start() {
    this.state.isRunning = true;
    this.loop();
  }

  public stop() {
    this.state.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public reset() {
    this.state.spriteX = 124;
    this.state.spriteY = 112;
    this.state.spriteTile = this.activeTileIdx;
  }

  private loop = () => {
    if (!this.state.isRunning) return;

    this.updateLogic();
    this.renderFrame();

    // FPS calculation
    const now = performance.now();
    this.framesThisSecond++;
    if (now - this.lastFpsUpdate >= 1000) {
      this.state.fps = this.framesThisSecond;
      this.framesThisSecond = 0;
      this.lastFpsUpdate = now;
    }

    this.state.frameCount++;
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private updateLogic() {
    const speed = 2;
    if (this.joypad.up) {
      this.state.spriteY = Math.max(8, this.state.spriteY - speed);
    }
    if (this.joypad.down) {
      this.state.spriteY = Math.min(224, this.state.spriteY + speed);
    }
    if (this.joypad.left) {
      this.state.spriteX = Math.max(8, this.state.spriteX - speed);
      this.state.spriteFlipH = true;
    }
    if (this.joypad.right) {
      this.state.spriteX = Math.min(240, this.state.spriteX + speed);
      this.state.spriteFlipH = false;
    }

    if (this.joypad.a) {
      // Toggle palette on A button
      // slight delay
      if (this.state.frameCount % 15 === 0) {
        this.state.spritePalette = (this.state.spritePalette + 1) % 4;
      }
    }
  }

  public renderFrame() {
    if (!this.ctx || !this.imageData) return;

    const data = this.imageData.data;
    const universalBgRgb = hexToRgb(nesIndexToHex(this.palette.universalBg));

    // 1. Fill screen with Universal Background Color ($3F00)
    for (let i = 0; i < this.width * this.height; i++) {
      const idx = i * 4;
      data[idx] = universalBgRgb[0];
      data[idx + 1] = universalBgRgb[1];
      data[idx + 2] = universalBgRgb[2];
      data[idx + 3] = 255;
    }

    // 2. Render Nametable Background (Row of blocks, floor, and center tile)
    // Floor at bottom (row 26-28): brick / floor tiles
    const floorTileIdx = 4; // brick if available, else 0
    const floorTile = this.tiles[floorTileIdx] || this.tiles[0];
    const floorPal = this.palette.bg[0];

    for (let tileX = 0; tileX < 32; tileX++) {
      this.drawTileOnScreen(data, floorTile, tileX * 8, 208, floorPal, universalBgRgb);
      this.drawTileOnScreen(data, floorTile, tileX * 8, 216, floorPal, universalBgRgb);
      this.drawTileOnScreen(data, floorTile, tileX * 8, 224, floorPal, universalBgRgb);
    }

    // Border ceiling
    for (let tileX = 0; tileX < 32; tileX++) {
      this.drawTileOnScreen(data, floorTile, tileX * 8, 8, floorPal, universalBgRgb);
    }

    // Floating question blocks or decorative tiles in center
    const qTile = this.tiles[3] || this.tiles[0];
    const qPal = this.palette.bg[1];
    this.drawTileOnScreen(data, qTile, 96, 144, qPal, universalBgRgb);
    this.drawTileOnScreen(data, qTile, 120, 144, qPal, universalBgRgb);
    this.drawTileOnScreen(data, qTile, 144, 144, qPal, universalBgRgb);

    // 3. Render Centerpiece Painted Showcase Tile / Metasprite
    const activeTile = this.tiles[this.activeTileIdx] || this.tiles[0];
    const bgPal0 = this.palette.bg[0];
    this.drawTileOnScreen(data, activeTile, 120, 96, bgPal0, universalBgRgb, 2); // 2x scaled pedestal showcase

    // 4. Render Active Player Sprite (OAM)
    const sprPal = this.palette.spr[this.state.spritePalette];
    this.drawSpriteOnScreen(
      data,
      activeTile,
      Math.round(this.state.spriteX),
      Math.round(this.state.spriteY),
      sprPal,
      this.state.spriteFlipH,
      this.state.spriteFlipV
    );

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  private drawTileOnScreen(
    data: Uint8ClampedArray,
    tile: Uint8Array,
    screenX: number,
    screenY: number,
    subpalette: [number, number, number],
    universalBgRgb: [number, number, number],
    scale: number = 1
  ) {
    if (!tile) return;
    const c1 = hexToRgb(nesIndexToHex(subpalette[0]));
    const c2 = hexToRgb(nesIndexToHex(subpalette[1]));
    const c3 = hexToRgb(nesIndexToHex(subpalette[2]));

    for (let ty = 0; ty < 8; ty++) {
      for (let tx = 0; tx < 8; tx++) {
        const colorIdx = tile[ty * 8 + tx];
        let rgb: [number, number, number] = universalBgRgb;
        if (colorIdx === 1) rgb = c1;
        else if (colorIdx === 2) rgb = c2;
        else if (colorIdx === 3) rgb = c3;

        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = screenX + tx * scale + sx;
            const py = screenY + ty * scale + sy;
            if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
              const idx = (py * this.width + px) * 4;
              data[idx] = rgb[0];
              data[idx + 1] = rgb[1];
              data[idx + 2] = rgb[2];
              data[idx + 3] = 255;
            }
          }
        }
      }
    }
  }

  private drawSpriteOnScreen(
    data: Uint8ClampedArray,
    tile: Uint8Array,
    screenX: number,
    screenY: number,
    subpalette: [number, number, number],
    flipH: boolean,
    flipV: boolean
  ) {
    if (!tile) return;
    const c1 = hexToRgb(nesIndexToHex(subpalette[0]));
    const c2 = hexToRgb(nesIndexToHex(subpalette[1]));
    const c3 = hexToRgb(nesIndexToHex(subpalette[2]));

    for (let ty = 0; ty < 8; ty++) {
      const srcY = flipV ? 7 - ty : ty;
      for (let tx = 0; tx < 8; tx++) {
        const srcX = flipH ? 7 - tx : tx;
        const colorIdx = tile[srcY * 8 + srcX];

        if (colorIdx === 0) {
          // Sprite Color 0 is Transparent!
          continue;
        }

        let rgb: [number, number, number] = c1;
        if (colorIdx === 2) rgb = c2;
        else if (colorIdx === 3) rgb = c3;

        const px = screenX + tx;
        const py = screenY + ty;
        if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
          const idx = (py * this.width + px) * 4;
          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = 255;
        }
      }
    }
  }
}
