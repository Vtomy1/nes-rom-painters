/**
 * NES ROM Painter & Header Studio
 * Full-featured pixel art editor, CHR bank manager, iNES/NES 2.0 header builder, and test runner
 */

import React, { useState } from 'react';
import { HeaderBar } from './components/HeaderBar';
import { PixelEditor } from './components/PixelEditor';
import { PaletteSelector } from './components/PaletteSelector';
import { TileBankViewer } from './components/TileBankViewer';
import { RomHeaderEditor } from './components/RomHeaderEditor';
import { LiveNesPreview } from './components/LiveNesPreview';
import { ExportPanel } from './components/ExportPanel';

import { createDefaultTileSet } from './utils/nesChr';
import { DEFAULT_NES_PALETTE } from './utils/nesPalette';
import { DEFAULT_HEADER_CONFIG } from './utils/nesHeader';
import { buildNesRom } from './utils/nesRomBuilder';
import { INESHeaderConfig, NESPaletteConfig } from './types/nes';

export default function App() {
  const [activeTab, setActiveTab] = useState<'paint' | 'tiles' | 'header' | 'play' | 'export'>('paint');

  // Tile bank state (512 tiles = Pattern Table 0 + Pattern Table 1 = 8KB CHR)
  const [tiles, setTiles] = useState<Uint8Array[]>(() => createDefaultTileSet());
  const [activeTileIdx, setActiveTileIdx] = useState<number>(0);

  // Palette state
  const [palette, setPalette] = useState<NESPaletteConfig>(DEFAULT_NES_PALETTE);
  const [activePaletteType, setActivePaletteType] = useState<'bg' | 'spr'>('spr');
  const [activeSubpaletteIdx, setActiveSubpaletteIdx] = useState<number>(0);
  const [activeColorIndex, setActiveColorIndex] = useState<number>(1);

  // iNES / NES 2.0 Header configuration
  const [headerConfig, setHeaderConfig] = useState<INESHeaderConfig>(DEFAULT_HEADER_CONFIG);

  // Quick 1-click ROM download
  const handleQuickDownloadRom = () => {
    const romBytes = buildNesRom(headerConfig, tiles, palette, activeTileIdx);
    const blob = new Blob([romBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nes_game_m${headerConfig.mapperNumber}.nes`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0d0e15] text-[#e2e8f0] flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Bar Contract (Wordmark, Nav Links, Primary Action) */}
      <HeaderBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        headerConfig={headerConfig}
        onQuickDownloadRom={handleQuickDownloadRom}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Paint Canvas & Palette Tab */}
        {activeTab === 'paint' && (
          <div className="flex flex-col gap-6">
            <PixelEditor
              tiles={tiles}
              setTiles={setTiles}
              activeTileIdx={activeTileIdx}
              setActiveTileIdx={setActiveTileIdx}
              palette={palette}
              setPalette={setPalette}
              activePaletteType={activePaletteType}
              activeSubpaletteIdx={activeSubpaletteIdx}
              activeColorIndex={activeColorIndex}
              setActiveColorIndex={setActiveColorIndex}
            />

            <PaletteSelector
              palette={palette}
              setPalette={setPalette}
              activePaletteType={activePaletteType}
              setActivePaletteType={setActivePaletteType}
              activeSubpaletteIdx={activeSubpaletteIdx}
              setActiveSubpaletteIdx={setActiveSubpaletteIdx}
              activeColorIndex={activeColorIndex}
              setActiveColorIndex={setActiveColorIndex}
            />
          </div>
        )}

        {/* Tile Bank Viewer (CHR Pattern Tables 0 & 1) */}
        {activeTab === 'tiles' && (
          <TileBankViewer
            tiles={tiles}
            setTiles={setTiles}
            activeTileIdx={activeTileIdx}
            setActiveTileIdx={setActiveTileIdx}
            palette={palette}
            activePaletteType={activePaletteType}
            activeSubpaletteIdx={activeSubpaletteIdx}
            onSelectForEdit={(idx) => {
              setActiveTileIdx(idx);
              setActiveTab('paint');
            }}
          />
        )}

        {/* iNES & NES 2.0 ROM Header Editor */}
        {activeTab === 'header' && (
          <RomHeaderEditor
            headerConfig={headerConfig}
            setHeaderConfig={setHeaderConfig}
          />
        )}

        {/* Live NES PPU Display & Playable Runner */}
        {activeTab === 'play' && (
          <LiveNesPreview
            tiles={tiles}
            palette={palette}
            activeTileIdx={activeTileIdx}
            headerConfig={headerConfig}
          />
        )}

        {/* Export & ROM Builder */}
        {activeTab === 'export' && (
          <ExportPanel
            headerConfig={headerConfig}
            setHeaderConfig={setHeaderConfig}
            tiles={tiles}
            setTiles={setTiles}
            palette={palette}
            setPalette={setPalette}
            activeTileIdx={activeTileIdx}
          />
        )}
      </main>

      {/* Clean Bottom Footer */}
      <footer className="mt-auto border-t border-neutral-800/80 px-6 py-4 bg-[#0a0b10] text-[11px] font-mono text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>NES ROM PAINTER & HEADER STUDIO</span>
          <span aria-hidden="true">·</span>
          <span>iNES 1.0 & NES 2.0 COMPLIANT</span>
          <span aria-hidden="true">·</span>
          <span>2C02 PPU COLOR ENGINE</span>
        </div>
        <div>
          Compatible with Mesen, FCEUX, Nestopia, RetroArch, EverDrive N8
        </div>
      </footer>
    </div>
  );
}
