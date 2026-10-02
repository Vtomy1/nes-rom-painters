import React, { useState } from 'react';
import {
  NES_MASTER_PALETTE,
  PALETTE_NAMES_64,
  nesIndexToHex,
  PRESET_THEMES,
} from '../utils/nesPalette';
import { NESPaletteConfig } from '../types/nes';
import { Sparkles, X } from 'lucide-react';

interface PaletteSelectorProps {
  palette: NESPaletteConfig;
  setPalette: React.Dispatch<React.SetStateAction<NESPaletteConfig>>;
  activePaletteType: 'bg' | 'spr';
  setActivePaletteType: (type: 'bg' | 'spr') => void;
  activeSubpaletteIdx: number;
  setActiveSubpaletteIdx: (idx: number) => void;
  activeColorIndex: number; // 0, 1, 2, 3
  setActiveColorIndex: (idx: number) => void;
}

export const PaletteSelector: React.FC<PaletteSelectorProps> = ({
  palette,
  setPalette,
  activePaletteType,
  setActivePaletteType,
  activeSubpaletteIdx,
  setActiveSubpaletteIdx,
  activeColorIndex,
  setActiveColorIndex,
}) => {
  // Master palette picker modal state
  const [editingTarget, setEditingTarget] = useState<{
    type: 'universal' | 'bg' | 'spr';
    subIdx?: number;
    colorSlot?: number; // 0, 1, 2
  } | null>(null);

  const handleApplyPreset = (presetTheme: NESPaletteConfig) => {
    setPalette(JSON.parse(JSON.stringify(presetTheme)));
  };

  const handleSelectMasterColor = (masterIdx: number) => {
    if (!editingTarget) return;

    setPalette((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as NESPaletteConfig;
      if (editingTarget.type === 'universal') {
        next.universalBg = masterIdx;
      } else if (editingTarget.type === 'bg' && editingTarget.subIdx !== undefined && editingTarget.colorSlot !== undefined) {
        next.bg[editingTarget.subIdx][editingTarget.colorSlot] = masterIdx;
      } else if (editingTarget.type === 'spr' && editingTarget.subIdx !== undefined && editingTarget.colorSlot !== undefined) {
        next.spr[editingTarget.subIdx][editingTarget.colorSlot] = masterIdx;
      }
      return next;
    });

    setEditingTarget(null);
  };

  // Get current subpalette colors (4 entries: [universalBg, c1, c2, c3])
  const currentSub = activePaletteType === 'bg'
    ? palette.bg[activeSubpaletteIdx]
    : palette.spr[activeSubpaletteIdx];

  const currentFourHex = [
    nesIndexToHex(palette.universalBg),
    nesIndexToHex(currentSub[0]),
    nesIndexToHex(currentSub[1]),
    nesIndexToHex(currentSub[2]),
  ];

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#14161f] border border-neutral-800 text-xs font-mono">
      {/* Top row: Palette Mode & Theme Presets */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400 font-semibold tracking-wider uppercase text-[11px]">
            NES PALETTES
          </span>
          <span className="text-[10px] text-neutral-500">(2C02 PPU)</span>
        </div>

        {/* Theme presets dropdown */}
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <select
            onChange={(e) => {
              const theme = PRESET_THEMES.find((t) => t.name === e.target.value);
              if (theme) handleApplyPreset(theme.palette);
            }}
            defaultValue=""
            className="bg-[#1e2230] border border-neutral-700 text-neutral-300 text-[11px] px-2 py-1 outline-none cursor-pointer hover:border-neutral-500"
          >
            <option value="" disabled>Load Palette Preset...</option>
            {PRESET_THEMES.map((theme) => (
              <option key={theme.name} value={theme.name}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Universal Background Color ($3F00) */}
      <div className="flex items-center justify-between py-1 px-2 bg-[#1b1e2b] border border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-neutral-300 font-medium">Universal BG ($3F00):</span>
          <span className="text-neutral-500 text-[10px]">
            ${palette.universalBg.toString(16).toUpperCase().padStart(2, '0')}
          </span>
        </div>
        <button
          onClick={() => setEditingTarget({ type: 'universal' })}
          className="w-7 h-5 border border-neutral-600 hover:border-white transition-transform active:scale-95 shadow-inner"
          style={{ backgroundColor: nesIndexToHex(palette.universalBg) }}
          title={`Click to change Universal Background ($${palette.universalBg.toString(16).toUpperCase().padStart(2, '0')})`}
        />
      </div>

      {/* Background vs Sprite Palettes Tabs */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setActivePaletteType('bg')}
          className={`px-3 py-1 text-[11px] transition-colors ${
            activePaletteType === 'bg'
              ? 'bg-neutral-200 text-neutral-900 font-bold'
              : 'bg-[#1b1e2b] text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          BG Palettes ($3F00)
        </button>
        <button
          onClick={() => setActivePaletteType('spr')}
          className={`px-3 py-1 text-[11px] transition-colors ${
            activePaletteType === 'spr'
              ? 'bg-neutral-200 text-neutral-900 font-bold'
              : 'bg-[#1b1e2b] text-neutral-400 hover:text-white border border-neutral-800'
          }`}
        >
          Sprite Palettes ($3F10)
        </button>
      </div>

      {/* The 4 Subpalettes list */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((subIdx) => {
          const isSelected = activeSubpaletteIdx === subIdx;
          const sub = activePaletteType === 'bg' ? palette.bg[subIdx] : palette.spr[subIdx];

          return (
            <div
              key={subIdx}
              onClick={() => setActiveSubpaletteIdx(subIdx)}
              className={`p-2 border transition-all cursor-pointer ${
                isSelected
                  ? 'border-red-500 bg-[#212638] shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                  : 'border-neutral-800 bg-[#161924] hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-300">
                  {activePaletteType.toUpperCase()} #{subIdx}
                </span>
                {isSelected && (
                  <span className="text-[9px] text-red-400 font-bold uppercase">Active</span>
                )}
              </div>

              {/* 4 Swatches: [0=BG/transp, 1, 2, 3] */}
              <div className="grid grid-cols-4 gap-1">
                {/* Slot 0: Universal BG */}
                <div
                  className="h-6 border border-neutral-700/80 relative"
                  style={{ backgroundColor: nesIndexToHex(palette.universalBg) }}
                  title="Slot 0: Universal BG"
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/50 font-sans">
                    0
                  </span>
                </div>

                {/* Slots 1, 2, 3 */}
                {[0, 1, 2].map((slotIdx) => {
                  const masterIdx = sub[slotIdx];
                  const hex = nesIndexToHex(masterIdx);
                  return (
                    <button
                      key={slotIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSubpaletteIdx(subIdx);
                        setEditingTarget({
                          type: activePaletteType,
                          subIdx,
                          colorSlot: slotIdx,
                        });
                      }}
                      className="h-6 border border-neutral-700 hover:border-white transition-all relative group"
                      style={{ backgroundColor: hex }}
                      title={`Slot ${slotIdx + 1}: $${masterIdx.toString(16).toUpperCase().padStart(2, '0')}. Click to edit color.`}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/70 font-sans group-hover:scale-110">
                        {slotIdx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Paint Color Picker (0, 1, 2, 3) */}
      <div className="mt-2 pt-3 border-t border-neutral-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-neutral-300 font-semibold">
            ACTIVE DRAWING COLOR:
          </span>
          <span className="text-[10px] text-neutral-400">
            Index {activeColorIndex} ({activeColorIndex === 0 ? (activePaletteType === 'spr' ? 'Transparent' : 'BG Color') : `Color ${activeColorIndex}`})
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((colorIdx) => {
            const isSelected = activeColorIndex === colorIdx;
            const hex = currentFourHex[colorIdx];
            const isTransparent = activePaletteType === 'spr' && colorIdx === 0;

            return (
              <button
                key={colorIdx}
                onClick={() => setActiveColorIndex(colorIdx)}
                className={`flex flex-col items-center gap-1.5 p-2 border transition-all ${
                  isSelected
                    ? 'border-red-500 bg-red-950/20 scale-[1.02]'
                    : 'border-neutral-800 bg-[#161924] hover:border-neutral-700'
                }`}
              >
                <div
                  className={`w-full h-8 border ${
                    isSelected ? 'border-white' : 'border-neutral-700'
                  } relative overflow-hidden`}
                  style={{ backgroundColor: isTransparent ? 'transparent' : hex }}
                >
                  {isTransparent && (
                    <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:4px_4px] bg-[#111]" />
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-white pointer-events-none" />
                  )}
                </div>

                <div className="flex items-center justify-between w-full text-[10px]">
                  <span className="font-bold text-neutral-300">
                    {colorIdx === 0 ? 'CLR 0' : `CLR ${colorIdx}`}
                  </span>
                  <span className="text-neutral-500">
                    {isTransparent ? 'TRANS' : hex}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 64-Color Master Palette Modal / Popover */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#141622] border border-neutral-700 max-w-xl w-full p-5 shadow-2xl flex flex-col gap-4 font-mono">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  SELECT NES 2C02 COLOR
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Target:{' '}
                  {editingTarget.type === 'universal'
                    ? 'Universal Background ($3F00)'
                    : `${editingTarget.type.toUpperCase()} #${editingTarget.subIdx} Slot ${editingTarget.colorSlot! + 1}`}
                </p>
              </div>
              <button
                onClick={() => setEditingTarget(null)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 64 Swatches Grid (4 rows of 16 columns) */}
            <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 bg-[#0c0d14] p-2.5 border border-neutral-800">
              {NES_MASTER_PALETTE.map((hex, masterIdx) => {
                return (
                  <button
                    key={masterIdx}
                    onClick={() => handleSelectMasterColor(masterIdx)}
                    className="w-full aspect-square border border-neutral-800 hover:border-white hover:scale-125 transition-transform relative group"
                    style={{ backgroundColor: hex }}
                    title={`${PALETTE_NAMES_64[masterIdx]} ($${masterIdx.toString(16).toUpperCase().padStart(2, '0')})`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-1 py-0.5 pointer-events-none whitespace-nowrap z-20 border border-neutral-700">
                      ${masterIdx.toString(16).toUpperCase().padStart(2, '0')}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
              <span>Authentic Nintendo 2C02 Composite Color Generation</span>
              <button
                onClick={() => setEditingTarget(null)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
