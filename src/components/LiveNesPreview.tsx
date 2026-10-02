import React, { useEffect, useRef, useState } from 'react';
import { SimpleNesPpu } from '../utils/nesEmulator';
import { NESPaletteConfig, INESHeaderConfig } from '../types/nes';
import { Play, Pause, RotateCcw, Monitor, Tv, Info, Gamepad2 } from 'lucide-react';

interface LiveNesPreviewProps {
  tiles: Uint8Array[];
  palette: NESPaletteConfig;
  activeTileIdx: number;
  headerConfig: INESHeaderConfig;
}

export const LiveNesPreview: React.FC<LiveNesPreviewProps> = ({
  tiles,
  palette,
  activeTileIdx,
  headerConfig,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ppuRef = useRef<SimpleNesPpu | null>(null);

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [crtEffect, setCrtEffect] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);
  const [spriteCoords, setSpriteCoords] = useState<{ x: number; y: number }>({ x: 124, y: 112 });

  // Initialize PPU instance
  useEffect(() => {
    const ppu = new SimpleNesPpu(tiles, palette, activeTileIdx);
    ppuRef.current = ppu;

    if (canvasRef.current) {
      ppu.attachCanvas(canvasRef.current);
      ppu.start();
    }

    // Interval to poll FPS and sprite status
    const interval = setInterval(() => {
      if (ppuRef.current) {
        setFps(ppuRef.current.state.fps);
        setSpriteCoords({
          x: Math.round(ppuRef.current.state.spriteX),
          y: Math.round(ppuRef.current.state.spriteY),
        });
      }
    }, 200);

    return () => {
      clearInterval(interval);
      ppu.stop();
    };
  }, []);

  // Update data when tiles/palette/activeTileIdx change
  useEffect(() => {
    if (ppuRef.current) {
      ppuRef.current.updateData(tiles, palette, activeTileIdx);
    }
  }, [tiles, palette, activeTileIdx]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ppu = ppuRef.current;
      if (!ppu) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          ppu.joypad.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          ppu.joypad.down = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          ppu.joypad.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          ppu.joypad.right = true;
          break;
        case 'KeyZ':
        case 'KeyJ':
          ppu.joypad.b = true;
          break;
        case 'KeyX':
        case 'KeyK':
          ppu.joypad.a = true;
          break;
        case 'Enter':
          ppu.joypad.start = true;
          break;
        case 'ShiftRight':
        case 'ShiftLeft':
          ppu.joypad.select = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const ppu = ppuRef.current;
      if (!ppu) return;

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          ppu.joypad.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          ppu.joypad.down = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          ppu.joypad.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          ppu.joypad.right = false;
          break;
        case 'KeyZ':
        case 'KeyJ':
          ppu.joypad.b = false;
          break;
        case 'KeyX':
        case 'KeyK':
          ppu.joypad.a = false;
          break;
        case 'Enter':
          ppu.joypad.start = false;
          break;
        case 'ShiftRight':
        case 'ShiftLeft':
          ppu.joypad.select = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const toggleRun = () => {
    if (!ppuRef.current) return;
    if (isRunning) {
      ppuRef.current.stop();
      setIsRunning(false);
    } else {
      ppuRef.current.start();
      setIsRunning(true);
    }
  };

  const resetPpu = () => {
    if (!ppuRef.current) return;
    ppuRef.current.reset();
  };

  // Gamepad touch / mouse handlers
  const setButtonState = (button: keyof SimpleNesPpu['joypad'], pressed: boolean) => {
    if (ppuRef.current) {
      ppuRef.current.joypad[button] = pressed;
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 p-5 bg-[#141620] border border-neutral-800 text-xs font-mono">
      {/* Left: CRT Screen Viewport */}
      <div className="flex-1 flex flex-col items-center gap-3">
        {/* Top Screen Controls */}
        <div className="flex items-center justify-between w-full max-w-[540px] bg-[#1a1d2c] p-2 border border-neutral-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-white">NES 2C02 PPU RUNNER</span>
            <span className="text-[10px] text-neutral-400 font-mono">
              ({headerConfig.tvSystem.toUpperCase()} · {fps} FPS)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCrtEffect(!crtEffect)}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] border transition-colors ${
                crtEffect
                  ? 'bg-red-950/40 border-red-500 text-red-300'
                  : 'bg-[#222638] border-neutral-700 text-neutral-400'
              }`}
              title="Toggle CRT Scanline Effect"
            >
              <Tv className="w-3 h-3" />
              <span>CRT Scanlines</span>
            </button>

            <button
              onClick={toggleRun}
              className="p-1.5 bg-[#222638] border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors"
              title={isRunning ? 'Pause' : 'Resume'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={resetPpu}
              className="p-1.5 bg-[#222638] border border-neutral-700 hover:border-neutral-500 text-neutral-300 transition-colors"
              title="Reset PPU / Sprite"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Vintage CRT Monitor Casing */}
        <div className="relative p-5 sm:p-7 bg-[#212433] rounded-2xl border-4 border-[#161824] shadow-[0_15px_35px_rgba(0,0,0,0.8)] flex flex-col items-center">
          {/* Inner bezel */}
          <div className="relative overflow-hidden rounded-lg border-4 border-[#0c0d12] bg-[#050608] shadow-inner">
            <canvas
              ref={canvasRef}
              width={256}
              height={240}
              className="w-[280px] sm:w-[512px] h-[262px] sm:h-[480px] block"
              style={{ imageRendering: 'pixelated' }}
            />

            {/* Authentic CRT Scanline & Phosphor Overlay */}
            {crtEffect && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.35) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
                  backgroundSize: '100% 3px, 4px 100%',
                }}
              />
            )}

            {/* CRT Screen Curved Glare */}
            {crtEffect && (
              <div
                className="absolute inset-0 pointer-events-none opacity-30 shadow-[inset_0_0_80px_rgba(0,0,0,0.9)]"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 60%)',
                }}
              />
            )}
          </div>

          {/* CRT Monitor Bottom Badge */}
          <div className="flex items-center justify-between w-full mt-3 px-2 text-[10px] text-neutral-400 font-mono">
            <span>NES-CPU-RP2A03</span>
            <span className="text-neutral-500 font-bold tracking-widest uppercase">
              FAMICOM DISPLAY
            </span>
            <span className="text-red-500 font-bold">POWER ON</span>
          </div>
        </div>
      </div>

      {/* Right: Controller & PPU Telemetry */}
      <div className="w-full xl:w-80 flex flex-col gap-4">
        {/* On-Screen NES Joypad */}
        <div className="p-4 bg-[#191c2a] border border-neutral-800 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="font-bold text-white text-[12px] flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-red-500" />
              <span>NES CONTROLLER 1</span>
            </span>
            <span className="text-[10px] text-neutral-400">Port $4016</span>
          </div>

          {/* D-Pad and Action buttons layout */}
          <div className="flex items-center justify-between py-2">
            {/* D-Pad Cross */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Up */}
              <button
                onMouseDown={() => setButtonState('up', true)}
                onMouseUp={() => setButtonState('up', false)}
                onTouchStart={() => setButtonState('up', true)}
                onTouchEnd={() => setButtonState('up', false)}
                className="absolute top-0 w-9 h-9 bg-[#2b2f44] hover:bg-[#3a3f5c] active:bg-red-600 border border-neutral-700 text-neutral-200 font-bold flex items-center justify-center text-xs select-none shadow-md"
              >
                ▲
              </button>
              {/* Down */}
              <button
                onMouseDown={() => setButtonState('down', true)}
                onMouseUp={() => setButtonState('down', false)}
                onTouchStart={() => setButtonState('down', true)}
                onTouchEnd={() => setButtonState('down', false)}
                className="absolute bottom-0 w-9 h-9 bg-[#2b2f44] hover:bg-[#3a3f5c] active:bg-red-600 border border-neutral-700 text-neutral-200 font-bold flex items-center justify-center text-xs select-none shadow-md"
              >
                ▼
              </button>
              {/* Left */}
              <button
                onMouseDown={() => setButtonState('left', true)}
                onMouseUp={() => setButtonState('left', false)}
                onTouchStart={() => setButtonState('left', true)}
                onTouchEnd={() => setButtonState('left', false)}
                className="absolute left-0 w-9 h-9 bg-[#2b2f44] hover:bg-[#3a3f5c] active:bg-red-600 border border-neutral-700 text-neutral-200 font-bold flex items-center justify-center text-xs select-none shadow-md"
              >
                ◀
              </button>
              {/* Right */}
              <button
                onMouseDown={() => setButtonState('right', true)}
                onMouseUp={() => setButtonState('right', false)}
                onTouchStart={() => setButtonState('right', true)}
                onTouchEnd={() => setButtonState('right', false)}
                className="absolute right-0 w-9 h-9 bg-[#2b2f44] hover:bg-[#3a3f5c] active:bg-red-600 border border-neutral-700 text-neutral-200 font-bold flex items-center justify-center text-xs select-none shadow-md"
              >
                ▶
              </button>
              {/* Center deadzone */}
              <div className="w-9 h-9 bg-[#242738] border border-neutral-800" />
            </div>

            {/* A and B Buttons */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <button
                  onMouseDown={() => setButtonState('b', true)}
                  onMouseUp={() => setButtonState('b', false)}
                  onTouchStart={() => setButtonState('b', true)}
                  onTouchEnd={() => setButtonState('b', false)}
                  className="w-10 h-10 rounded-full bg-red-700 hover:bg-red-600 active:bg-red-500 border-2 border-red-900 shadow-md text-white font-bold text-xs flex items-center justify-center select-none"
                >
                  B
                </button>
                <span className="text-[10px] text-neutral-400">Z key</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <button
                  onMouseDown={() => setButtonState('a', true)}
                  onMouseUp={() => setButtonState('a', false)}
                  onTouchStart={() => setButtonState('a', true)}
                  onTouchEnd={() => setButtonState('a', false)}
                  className="w-10 h-10 rounded-full bg-red-700 hover:bg-red-600 active:bg-red-500 border-2 border-red-900 shadow-md text-white font-bold text-xs flex items-center justify-center select-none"
                >
                  A
                </button>
                <span className="text-[10px] text-neutral-400">X key</span>
              </div>
            </div>
          </div>

          {/* Select & Start */}
          <div className="flex items-center justify-center gap-4 pt-1 border-t border-neutral-800">
            <button
              onMouseDown={() => setButtonState('select', true)}
              onMouseUp={() => setButtonState('select', false)}
              className="px-4 py-1 rounded bg-[#2b2f44] border border-neutral-700 text-neutral-300 text-[10px] uppercase font-bold"
            >
              Select
            </button>
            <button
              onMouseDown={() => setButtonState('start', true)}
              onMouseUp={() => setButtonState('start', false)}
              className="px-4 py-1 rounded bg-[#2b2f44] border border-neutral-700 text-neutral-300 text-[10px] uppercase font-bold"
            >
              Start
            </button>
          </div>
        </div>

        {/* PPU Live Hardware Registers */}
        <div className="p-3 bg-[#191c2a] border border-neutral-800 flex flex-col gap-2">
          <span className="font-bold text-white text-[11px] border-b border-neutral-800 pb-1.5">
            PPU REGISTER & SPRITE TELEMETRY
          </span>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">Sprite OAM #0 Pos:</span>
            <span className="font-bold text-emerald-400">
              X: {spriteCoords.x} · Y: {spriteCoords.y}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">Sprite Tile Index:</span>
            <span className="text-neutral-200">
              #{activeTileIdx} (${activeTileIdx.toString(16).toUpperCase().padStart(2, '0')})
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">PPU Resolution:</span>
            <span className="text-neutral-200">256 × 240 (NTSC)</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">Scanlines:</span>
            <span className="text-neutral-200">262 total / 240 visible</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">Mapper Mode:</span>
            <span className="text-amber-400">Mapper {headerConfig.mapperNumber}</span>
          </div>
        </div>

        {/* Keyboard Map Instructions */}
        <div className="p-3 bg-[#0d0e14] border border-neutral-800 flex flex-col gap-1.5 text-[10px] text-neutral-400">
          <div className="flex items-center gap-1 text-neutral-300 font-semibold mb-0.5">
            <Info className="w-3.5 h-3.5 text-neutral-400" />
            <span>KEYBOARD CONTROLS</span>
          </div>
          <div>• Move Sprite: <strong className="text-white">Arrow Keys</strong> or <strong className="text-white">WASD</strong></div>
          <div>• A Button (Cycle subpalette): <strong className="text-white">X</strong></div>
          <div>• B Button: <strong className="text-white">Z</strong></div>
          <div>• Start: <strong className="text-white">Enter</strong> · Select: <strong className="text-white">Shift</strong></div>
        </div>
      </div>
    </div>
  );
};
