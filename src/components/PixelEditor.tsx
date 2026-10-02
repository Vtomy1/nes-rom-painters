import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ToolType,
  CanvasMode,
  NESPaletteConfig,
} from '../types/nes';
import {
  flipTileHorizontal,
  flipTileVertical,
  rotateTile90Clockwise,
  shiftTile,
  invertTileColors,
} from '../utils/nesChr';
import {
  nesIndexToHex,
  getSubpaletteHexColors,
  findNearestSubpaletteIndex,
  findNearestNesColor,
} from '../utils/nesPalette';
import {
  Paintbrush,
  Pen,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  Undo2,
  Redo2,
  Trash2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Move,
  Grid,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface PixelEditorProps {
  tiles: Uint8Array[];
  setTiles: React.Dispatch<React.SetStateAction<Uint8Array[]>>;
  activeTileIdx: number;
  setActiveTileIdx: (idx: number) => void;
  palette: NESPaletteConfig;
  setPalette: React.Dispatch<React.SetStateAction<NESPaletteConfig>>;
  activePaletteType: 'bg' | 'spr';
  activeSubpaletteIdx: number;
  activeColorIndex: number;
  setActiveColorIndex: (idx: number) => void;
}

export const PixelEditor: React.FC<PixelEditorProps> = ({
  tiles,
  setTiles,
  activeTileIdx,
  setActiveTileIdx,
  palette,
  setPalette,
  activePaletteType,
  activeSubpaletteIdx,
  activeColorIndex,
  setActiveColorIndex,
}) => {
  // Mode: 8x8 or 16x16 (2x2 tiles)
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('tile');

  // Tool
  const [selectedTool, setSelectedTool] = useState<ToolType>('pencil');

  // Display toggles
  const [showPixelGrid, setShowPixelGrid] = useState<boolean>(true);
  const [showTileGrid, setShowTileGrid] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(32); // 1 pixel = 32px
  const [hSymmetry, setHSymmetry] = useState<boolean>(false);
  const [vSymmetry, setVSymmetry] = useState<boolean>(false);

  // History for Undo/Redo
  const [history, setHistory] = useState<Uint8Array[][]>([]);
  const [future, setFuture] = useState<Uint8Array[][]>([]);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dimensions
  const canvasDimension = canvasMode === 'meta_2x2' ? 16 : 8;

  // Active subpalette 4 hex colors
  const subHexColors = getSubpaletteHexColors(
    palette,
    activePaletteType,
    activeSubpaletteIdx
  );

  // Helper to get pixel from virtual canvas (8x8 or 16x16)
  const getCanvasPixel = useCallback(
    (vx: number, vy: number): number => {
      if (vx < 0 || vx >= canvasDimension || vy < 0 || vy >= canvasDimension) return 0;
      if (canvasDimension === 8) {
        const curTile = tiles[activeTileIdx] || new Uint8Array(64);
        return curTile[vy * 8 + vx];
      } else {
        // 16x16 metasprite made of 4 adjacent tiles:
        // top-left: activeTileIdx
        // top-right: activeTileIdx + 1
        // bottom-left: activeTileIdx + 16
        // bottom-right: activeTileIdx + 17
        const tileCol = Math.floor(vx / 8);
        const tileRow = Math.floor(vy / 8);
        const targetTileIdx = (activeTileIdx + tileCol + tileRow * 16) % 512;
        const targetTile = tiles[targetTileIdx] || new Uint8Array(64);
        const localX = vx % 8;
        const localY = vy % 8;
        return targetTile[localY * 8 + localX];
      }
    },
    [activeTileIdx, canvasDimension, tiles]
  );

  // Push history snapshot before mutation
  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const copy = tiles.map((t) => new Uint8Array(t));
      return [...prev.slice(-30), copy];
    });
    setFuture([]);
  }, [tiles]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture((f) => [tiles.map((t) => new Uint8Array(t)), ...f]);
    setTiles(previous);
    setHistory((h) => h.slice(0, h.length - 1));
  }, [history, tiles, setTiles]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, tiles.map((t) => new Uint8Array(t))]);
    setTiles(next);
    setFuture((f) => f.slice(1));
  }, [future, tiles, setTiles]);

  // Global undo/redo keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Write pixel onto tiles
  const applyPixelChanges = useCallback(
    (changes: { x: number; y: number; color: number }[]) => {
      if (changes.length === 0) return;

      setTiles((prevTiles) => {
        const nextTiles = prevTiles.map((t) => new Uint8Array(t));

        for (const { x, y, color } of changes) {
          if (x < 0 || x >= canvasDimension || y < 0 || y >= canvasDimension) continue;

          if (canvasDimension === 8) {
            const tile = nextTiles[activeTileIdx] || new Uint8Array(64);
            tile[y * 8 + x] = color & 0x03;
            nextTiles[activeTileIdx] = tile;
          } else {
            const tileCol = Math.floor(x / 8);
            const tileRow = Math.floor(y / 8);
            const targetIdx = (activeTileIdx + tileCol + tileRow * 16) % 512;
            const tile = nextTiles[targetIdx] || new Uint8Array(64);
            tile[(y % 8) * 8 + (x % 8)] = color & 0x03;
            nextTiles[targetIdx] = tile;
          }
        }

        return nextTiles;
      });
    },
    [activeTileIdx, canvasDimension, setTiles]
  );

  // Render to main HTML5 canvas
  const renderCanvas = useCallback(
    (transientChanges?: { x: number; y: number; color: number }[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvasDimension;
      const pixelSize = zoom;

      canvas.width = size * pixelSize;
      canvas.height = size * pixelSize;

      // Background clear
      ctx.fillStyle = '#10121a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Map for transient preview pixels
      const transientMap = new Map<string, number>();
      if (transientChanges) {
        for (const c of transientChanges) {
          transientMap.set(`${c.x},${c.y}`, c.color);
        }
      }

      // Draw pixels
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          let colorIdx = transientMap.has(`${x},${y}`)
            ? transientMap.get(`${x},${y}`)!
            : getCanvasPixel(x, y);

          const isTransparent = activePaletteType === 'spr' && colorIdx === 0;

          if (isTransparent) {
            // Checkerboard for transparency
            const check = (x + y) % 2 === 0;
            ctx.fillStyle = check ? '#1c202e' : '#141724';
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          } else {
            ctx.fillStyle = subHexColors[colorIdx];
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          }
        }
      }

      // Draw symmetry guides
      if (hSymmetry) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const midX = (size * pixelSize) / 2;
        ctx.moveTo(midX, 0);
        ctx.lineTo(midX, size * pixelSize);
        ctx.stroke();
      }
      if (vSymmetry) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const midY = (size * pixelSize) / 2;
        ctx.moveTo(0, midY);
        ctx.lineTo(size * pixelSize, midY);
        ctx.stroke();
      }

      // Draw Pixel Grid
      if (showPixelGrid && pixelSize >= 8) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= size; i++) {
          ctx.beginPath();
          ctx.moveTo(i * pixelSize, 0);
          ctx.lineTo(i * pixelSize, size * pixelSize);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, i * pixelSize);
          ctx.lineTo(size * pixelSize, i * pixelSize);
          ctx.stroke();
        }
      }

      // Draw 8x8 Tile Boundary Grid (for 16x16 mode)
      if (showTileGrid && canvasDimension > 8) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        for (let t = 8; t < size; t += 8) {
          ctx.beginPath();
          ctx.moveTo(t * pixelSize, 0);
          ctx.lineTo(t * pixelSize, size * pixelSize);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, t * pixelSize);
          ctx.lineTo(size * pixelSize, t * pixelSize);
          ctx.stroke();
        }
      }
    },
    [
      canvasDimension,
      zoom,
      activePaletteType,
      subHexColors,
      hSymmetry,
      vSymmetry,
      showPixelGrid,
      showTileGrid,
      getCanvasPixel,
    ]
  );

  // Re-render when dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, tiles, activeTileIdx, palette]);

  // Compute pixel coordinate from mouse/touch event
  const getEventCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    const px = Math.floor(canvasX / zoom);
    const py = Math.floor(canvasY / zoom);

    if (px >= 0 && px < canvasDimension && py >= 0 && py < canvasDimension) {
      return { x: px, y: py };
    }
    return null;
  };

  // Flood fill algorithm
  const floodFill = (startX: number, startY: number, targetColor: number, fillColor: number) => {
    if (targetColor === fillColor) return [];
    const changes: { x: number; y: number; color: number }[] = [];
    const visited = new Set<string>();
    const queue: [number, number][] = [[startX, startY]];

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (x < 0 || x >= canvasDimension || y < 0 || y >= canvasDimension) continue;
      const current = getCanvasPixel(x, y);
      if (current !== targetColor) continue;

      changes.push({ x, y, color: fillColor });

      queue.push([x + 1, y]);
      queue.push([x - 1, y]);
      queue.push([x, y + 1]);
      queue.push([x, y - 1]);
    }

    return changes;
  };

  // Bresenham line algorithm
  const getLinePixels = (x0: number, y0: number, x1: number, y1: number) => {
    const pts: { x: number; y: number }[] = [];
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    while (true) {
      pts.push({ x: cx, y: cy });
      if (cx === x1 && cy === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }
    return pts;
  };

  // Generate symmetric coordinates
  const expandSymmetry = (x: number, y: number): { x: number; y: number }[] => {
    const maxIdx = canvasDimension - 1;
    const coords: { x: number; y: number }[] = [{ x, y }];

    if (hSymmetry) {
      coords.push({ x: maxIdx - x, y });
    }
    if (vSymmetry) {
      coords.push({ x, y: maxIdx - y });
    }
    if (hSymmetry && vSymmetry) {
      coords.push({ x: maxIdx - x, y: maxIdx - y });
    }
    return coords;
  };

  // Mouse handlers
  const handlePointerDown = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const pt = getEventCoordinates(e);
    if (!pt) return;

    if (selectedTool === 'eyedropper') {
      const pickedColor = getCanvasPixel(pt.x, pt.y);
      setActiveColorIndex(pickedColor);
      setSelectedTool('pencil');
      return;
    }

    pushHistory();
    isDrawingRef.current = true;
    startPosRef.current = pt;

    const paintColor = selectedTool === 'eraser' ? 0 : activeColorIndex;

    if (selectedTool === 'fill') {
      const targetColor = getCanvasPixel(pt.x, pt.y);
      const changes = floodFill(pt.x, pt.y, targetColor, paintColor);
      applyPixelChanges(changes);
      isDrawingRef.current = false;
      return;
    }

    if (selectedTool === 'pencil' || selectedTool === 'brush' || selectedTool === 'eraser') {
      const changes: { x: number; y: number; color: number }[] = [];
      const pts = expandSymmetry(pt.x, pt.y);
      for (const p of pts) {
        changes.push({ x: p.x, y: p.y, color: paintColor });
        if (selectedTool === 'brush') {
          changes.push({ x: p.x + 1, y: p.y, color: paintColor });
          changes.push({ x: p.x, y: p.y + 1, color: paintColor });
          changes.push({ x: p.x + 1, y: p.y + 1, color: paintColor });
        }
      }
      applyPixelChanges(changes);
    }
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current) return;
    const pt = getEventCoordinates(e);
    if (!pt) return;

    const paintColor = selectedTool === 'eraser' ? 0 : activeColorIndex;

    if (selectedTool === 'pencil' || selectedTool === 'brush' || selectedTool === 'eraser') {
      const changes: { x: number; y: number; color: number }[] = [];
      const pts = expandSymmetry(pt.x, pt.y);
      for (const p of pts) {
        changes.push({ x: p.x, y: p.y, color: paintColor });
        if (selectedTool === 'brush') {
          changes.push({ x: p.x + 1, y: p.y, color: paintColor });
          changes.push({ x: p.x, y: p.y + 1, color: paintColor });
          changes.push({ x: p.x + 1, y: p.y + 1, color: paintColor });
        }
      }
      applyPixelChanges(changes);
    } else if (startPosRef.current && (selectedTool === 'line' || selectedTool === 'rect' || selectedTool === 'filled_rect' || selectedTool === 'circle')) {
      // Show transient preview
      const transient: { x: number; y: number; color: number }[] = [];
      const sx = startPosRef.current.x;
      const sy = startPosRef.current.y;
      const ex = pt.x;
      const ey = pt.y;

      if (selectedTool === 'line') {
        const linePts = getLinePixels(sx, sy, ex, ey);
        for (const lp of linePts) {
          for (const sp of expandSymmetry(lp.x, lp.y)) {
            transient.push({ x: sp.x, y: sp.y, color: paintColor });
          }
        }
      } else if (selectedTool === 'rect' || selectedTool === 'filled_rect') {
        const minX = Math.min(sx, ex);
        const maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey);
        const maxY = Math.max(sy, ey);

        for (let ry = minY; ry <= maxY; ry++) {
          for (let rx = minX; rx <= maxX; rx++) {
            if (selectedTool === 'filled_rect' || rx === minX || rx === maxX || ry === minY || ry === maxY) {
              for (const sp of expandSymmetry(rx, ry)) {
                transient.push({ x: sp.x, y: sp.y, color: paintColor });
              }
            }
          }
        }
      } else if (selectedTool === 'circle') {
        const radius = Math.round(Math.hypot(ex - sx, ey - sy));
        for (let cy = sy - radius; cy <= sy + radius; cy++) {
          for (let cx = sx - radius; cx <= sx + radius; cx++) {
            const dist = Math.hypot(cx - sx, cy - sy);
            if (Math.abs(dist - radius) < 0.8) {
              for (const sp of expandSymmetry(cx, cy)) {
                transient.push({ x: sp.x, y: sp.y, color: paintColor });
              }
            }
          }
        }
      }

      renderCanvas(transient);
    }
  };

  const handlePointerUp = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (startPosRef.current && (selectedTool === 'line' || selectedTool === 'rect' || selectedTool === 'filled_rect' || selectedTool === 'circle')) {
      const pt = getEventCoordinates(e) || startPosRef.current;
      const paintColor = activeColorIndex;
      const finalChanges: { x: number; y: number; color: number }[] = [];

      const sx = startPosRef.current.x;
      const sy = startPosRef.current.y;
      const ex = pt.x;
      const ey = pt.y;

      if (selectedTool === 'line') {
        const linePts = getLinePixels(sx, sy, ex, ey);
        for (const lp of linePts) {
          for (const sp of expandSymmetry(lp.x, lp.y)) {
            finalChanges.push({ x: sp.x, y: sp.y, color: paintColor });
          }
        }
      } else if (selectedTool === 'rect' || selectedTool === 'filled_rect') {
        const minX = Math.min(sx, ex);
        const maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey);
        const maxY = Math.max(sy, ey);

        for (let ry = minY; ry <= maxY; ry++) {
          for (let rx = minX; rx <= maxX; rx++) {
            if (selectedTool === 'filled_rect' || rx === minX || rx === maxX || ry === minY || ry === maxY) {
              for (const sp of expandSymmetry(rx, ry)) {
                finalChanges.push({ x: sp.x, y: sp.y, color: paintColor });
              }
            }
          }
        }
      } else if (selectedTool === 'circle') {
        const radius = Math.round(Math.hypot(ex - sx, ey - sy));
        for (let cy = sy - radius; cy <= sy + radius; cy++) {
          for (let cx = sx - radius; cx <= sx + radius; cx++) {
            const dist = Math.hypot(cx - sx, cy - sy);
            if (Math.abs(dist - radius) < 0.8) {
              for (const sp of expandSymmetry(cx, cy)) {
                finalChanges.push({ x: sp.x, y: sp.y, color: paintColor });
              }
            }
          }
        }
      }

      applyPixelChanges(finalChanges);
    }

    startPosRef.current = null;
    renderCanvas();
  };

  // Tile transformations
  const transformActiveTile = (fn: (tile: Uint8Array) => Uint8Array) => {
    pushHistory();
    setTiles((prev) => {
      const next = prev.map((t) => new Uint8Array(t));
      next[activeTileIdx] = new Uint8Array(fn(next[activeTileIdx] || new Uint8Array(64)));
      return next;
    });
  };

  const clearActiveTile = () => {
    pushHistory();
    setTiles((prev) => {
      const next = prev.map((t) => new Uint8Array(t));
      next[activeTileIdx] = new Uint8Array(64);
      return next;
    });
  };

  // Image import state
  const [showImageImport, setShowImageImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Draw to offscreen canvas and quantize to NES subpalette
        const offCanvas = document.createElement('canvas');
        const dim = canvasDimension;
        offCanvas.width = dim;
        offCanvas.height = dim;
        const octx = offCanvas.getContext('2d');
        if (!octx) return;

        octx.drawImage(img, 0, 0, dim, dim);
        const imgData = octx.getImageData(0, 0, dim, dim);
        const d = imgData.data;

        pushHistory();
        const changes: { x: number; y: number; color: number }[] = [];

        for (let y = 0; y < dim; y++) {
          for (let x = 0; x < dim; x++) {
            const idx = (y * dim + x) * 4;
            const r = d[idx];
            const g = d[idx + 1];
            const b = d[idx + 2];
            const a = d[idx + 3];

            const matchedColorIdx = findNearestSubpaletteIndex(r, g, b, subHexColors, a);
            changes.push({ x, y, color: matchedColorIdx });
          }
        }

        applyPixelChanges(changes);
        setShowImageImport(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
      {/* Tool Sidebar */}
      <div className="flex lg:flex-col gap-1.5 p-2 bg-[#141620] border border-neutral-800 text-xs shrink-0 select-none">
        <div className="text-[10px] text-neutral-500 font-mono hidden lg:block px-1 py-0.5 border-b border-neutral-800">
          DRAW
        </div>

        <button
          onClick={() => setSelectedTool('pencil')}
          className={`p-2 transition-colors border ${
            selectedTool === 'pencil'
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : 'bg-[#1a1d2c] text-neutral-300 border-neutral-700 hover:border-neutral-500'
          }`}
          title="Pencil (1px)"
        >
          <Pen className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSelectedTool('brush')}
          className={`p-2 transition-colors border ${
            selectedTool === 'brush'
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : 'bg-[#1a1d2c] text-neutral-300 border-neutral-700 hover:border-neutral-500'
          }`}
          title="Brush (2x2 px)"
        >
          <Paintbrush className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSelectedTool('line')}
          className={`p-2 transition-colors border ${
            selectedTool === 'line'
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : 'bg-[#1a1d2c] text-neutral-300 border-neutral-700 hover:border-neutral-500'
          }`}
          title="Line Tool"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSelectedTool('rect')}
          className={`p-2 transition-colors border ${
            selectedTool === 'rect'
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : 'bg-[#1a1d2c] text-neutral-300 border-neutral-700 hover:border-neutral-500'
          }`}
          title="Rectangle Outline"
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSelectedTool('filled_rect')}
          className={`p-2 transition-colors border ${
            selectedTool === 'filled_rect'
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : 'bg-[#1a1d2c] text-neutral-300 border-neutral-700 hover:border-neutral-500'
          }`}
          title="Filled Rectangle"
        >
          <div className="w-4 h-4 bg-current" />
        </button>

        <button
          onClick={() => setSelectedTool('circle')}
          className={`p-2 transition-colors border ${
            selectedTool === 'circle'
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : 'bg-[#1a1d2c] text-neutral-300 border-neutral-700 hover:border-neutral-500'
          }`}
          title="Circle"
        >
          <Circle className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSelectedTool('fill')}
          className={`p-2 transition-colors border ${
            selectedTool === 'fill'
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : 'bg-[#1a1d2c] text-neutral-300 border-neutral-700 hover:border-neutral-500'
          }`}
          title="Flood Fill Bucket"
        >
          <PaintBucket className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSelectedTool('eyedropper')}
          className={`p-2 transition-colors border ${
            selectedTool === 'eyedropper'
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : 'bg-[#1a1d2c] text-neutral-300 border-neutral-700 hover:border-neutral-500'
          }`}
          title="Eyedropper"
        >
          <Pipette className="w-4 h-4" />
        </button>

        <button
          onClick={() => setSelectedTool('eraser')}
          className={`p-2 transition-colors border ${
            selectedTool === 'eraser'
              ? 'bg-red-600 text-white border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
              : 'bg-[#1a1d2c] text-neutral-300 border-neutral-700 hover:border-neutral-500'
          }`}
          title="Eraser (Color 0)"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="h-px bg-neutral-800 my-1 hidden lg:block" />

        {/* Undo / Redo */}
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="p-2 bg-[#1a1d2c] text-neutral-300 border border-neutral-700 hover:border-neutral-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleRedo}
          disabled={future.length === 0}
          className="p-2 bg-[#1a1d2c] text-neutral-300 border border-neutral-700 hover:border-neutral-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Center Canvas Area */}
      <div className="flex-1 flex flex-col items-center gap-3">
        {/* Top Control Bar for Canvas */}
        <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-xl bg-[#141620] p-2 border border-neutral-800 text-xs font-mono">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCanvasMode('tile')}
              className={`px-2.5 py-1 text-[11px] transition-colors border ${
                canvasMode === 'tile'
                  ? 'bg-neutral-200 text-neutral-900 border-white font-bold'
                  : 'bg-[#1c1f2e] text-neutral-400 border-neutral-700 hover:text-white'
              }`}
            >
              8x8 Tile
            </button>
            <button
              onClick={() => setCanvasMode('meta_2x2')}
              className={`px-2.5 py-1 text-[11px] transition-colors border ${
                canvasMode === 'meta_2x2'
                  ? 'bg-neutral-200 text-neutral-900 border-white font-bold'
                  : 'bg-[#1c1f2e] text-neutral-400 border-neutral-700 hover:text-white'
              }`}
            >
              16x16 Metasprite
            </button>
          </div>

          {/* Grid & Symmetry toggles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowPixelGrid(!showPixelGrid)}
              className={`p-1.5 border transition-colors ${
                showPixelGrid
                  ? 'bg-red-950/40 border-red-500 text-red-400'
                  : 'bg-[#1c1f2e] border-neutral-700 text-neutral-400'
              }`}
              title="Toggle 1px Pixel Grid"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setHSymmetry(!hSymmetry)}
              className={`px-2 py-1 text-[10px] border transition-colors ${
                hSymmetry
                  ? 'bg-red-950/40 border-red-500 text-red-400'
                  : 'bg-[#1c1f2e] border-neutral-700 text-neutral-400'
              }`}
              title="Horizontal Symmetry Mirror"
            >
              H-Sym
            </button>

            <button
              onClick={() => setVSymmetry(!vSymmetry)}
              className={`px-2 py-1 text-[10px] border transition-colors ${
                vSymmetry
                  ? 'bg-red-950/40 border-red-500 text-red-400'
                  : 'bg-[#1c1f2e] border-neutral-700 text-neutral-400'
              }`}
              title="Vertical Symmetry Mirror"
            >
              V-Sym
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 ml-1 border border-neutral-700 bg-[#1c1f2e]">
              <button
                onClick={() => setZoom((z) => Math.max(12, z - 4))}
                className="p-1 text-neutral-400 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="text-[10px] text-neutral-300 px-1 font-mono">{zoom}x</span>
              <button
                onClick={() => setZoom((z) => Math.min(48, z + 4))}
                className="p-1 text-neutral-400 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* The Pixel Canvas Frame */}
        <div className="relative p-2 bg-[#0d0e14] border-2 border-neutral-800 shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="cursor-crosshair shadow-lg touch-none"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Bottom Tile Manipulations & Transformations */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 w-full max-w-xl bg-[#141620] p-2 border border-neutral-800 text-xs font-mono">
          <button
            onClick={() => transformActiveTile(flipTileHorizontal)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#1c1f2e] border border-neutral-700 text-neutral-300 hover:border-neutral-400 transition-colors"
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-3 h-3" />
            <span>Flip H</span>
          </button>

          <button
            onClick={() => transformActiveTile(flipTileVertical)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#1c1f2e] border border-neutral-700 text-neutral-300 hover:border-neutral-400 transition-colors"
            title="Flip Vertical"
          >
            <FlipVertical className="w-3 h-3" />
            <span>Flip V</span>
          </button>

          <button
            onClick={() => transformActiveTile(rotateTile90Clockwise)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#1c1f2e] border border-neutral-700 text-neutral-300 hover:border-neutral-400 transition-colors"
            title="Rotate 90 Degrees"
          >
            <RotateCw className="w-3 h-3" />
            <span>Rot 90°</span>
          </button>

          <button
            onClick={() => transformActiveTile((t) => shiftTile(t, 1, 0))}
            className="px-2 py-1 bg-[#1c1f2e] border border-neutral-700 text-neutral-300 hover:border-neutral-400 transition-colors"
            title="Shift Right 1px"
          >
            →
          </button>
          <button
            onClick={() => transformActiveTile((t) => shiftTile(t, -1, 0))}
            className="px-2 py-1 bg-[#1c1f2e] border border-neutral-700 text-neutral-300 hover:border-neutral-400 transition-colors"
            title="Shift Left 1px"
          >
            ←
          </button>
          <button
            onClick={() => transformActiveTile((t) => shiftTile(t, 0, -1))}
            className="px-2 py-1 bg-[#1c1f2e] border border-neutral-700 text-neutral-300 hover:border-neutral-400 transition-colors"
            title="Shift Up 1px"
          >
            ↑
          </button>
          <button
            onClick={() => transformActiveTile((t) => shiftTile(t, 0, 1))}
            className="px-2 py-1 bg-[#1c1f2e] border border-neutral-700 text-neutral-300 hover:border-neutral-400 transition-colors"
            title="Shift Down 1px"
          >
            ↓
          </button>

          <button
            onClick={() => transformActiveTile(invertTileColors)}
            className="px-2 py-1 bg-[#1c1f2e] border border-neutral-700 text-neutral-300 hover:border-neutral-400 transition-colors"
            title="Invert Tile Color Indices"
          >
            Invert
          </button>

          <button
            onClick={() => setShowImageImport(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#1c1f2e] border border-neutral-700 text-neutral-300 hover:border-neutral-400 transition-colors"
            title="Import PNG and auto-quantize to NES Palette"
          >
            <Upload className="w-3 h-3 text-emerald-400" />
            <span>Import Image</span>
          </button>

          <button
            onClick={clearActiveTile}
            className="flex items-center gap-1 px-2 py-1 bg-red-950/30 border border-red-800 text-red-300 hover:bg-red-900/50 transition-colors ml-auto"
            title="Clear Active Tile"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Right Column: 1:1, 2:1, 4:1 Preview & Tile Info */}
      <div className="w-full lg:w-60 flex flex-col gap-3 p-3 bg-[#141620] border border-neutral-800 text-xs font-mono shrink-0">
        <div className="text-[11px] font-bold text-neutral-300 uppercase pb-2 border-b border-neutral-800">
          REAL NES HARDWARE VIEW
        </div>

        {/* Real CRT Pixel Scale previews */}
        <div className="flex flex-col gap-2 p-2.5 bg-[#0e1017] border border-neutral-800">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span>1x Scale (Native 8px)</span>
            <span>2x Scale</span>
            <span>4x Scale</span>
          </div>

          <div className="flex items-end justify-around py-2 border-b border-neutral-800/80">
            {/* 1x Native (8x8) */}
            <div
              className="w-2 h-2 border border-neutral-700"
              style={{
                backgroundImage: `url(${canvasRef.current?.toDataURL()})`,
                backgroundSize: 'contain',
                imageRendering: 'pixelated',
              }}
              title="1x NES native resolution"
            />

            {/* 2x Native (16x16) */}
            <div
              className="w-4 h-4 border border-neutral-700"
              style={{
                backgroundImage: `url(${canvasRef.current?.toDataURL()})`,
                backgroundSize: 'contain',
                imageRendering: 'pixelated',
              }}
              title="2x scale"
            />

            {/* 4x Native (32x32) */}
            <div
              className="w-8 h-8 border border-neutral-600"
              style={{
                backgroundImage: `url(${canvasRef.current?.toDataURL()})`,
                backgroundSize: 'contain',
                imageRendering: 'pixelated',
              }}
              title="4x scale"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1">
            <span className="text-neutral-400">Active Tile Slot:</span>
            <span className="font-bold text-white">
              #{activeTileIdx} (${activeTileIdx.toString(16).toUpperCase().padStart(2, '0')})
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">Pattern Table:</span>
            <span className="text-neutral-200">
              {activeTileIdx < 256 ? 'Table 0 ($0000)' : 'Table 1 ($1000)'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-400">2bpp CHR Size:</span>
            <span className="text-neutral-200">16 Bytes</span>
          </div>
        </div>
      </div>

      {/* Image Import Modal */}
      {showImageImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono">
          <div className="bg-[#141622] border border-neutral-700 max-w-md w-full p-5 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="text-sm font-bold text-white">IMPORT & QUANTIZE IMAGE TO NES</h3>
              <button
                onClick={() => setShowImageImport(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Upload any sprite or image. The applet will scale it to{' '}
              <strong className="text-white">{canvasDimension}x{canvasDimension}</strong> and
              quantize each pixel to the nearest of the 4 colors in your currently active subpalette.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-700 hover:border-red-500 bg-[#0e1017] p-6 text-center cursor-pointer transition-colors"
            >
              <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <span className="text-neutral-300 font-semibold block mb-1">
                Click or Drop PNG / JPG image
              </span>
              <span className="text-[10px] text-neutral-500">
                Transparent pixels convert to Color 0 (Transparent)
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowImageImport(false)}
                className="px-4 py-1.5 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
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
