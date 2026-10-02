import React from 'react';
import { Download, Play, Cpu, Layers, Palette } from 'lucide-react';
import { INESHeaderConfig } from '../types/nes';

interface HeaderBarProps {
  activeTab: 'paint' | 'tiles' | 'header' | 'play' | 'export';
  setActiveTab: (tab: 'paint' | 'tiles' | 'header' | 'play' | 'export') => void;
  headerConfig: INESHeaderConfig;
  onQuickDownloadRom: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  setActiveTab,
  headerConfig,
  onQuickDownloadRom,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800 bg-[#0c0d12] shrink-0 select-none">
      {/* Zone 1: Single text element wordmark in retro display styling */}
      <div className="flex items-center gap-3">
        <a
          href="#paint"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('paint');
          }}
          className="text-base font-bold tracking-tight text-white flex items-center gap-2.5 hover:text-red-400 transition-colors font-mono"
        >
          <span className="w-2.5 h-2.5 bg-red-600 rounded-none shadow-[0_0_8px_rgba(220,38,38,0.8)] inline-block"></span>
          <span>NES ROM PAINTER & HEADER STUDIO</span>
        </a>
      </div>

      {/* Zone 2: 5 clean navigation links with active state */}
      <nav className="hidden md:flex items-center gap-2 text-xs font-mono font-medium">
        <button
          onClick={() => setActiveTab('paint')}
          className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border-b-2 ${
            activeTab === 'paint'
              ? 'border-red-500 text-white bg-red-500/10'
              : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Paint Canvas</span>
        </button>

        <button
          onClick={() => setActiveTab('tiles')}
          className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border-b-2 ${
            activeTab === 'tiles'
              ? 'border-red-500 text-white bg-red-500/10'
              : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tile Bank (CHR)</span>
        </button>

        <button
          onClick={() => setActiveTab('header')}
          className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border-b-2 ${
            activeTab === 'header'
              ? 'border-red-500 text-white bg-red-500/10'
              : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>ROM Header (iNES)</span>
        </button>

        <button
          onClick={() => setActiveTab('play')}
          className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border-b-2 ${
            activeTab === 'play'
              ? 'border-red-500 text-white bg-red-500/10'
              : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Play & Test</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors border-b-2 ${
            activeTab === 'export'
              ? 'border-red-500 text-white bg-red-500/10'
              : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export & ASM</span>
        </button>
      </nav>

      {/* Zone 3: Primary action button with ROM specs */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-neutral-400">
          <span>Map {headerConfig.mapperNumber}</span>
          <span aria-hidden="true">·</span>
          <span>{headerConfig.prgRomSize16K * 16}K PRG</span>
          <span aria-hidden="true">·</span>
          <span>{headerConfig.chrRomSize8K > 0 ? `${headerConfig.chrRomSize8K * 8}K CHR` : 'CHR-RAM'}</span>
        </div>

        <button
          onClick={onQuickDownloadRom}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-medium text-white bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors whitespace-nowrap shadow-[0_0_12px_rgba(220,38,38,0.4)]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Build .NES</span>
        </button>
      </div>
    </header>
  );
};
