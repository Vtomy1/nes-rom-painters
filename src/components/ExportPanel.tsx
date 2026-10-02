import React, { useState, useRef } from 'react';
import { INESHeaderConfig, NESPaletteConfig } from '../types/nes';
import {
  buildNesRom,
  exportToCa65Asm,
  exportToCHeader,
} from '../utils/nesRomBuilder';
import {
  encodePatternTablesToChrRom,
  decodeChrRomToTiles,
} from '../utils/nesChr';
import { parseInesHeaderBytes } from '../utils/nesHeader';
import {
  Download,
  FileCode,
  FileText,
  Image,
  Upload,
  Check,
  Cpu,
  Layers,
} from 'lucide-react';

interface ExportPanelProps {
  headerConfig: INESHeaderConfig;
  setHeaderConfig: React.Dispatch<React.SetStateAction<INESHeaderConfig>>;
  tiles: Uint8Array[];
  setTiles: React.Dispatch<React.SetStateAction<Uint8Array[]>>;
  palette: NESPaletteConfig;
  setPalette: React.Dispatch<React.SetStateAction<NESPaletteConfig>>;
  activeTileIdx: number;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  headerConfig,
  setHeaderConfig,
  tiles,
  setTiles,
  palette,
  setPalette,
  activeTileIdx,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const romFileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Download .NES ROM
  const handleDownloadNesRom = () => {
    const romBytes = buildNesRom(headerConfig, tiles, palette, activeTileIdx);
    const blob = new Blob([romBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nes_game_m${headerConfig.mapperNumber}.nes`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 2. Download .CHR File (8KB)
  const handleDownloadChr = () => {
    const chrBytes = encodePatternTablesToChrRom(tiles);
    const blob = new Blob([chrBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graphics.chr';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 3. Download .PAL File (32 bytes)
  const handleDownloadPal = () => {
    const palBytes = new Uint8Array([
      palette.universalBg, palette.bg[0][0], palette.bg[0][1], palette.bg[0][2],
      palette.universalBg, palette.bg[1][0], palette.bg[1][1], palette.bg[1][2],
      palette.universalBg, palette.bg[2][0], palette.bg[2][1], palette.bg[2][2],
      palette.universalBg, palette.bg[3][0], palette.bg[3][1], palette.bg[3][2],
      palette.universalBg, palette.spr[0][0], palette.spr[0][1], palette.spr[0][2],
      palette.universalBg, palette.spr[1][0], palette.spr[1][1], palette.spr[1][2],
      palette.universalBg, palette.spr[2][0], palette.spr[2][1], palette.spr[2][2],
      palette.universalBg, palette.spr[3][0], palette.spr[3][1], palette.spr[3][2],
    ]);
    const blob = new Blob([palBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palette.pal';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 4. Download Assembly (.asm)
  const handleDownloadAsm = () => {
    const asmContent = exportToCa65Asm(headerConfig, tiles, palette);
    const blob = new Blob([asmContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nes_graphics.asm';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 5. Download C Header (.h)
  const handleDownloadCHeader = () => {
    const cContent = exportToCHeader(tiles, palette);
    const blob = new Blob([cContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nes_graphics.h';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 6. Import existing .nes or .chr
  const handleRomFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return;
      const bytes = new Uint8Array(buffer);

      try {
        if (file.name.toLowerCase().endsWith('.chr') || bytes.length === 8192 || bytes.length === 4096) {
          // Pure CHR import
          const decoded = decodeChrRomToTiles(bytes);
          setTiles(decoded);
          setImportStatus(`Successfully loaded CHR file: ${decoded.length} tiles`);
        } else {
          // Parse .nes ROM
          const parsedHeader = parseInesHeaderBytes(bytes);
          setHeaderConfig(parsedHeader);

          // Locate CHR ROM offset
          const trainerSize = parsedHeader.hasTrainer ? 512 : 0;
          const prgSize = parsedHeader.prgRomSize16K * 16384;
          const chrOffset = 16 + trainerSize + prgSize;

          if (bytes.length >= chrOffset + 16) {
            const chrData = bytes.slice(chrOffset);
            const decoded = decodeChrRomToTiles(chrData);
            setTiles(decoded);
            setImportStatus(`Loaded .NES ROM: Mapper ${parsedHeader.mapperNumber}, ${parsedHeader.prgRomSize16K * 16}K PRG, extracted CHR tiles`);
          } else {
            setImportStatus(`Loaded .NES ROM Header: Mapper ${parsedHeader.mapperNumber} (ROM uses CHR-RAM)`);
          }
        }
      } catch (err: any) {
        setImportStatus(`Import Error: ${err.message || 'Invalid NES file'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="flex flex-col gap-5 p-5 bg-[#141620] border border-neutral-800 text-xs font-mono">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">
            NES ROM COMPILATION & GRAPHICS EXPORT
          </h2>
          <p className="text-[11px] text-neutral-400">
            Generate authentic ROM binaries, CHR files, assembly source, and C arrays.
          </p>
        </div>
      </div>

      {/* Grid of Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: .NES Playable ROM */}
        <div className="p-4 bg-[#191c2a] border-2 border-red-900/60 hover:border-red-600 transition-colors flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-[13px] flex items-center gap-1.5">
              <Download className="w-4 h-4 text-red-500" />
              <span>Full .NES Playable ROM</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase">Ready</span>
          </div>

          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Assembles the 16-byte iNES header, 6502 machine code PRG-ROM with NMI loop, and the 8KB CHR-ROM tiles into a standard .nes file.
          </p>

          <div className="p-2 bg-[#0e1017] border border-neutral-800 text-[10px] text-neutral-300">
            <div>• Header: 16 bytes (Mapper {headerConfig.mapperNumber})</div>
            <div>• PRG-ROM: {headerConfig.prgRomSize16K * 16} KB (6502 test binary)</div>
            <div>• CHR-ROM: {headerConfig.chrRomSize8K > 0 ? `${headerConfig.chrRomSize8K * 8} KB` : 'CHR-RAM'}</div>
          </div>

          <button
            onClick={handleDownloadNesRom}
            className="w-full mt-auto py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(220,38,38,0.4)] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .nes ROM</span>
          </button>
        </div>

        {/* Card 2: .CHR Binary (Pattern Tables) */}
        <div className="p-4 bg-[#191c2a] border border-neutral-800 hover:border-neutral-600 transition-colors flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-[13px] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Raw .CHR Pattern Tables</span>
            </span>
            <span className="text-[10px] text-neutral-400">8192 Bytes</span>
          </div>

          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Raw 8KB binary of 512 tiles encoded in NES 2-bitplane format (16 bytes per 8x8 tile). Load directly into YY-CHR, NES Screen Tool, or ASM projects.
          </p>

          <button
            onClick={handleDownloadChr}
            className="w-full mt-auto py-2 bg-[#252a3d] hover:bg-[#2f354d] text-white font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download graphics.chr</span>
          </button>
        </div>

        {/* Card 3: NES Palette (.pal) */}
        <div className="p-4 bg-[#191c2a] border border-neutral-800 hover:border-neutral-600 transition-colors flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-[13px] flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full bg-amber-400" />
              <span>Palette Data (.pal)</span>
            </span>
            <span className="text-[10px] text-neutral-400">32 Bytes</span>
          </div>

          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Raw 32-byte PPU palette RAM dump ($3F00-$3F1F) containing universal background color, 4 BG subpalettes, and 4 sprite subpalettes.
          </p>

          <button
            onClick={handleDownloadPal}
            className="w-full mt-auto py-2 bg-[#252a3d] hover:bg-[#2f354d] text-white font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download palette.pal</span>
          </button>
        </div>

        {/* Card 4: 6502 Assembly Code (.asm) */}
        <div className="p-4 bg-[#191c2a] border border-neutral-800 hover:border-neutral-600 transition-colors flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-[13px] flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-purple-400" />
              <span>ca65 / NESASM Assembly</span>
            </span>
            <span className="text-[10px] text-neutral-400">.asm</span>
          </div>

          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Source code directives: `.segment "HEADER"` with your configured header bytes, `.byte` palette definitions, and tile definitions.
          </p>

          <div className="flex items-center gap-2 mt-auto">
            <button
              onClick={() => copyToClipboard(exportToCa65Asm(headerConfig, tiles, palette), 'asm')}
              className="flex-1 py-1.5 bg-[#252a3d] hover:bg-[#2f354d] text-neutral-200 font-semibold border border-neutral-700 text-[11px]"
            >
              {copiedType === 'asm' ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={handleDownloadAsm}
              className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-[11px]"
            >
              Download .asm
            </button>
          </div>
        </div>

        {/* Card 5: C Header (.h) for cc65 / neslib */}
        <div className="p-4 bg-[#191c2a] border border-neutral-800 hover:border-neutral-600 transition-colors flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-[13px] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>C Header (.h) for cc65</span>
            </span>
            <span className="text-[10px] text-neutral-400">neslib</span>
          </div>

          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Ready-to-compile C arrays `const unsigned char PALETTE_DATA[32]` and `TILE_DATA[]` for modern NES development in C.
          </p>

          <div className="flex items-center gap-2 mt-auto">
            <button
              onClick={() => copyToClipboard(exportToCHeader(tiles, palette), 'c')}
              className="flex-1 py-1.5 bg-[#252a3d] hover:bg-[#2f354d] text-neutral-200 font-semibold border border-neutral-700 text-[11px]"
            >
              {copiedType === 'c' ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={handleDownloadCHeader}
              className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-[11px]"
            >
              Download .h
            </button>
          </div>
        </div>

        {/* Card 6: Import Existing .NES or .CHR */}
        <div className="p-4 bg-[#191c2a] border border-neutral-800 hover:border-neutral-600 transition-colors flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-[13px] flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Import .NES ROM or .CHR</span>
            </span>
          </div>

          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Load an existing NES ROM to inspect its 16-byte header and extract its CHR tile pattern tables directly into the paint canvas.
          </p>

          {importStatus && (
            <div className="p-2 bg-[#0e1017] border border-neutral-700 text-[10px] text-amber-300">
              {importStatus}
            </div>
          )}

          <div className="mt-auto">
            <input
              ref={romFileInputRef}
              type="file"
              accept=".nes, .chr, .bin"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleRomFileImport(e.target.files[0]);
                }
              }}
            />
            <button
              onClick={() => romFileInputRef.current?.click()}
              className="w-full py-2 bg-[#252a3d] hover:bg-[#2f354d] text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 border border-neutral-700 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Select .NES or .CHR File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
