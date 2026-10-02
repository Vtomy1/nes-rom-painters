import React, { useState } from 'react';
import { INESHeaderConfig, HeaderByteAnnotation } from '../types/nes';
import {
  CLASSIC_MAPPERS,
  generateInesHeaderBytes,
  annotateHeaderBytes,
  formatHexDump,
} from '../utils/nesHeader';
import { Cpu, Check, Copy, Download, Info } from 'lucide-react';

interface RomHeaderEditorProps {
  headerConfig: INESHeaderConfig;
  setHeaderConfig: React.Dispatch<React.SetStateAction<INESHeaderConfig>>;
}

export const RomHeaderEditor: React.FC<RomHeaderEditorProps> = ({
  headerConfig,
  setHeaderConfig,
}) => {
  const [selectedByteOffset, setSelectedByteOffset] = useState<number>(4);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const headerBytes = generateInesHeaderBytes(headerConfig);
  const annotations = annotateHeaderBytes(headerBytes, headerConfig);
  const currentAnnotation = annotations[selectedByteOffset] || annotations[0];

  const handleCopyHex = () => {
    const hexStr = Array.from(headerBytes)
      .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');
    navigator.clipboard.writeText(hexStr);
    setCopiedNotification('Hex bytes copied to clipboard');
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  const handleCopyCStruct = () => {
    const cCode = `/* 16-byte iNES Header */
const unsigned char INES_HEADER[16] = {
  ${Array.from(headerBytes).map((b) => `0x${b.toString(16).toUpperCase().padStart(2, '0')}`).join(', ')}
};`;
    navigator.clipboard.writeText(cCode);
    setCopiedNotification('C Header code copied');
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  const handleDownloadHdr = () => {
    const blob = new Blob([headerBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nes_header_mapper${headerConfig.mapperNumber}.hdr`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyPresetMapper = (presetId: number) => {
    const preset = CLASSIC_MAPPERS.find((m) => m.id === presetId);
    if (!preset) return;

    setHeaderConfig((prev) => ({
      ...prev,
      mapperNumber: preset.id,
      prgRomSize16K: preset.defaultPrg16K,
      chrRomSize8K: preset.defaultChr8K,
      mirroring: preset.defaultMirroring,
    }));
  };

  return (
    <div className="flex flex-col gap-5 p-5 bg-[#141620] border border-neutral-800 text-xs font-mono">
      {/* Top Header & Format Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-red-500" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              iNES / NES 2.0 ROM HEADER BUILDER & INSPECTOR
            </h2>
            <p className="text-[11px] text-neutral-400">
              Configures the 16-byte container header read by emulators and flashcarts.
            </p>
          </div>
        </div>

        {/* Format Selector: iNES 1.0 vs NES 2.0 */}
        <div className="flex items-center gap-1 p-1 bg-[#1a1d2c] border border-neutral-700">
          <button
            onClick={() => setHeaderConfig((prev) => ({ ...prev, isNes2: false }))}
            className={`px-3 py-1 transition-colors ${
              !headerConfig.isNes2
                ? 'bg-red-600 text-white font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            iNES 1.0 (Standard)
          </button>
          <button
            onClick={() => setHeaderConfig((prev) => ({ ...prev, isNes2: true }))}
            className={`px-3 py-1 transition-colors ${
              headerConfig.isNes2
                ? 'bg-red-600 text-white font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            NES 2.0 (Extended)
          </button>
        </div>
      </div>

      {/* 16-Byte Interactive Visual Hex Dump Strip */}
      <div className="flex flex-col gap-2 p-3 bg-[#0d0e14] border border-neutral-800">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span className="font-semibold text-neutral-300">
            16-BYTE HEADER HEURISTIC DUMP (Click any byte to inspect):
          </span>
          <div className="flex items-center gap-2">
            {copiedNotification && (
              <span className="text-emerald-400 text-[10px] animate-pulse">
                {copiedNotification}
              </span>
            )}
            <button
              onClick={handleCopyHex}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#1e2230] border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors"
              title="Copy Hex"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Hex</span>
            </button>
            <button
              onClick={handleCopyCStruct}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#1e2230] border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors"
              title="Copy C Array"
            >
              <span>Copy C</span>
            </button>
            <button
              onClick={handleDownloadHdr}
              className="flex items-center gap-1 px-2 py-0.5 bg-[#1e2230] border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors"
              title="Download 16-byte raw header"
            >
              <Download className="w-3 h-3" />
              <span>.hdr</span>
            </button>
          </div>
        </div>

        {/* 16-byte cells */}
        <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 pt-1">
          {annotations.map((ann) => {
            const isSelected = selectedByteOffset === ann.offset;
            return (
              <button
                key={ann.offset}
                onClick={() => setSelectedByteOffset(ann.offset)}
                className={`flex flex-col items-center justify-center p-2 border transition-all relative ${
                  isSelected
                    ? 'border-red-500 bg-red-950/40 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] scale-105 z-10'
                    : 'border-neutral-800 bg-[#161824] text-neutral-300 hover:border-neutral-600'
                }`}
              >
                <span className="text-[9px] text-neutral-500 mb-0.5">
                  +{ann.offset.toString(16).toUpperCase()}
                </span>
                <span className="text-[13px] font-bold font-mono text-amber-300">
                  {ann.byteValue.toString(16).toUpperCase().padStart(2, '0')}
                </span>
                <span className="text-[8px] text-neutral-400 mt-0.5 truncate max-w-full">
                  {ann.offset < 4 ? 'MAGIC' : ann.offset === 4 ? 'PRG' : ann.offset === 5 ? 'CHR' : `F${ann.offset}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Text representation */}
        <div className="mt-1 pt-2 border-t border-neutral-800 text-[11px] text-neutral-500 font-mono">
          {formatHexDump(headerBytes)}
        </div>
      </div>

      {/* Selected Byte Inspector Panel */}
      <div className="p-4 bg-[#181b28] border border-neutral-700 flex flex-col gap-2.5">
        <div className="flex items-center justify-between border-b border-neutral-700/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-red-600 text-white font-bold text-[11px]">
              BYTE +${selectedByteOffset.toString(16).toUpperCase().padStart(2, '0')}
            </span>
            <span className="font-bold text-white text-[13px]">
              {currentAnnotation.name} ({currentAnnotation.hex})
            </span>
          </div>
          <span className="text-neutral-400 text-[11px]">
            Binary: %{currentAnnotation.byteValue.toString(2).padStart(8, '0')} · Decimal: {currentAnnotation.byteValue}
          </span>
        </div>

        <p className="text-neutral-300 text-[12px] leading-relaxed">
          {currentAnnotation.description}
        </p>

        {/* Bit breakdown table if byte has bitfields */}
        {currentAnnotation.bitsMeaning && (
          <div className="mt-2 border border-neutral-800 bg-[#0f1118] p-2.5 flex flex-col gap-1.5">
            <span className="text-[10px] text-neutral-400 font-semibold uppercase">
              BITFIELD BREAKDOWN (D7 .. D0):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentAnnotation.bitsMeaning.map((bit, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 p-1.5 border text-[11px] ${
                    bit.active
                      ? 'border-emerald-600/60 bg-emerald-950/20 text-emerald-300'
                      : 'border-neutral-800 bg-[#141620] text-neutral-400'
                  }`}
                >
                  <span className="font-bold w-12 text-neutral-300">{bit.bit}</span>
                  <span className="flex-1 truncate">{bit.meaning}</span>
                  {bit.active ? (
                    <span className="text-[9px] px-1 bg-emerald-600 text-white font-bold">1</span>
                  ) : (
                    <span className="text-[9px] px-1 bg-neutral-800 text-neutral-400 font-bold">0</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card: Mapper Presets & Number */}
        <div className="p-4 bg-[#181b28] border border-neutral-800 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="font-bold text-white text-[12px]">
              MAPPER SELECTION (iNES Mapper ID)
            </span>
            <span className="text-neutral-400 text-[11px]">
              Active: Mapper {headerConfig.mapperNumber}
            </span>
          </div>

          {/* Quick Mapper Preset Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {CLASSIC_MAPPERS.map((mapper) => (
              <button
                key={mapper.id}
                onClick={() => handleApplyPresetMapper(mapper.id)}
                className={`p-2 border text-left transition-all ${
                  headerConfig.mapperNumber === mapper.id
                    ? 'border-red-500 bg-red-950/30 text-white'
                    : 'border-neutral-700 bg-[#212536] text-neutral-300 hover:border-neutral-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px]">Map {mapper.id}</span>
                  {headerConfig.mapperNumber === mapper.id && (
                    <Check className="w-3 h-3 text-red-400" />
                  )}
                </div>
                <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                  {mapper.name.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>

          {/* Custom Mapper Input */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
            <label className="text-neutral-300 text-[11px]">Custom Mapper ID (0-255):</label>
            <input
              type="number"
              min="0"
              max="255"
              value={headerConfig.mapperNumber}
              onChange={(e) => {
                const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                setHeaderConfig((prev) => ({ ...prev, mapperNumber: val }));
              }}
              className="w-20 bg-[#0f1118] border border-neutral-700 text-white text-[12px] px-2 py-1 font-mono text-right"
            />
          </div>

          {headerConfig.isNes2 && (
            <div className="flex items-center justify-between">
              <label className="text-neutral-300 text-[11px]">NES 2.0 Submapper (0-15):</label>
              <input
                type="number"
                min="0"
                max="15"
                value={headerConfig.submapper}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(15, parseInt(e.target.value) || 0));
                  setHeaderConfig((prev) => ({ ...prev, submapper: val }));
                }}
                className="w-20 bg-[#0f1118] border border-neutral-700 text-white text-[12px] px-2 py-1 font-mono text-right"
              />
            </div>
          )}
        </div>

        {/* Right Card: PRG-ROM & CHR-ROM Sizes */}
        <div className="p-4 bg-[#181b28] border border-neutral-800 flex flex-col gap-3">
          <div className="border-b border-neutral-800 pb-2">
            <span className="font-bold text-white text-[12px]">
              ROM SIZE CONFIGURATION
            </span>
          </div>

          {/* PRG-ROM (16KB units) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-300 font-semibold">PRG-ROM Size:</span>
              <span className="text-amber-300 font-bold">
                {headerConfig.prgRomSize16K * 16} KB ({headerConfig.prgRomSize16K} × 16KB units)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: '16 KB', val: 1 },
                { label: '32 KB', val: 2 },
                { label: '64 KB', val: 4 },
                { label: '128 KB', val: 8 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setHeaderConfig((prev) => ({ ...prev, prgRomSize16K: opt.val }))}
                  className={`py-1 text-[11px] border transition-colors ${
                    headerConfig.prgRomSize16K === opt.val
                      ? 'bg-neutral-200 text-neutral-900 border-white font-bold'
                      : 'bg-[#212536] text-neutral-400 border-neutral-700 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* CHR-ROM (8KB units) */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-300 font-semibold">CHR-ROM Size:</span>
              <span className="text-amber-300 font-bold">
                {headerConfig.chrRomSize8K === 0
                  ? '0 KB (CHR-RAM)'
                  : `${headerConfig.chrRomSize8K * 8} KB (${headerConfig.chrRomSize8K} × 8KB units)`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: 'CHR-RAM', val: 0 },
                { label: '8 KB', val: 1 },
                { label: '16 KB', val: 2 },
                { label: '32 KB', val: 4 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setHeaderConfig((prev) => ({ ...prev, chrRomSize8K: opt.val }))}
                  className={`py-1 text-[11px] border transition-colors ${
                    headerConfig.chrRomSize8K === opt.val
                      ? 'bg-neutral-200 text-neutral-900 border-white font-bold'
                      : 'bg-[#212536] text-neutral-400 border-neutral-700 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Left Bottom Card: Mirroring & Hardware Flags */}
        <div className="p-4 bg-[#181b28] border border-neutral-800 flex flex-col gap-3">
          <div className="border-b border-neutral-800 pb-2">
            <span className="font-bold text-white text-[12px]">
              NAMETABLE MIRRORING & HARDWARE
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-neutral-400 font-medium">Mirroring Mode:</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'horizontal', label: 'Horizontal (Vert Scroll)' },
                { id: 'vertical', label: 'Vertical (Horiz Scroll)' },
                { id: 'four_screen', label: 'Four-Screen VRAM' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() =>
                    setHeaderConfig((prev) => ({
                      ...prev,
                      mirroring: m.id as 'horizontal' | 'vertical' | 'four_screen',
                    }))
                  }
                  className={`py-1.5 px-1 text-[10px] border text-center transition-colors ${
                    headerConfig.mirroring === m.id
                      ? 'bg-neutral-200 text-neutral-900 border-white font-bold'
                      : 'bg-[#212536] text-neutral-400 border-neutral-700 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
            <label className="flex items-center gap-2 text-neutral-300 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={headerConfig.hasBattery}
                onChange={(e) =>
                  setHeaderConfig((prev) => ({ ...prev, hasBattery: e.target.checked }))
                }
                className="accent-red-600"
              />
              <span>Battery-Backed PRG-RAM ($6000-$7FFF Save Circuit)</span>
            </label>

            <label className="flex items-center gap-2 text-neutral-300 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={headerConfig.hasTrainer}
                onChange={(e) =>
                  setHeaderConfig((prev) => ({ ...prev, hasTrainer: e.target.checked }))
                }
                className="accent-red-600"
              />
              <span>512-byte Trainer Present ($7000-$71FF)</span>
            </label>
          </div>
        </div>

        {/* Right Bottom Card: Region & Console Mode */}
        <div className="p-4 bg-[#181b28] border border-neutral-800 flex flex-col gap-3">
          <div className="border-b border-neutral-800 pb-2">
            <span className="font-bold text-white text-[12px]">
              TV SYSTEM & SPECIAL SYSTEMS
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-neutral-400 font-medium">TV System / Timing:</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'ntsc', label: 'NTSC (60 Hz)' },
                { id: 'pal', label: 'PAL (50 Hz)' },
                { id: 'dual', label: 'Dual / Multi' },
              ].map((sys) => (
                <button
                  key={sys.id}
                  onClick={() =>
                    setHeaderConfig((prev) => ({
                      ...prev,
                      tvSystem: sys.id as 'ntsc' | 'pal' | 'dual',
                    }))
                  }
                  className={`py-1.5 px-1 text-[11px] border text-center transition-colors ${
                    headerConfig.tvSystem === sys.id
                      ? 'bg-neutral-200 text-neutral-900 border-white font-bold'
                      : 'bg-[#212536] text-neutral-400 border-neutral-700 hover:text-white'
                  }`}
                >
                  {sys.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
            <label className="flex items-center gap-2 text-neutral-300 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={headerConfig.vsUnisystem}
                onChange={(e) =>
                  setHeaderConfig((prev) => ({ ...prev, vsUnisystem: e.target.checked }))
                }
                className="accent-red-600"
              />
              <span>VS. Unisystem Arcade Hardware Flag</span>
            </label>

            <label className="flex items-center gap-2 text-neutral-300 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={headerConfig.playchoice10}
                onChange={(e) =>
                  setHeaderConfig((prev) => ({ ...prev, playchoice10: e.target.checked }))
                }
                className="accent-red-600"
              />
              <span>PlayChoice-10 (Hint Screen Present)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
