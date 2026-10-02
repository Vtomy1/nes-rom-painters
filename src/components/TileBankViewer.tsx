import React, { useState, useRef, useEffect } from 'react';
import { NESPaletteConfig } from '../types/nes';
import { getSubpaletteHexColors } from '../utils/nesPalette';
import { PRESET_TILES } from '../utils/nesChr';
import { Copy, ClipboardPaste, Trash2, Plus, Sparkles } from 'lucide-react';

interface TileBankViewerProps {
  tiles: Uint8Array[];
  setTiles: React.Dispatch<React.SetStateAction<Uint8Array[]>>;
  activeTileIdx: number;
  setActiveTileIdx: (idx: number) => void;
  palette: NESPaletteConfig;
  activePaletteType: 'bg' | 'spr';
  activeSubpaletteIdx: number;
  onSelectForEdit: (idx: number) => void;
}

export const TileBankViewer: React.FC<TileBankViewerProps> = ({
  tiles,
  setTiles,
  activeTileIdx,
  setActiveTileIdx,
  palette,
  activePaletteType,
  activeSubpaletteIdx,
  onSelectForEdit,
}) => {
  const [activeBank, setActiveBank] = useState<0 | 1>(0); // 0 = Pattern Table 0 ($0000), 1 = Pattern Table 1 ($1000)
  const [copiedTile, setCopiedTile] = useState<Uint8Array | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const subHexColors = getSubpaletteHexColors(
    palette,
    activePaletteType,
    activeSubpaletteIdx
  );

  const bankOffset = activeBank * 256;

  // Render 16x16 tiles (128x128 pixels, displayed scaled up)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 16 tiles across, 16 tiles down = 128x128 native pixels
    canvas.width = 128;
    canvas.height = 128;

    const imgData = ctx.createImageData(128, 128);
    const d = imgData.data;

    // Parse hex to rgb
    const rgbs = subHexColors.map((hex) => {
      const clean = hex.replace('#', '');
      return [
        parseInt(clean.substring(0, 2), 16) || 0,
        parseInt(clean.substring(2, 4), 16) || 0,
        parseInt(clean.substring(4, 6), 16) || 0,
      ];
    });

    for (let tileIdxInBank = 0; tileIdxInBank < 256; tileIdxInBank++) {
      const globalTileIdx = bankOffset + tileIdxInBank;
      const tile = tiles[globalTileIdx] || new Uint8Array(64);

      const tileX = tileIdxInBank % 16;
      const tileY = Math.floor(tileIdxInBank / 16);

      for (let ty = 0; ty < 8; ty++) {
        for (let tx = 0; tx < 8; tx++) {
          const colorIdx = tile[ty * 8 + tx];
          const px = tileX * 8 + tx;
          const py = tileY * 8 + ty;
          const idx = (py * 128 + px) * 4;

          const isTransparent = activePaletteType === 'spr' && colorIdx === 0;

          if (isTransparent) {
            const check = (px + py) % 2 === 0;
            d[idx] = check ? 28 : 20;
            d[idx + 1] = check ? 32 : 23;
            d[idx + 2] = check ? 46 : 36;
            d[idx + 3] = 255;
          } else {
            const rgb = rgbs[colorIdx];
            d[idx] = rgb[0];
            d[idx + 1] = rgb[1];
            d[idx + 2] = rgb[2];
            d[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [tiles, activeBank, bankOffset, subHexColors, activePaletteType]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = 128 / rect.width;
    const scaleY = 128 / rect.height;

    const px = Math.floor(clickX * scaleX);
    const py = Math.floor(clickY * scaleY);

    const tileCol = Math.floor(px / 8);
    const tileRow = Math.floor(py / 8);

    if (tileCol >= 0 && tileCol < 16 && tileRow >= 0 && tileRow < 16) {
      const clickedIdx = bankOffset + (tileRow * 16 + tileCol);
      setActiveTileIdx(clickedIdx);
      onSelectForEdit(clickedIdx);
    }
  };

  const handleCopyTile = () => {
    if (tiles[activeTileIdx]) {
      setCopiedTile(new Uint8Array(tiles[activeTileIdx]));
    }
  };

  const handlePasteTile = () => {
    if (!copiedTile) return;
    setTiles((prev) => {
      const next = prev.map((t) => new Uint8Array(t));
      next[activeTileIdx] = new Uint8Array(copiedTile);
      return next;
    });
  };

  const handleStampPreset = (presetPixels: number[]) => {
    setTiles((prev) => {
      const next = prev.map((t) => new Uint8Array(t));
      next[activeTileIdx] = new Uint8Array(presetPixels);
      return next;
    });
  };

  const handleClearTile = () => {
    setTiles((prev) => {
      const next = prev.map((t) => new Uint8Array(t));
      next[activeTileIdx] = new Uint8Array(64);
      return next;
    });
  };

  const localIdxInBank = activeTileIdx - bankOffset;
  const isSelectedInThisBank = localIdxInBank >= 0 && localIdxInBank < 256;
  const activeCol = localIdxInBank % 16;
  const activeRow = Math.floor(localIdxInBank / 16);

  return (
    <div className="flex flex-col lg:flex-row gap-5 p-4 bg-[#141620] border border-neutral-800 text-xs font-mono">
      {/* Left: 16x16 Tile Bank Grid */}
      <div className="flex flex-col gap-3 items-center">
        {/* Bank Selection Tabs */}
        <div className="flex items-center justify-between w-full max-w-[384px]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveBank(0)}
              className={`px-3 py-1.5 border transition-colors ${
                activeBank === 0
                  ? 'bg-neutral-200 text-neutral-900 border-white font-bold'
                  : 'bg-[#1b1e2c] text-neutral-400 border-neutral-700 hover:text-white'
              }`}
            >
              Pattern Table 0 ($0000-$0FFF)
            </button>
            <button
              onClick={() => setActiveBank(1)}
              className={`px-3 py-1.5 border transition-colors ${
                activeBank === 1
                  ? 'bg-neutral-200 text-neutral-900 border-white font-bold'
                  : 'bg-[#1b1e2c] text-neutral-400 border-neutral-700 hover:text-white'
              }`}
            >
              Pattern Table 1 ($1000-$1FFF)
            </button>
          </div>
        </div>

        {/* The 16x16 Canvas Frame */}
        <div className="relative p-2 bg-[#0c0d14] border-2 border-neutral-800 shadow-xl">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-[320px] sm:w-[384px] h-[320px] sm:h-[384px] cursor-pointer"
            style={{ imageRendering: 'pixelated' }}
            title="Click any 8x8 tile to edit"
          />

          {/* Selection indicator overlay */}
          {isSelectedInThisBank && (
            <div
              className="absolute pointer-events-none border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10"
              style={{
                left: `calc(8px + ${(activeCol / 16) * 100}% * (1 - 16px/100%))`,
                top: `calc(8px + ${(activeRow / 16) * 100}% * (1 - 16px/100%))`,
                width: 'calc((100% - 16px) / 16)',
                height: 'calc((100% - 16px) / 16)',
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-between w-full max-w-[384px] text-[11px] text-neutral-400">
          <span>256 Tiles / Bank · 4KB CHR</span>
          <span>Click a tile to draw or stamp</span>
        </div>
      </div>

      {/* Right: Selected Tile Actions & Preset Stamps */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Selected Tile Inspector */}
        <div className="p-3 bg-[#191c2a] border border-neutral-800 flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="font-bold text-white text-[12px]">
              SELECTED TILE #{activeTileIdx} ($
              {activeTileIdx.toString(16).toUpperCase().padStart(2, '0')})
            </span>
            <span className="text-neutral-400 text-[10px]">
              CHR Offset: ${(activeTileIdx * 16).toString(16).toUpperCase().padStart(4, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222638] border border-neutral-700 hover:border-neutral-500 text-neutral-200 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Tile</span>
            </button>

            <button
              onClick={handlePasteTile}
              disabled={!copiedTile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222638] border border-neutral-700 hover:border-neutral-500 text-neutral-200 disabled:opacity-40 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste Here</span>
            </button>

            <button
              onClick={handleClearTile}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/30 border border-red-800 hover:bg-red-900/50 text-red-300 transition-colors ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Quick Preset Stamps */}
        <div className="p-3 bg-[#191c2a] border border-neutral-800 flex flex-col gap-2.5 flex-1">
          <div className="flex items-center gap-1.5 border-b border-neutral-800 pb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white text-[12px]">
              STAMP CLASSIC 8-BIT PRESET ONTO TILE #{activeTileIdx}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-72 pr-1">
            {PRESET_TILES.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleStampPreset(preset.pixels)}
                className="flex items-center gap-2 p-2 bg-[#222638] border border-neutral-700 hover:border-red-500 hover:bg-[#2b3047] text-left transition-all group"
              >
                <div className="w-6 h-6 border border-neutral-600 bg-black flex-shrink-0 relative overflow-hidden">
                  {/* Miniature render */}
                  <div
                    className="w-full h-full"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(8, 1fr)',
                      imageRendering: 'pixelated',
                    }}
                  >
                    {preset.pixels.map((colorIdx, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          backgroundColor:
                            colorIdx === 0 && activePaletteType === 'spr'
                              ? 'transparent'
                              : subHexColors[colorIdx],
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold text-neutral-200 truncate group-hover:text-white">
                    {preset.name}
                  </span>
                  <span className="text-[9px] text-neutral-400">{preset.category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
