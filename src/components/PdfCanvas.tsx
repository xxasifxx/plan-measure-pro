import { useRef, useEffect, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPage } from '@/lib/pdf-utils';
import { distancePx, polygonAreaSF, lineLength } from '@/lib/geometry';
import type { ToolMode, PointXY, Annotation, Calibration, PayItem } from '@/types/project';

interface Props {
  pdf: PDFDocumentProxy | null;
  currentPage: number;
  scale: number;
  toolMode: ToolMode;
  calibration: Calibration | null;
  annotations: Annotation[];
  activePayItemId: string;
  payItems: PayItem[];
  onCalibrate: (cal: Calibration) => void;
  onAddAnnotation: (annotation: Annotation) => void;
  onRemoveAnnotation: (id: string) => void;
  onTocRegionSelected?: (rect: { x1: number; y1: number; x2: number; y2: number }) => void;
}

export function PdfCanvas({
  pdf, currentPage, scale, toolMode, calibration,
  annotations, activePayItemId, payItems, onCalibrate, onAddAnnotation, onRemoveAnnotation,
  onTocRegionSelected,
}: Props) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [drawingPoints, setDrawingPoints] = useState<PointXY[]>([]);
  const [mousePos, setMousePos] = useState<PointXY | null>(null);
  const [panOffset, setPanOffset] = useState<PointXY>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<PointXY>({ x: 0, y: 0 });
  const [calibratePoints, setCalibratePoints] = useState<PointXY[]>([]);
  const [calibrateDistance, setCalibrateDistance] = useState('');
  const [showCalPrompt, setShowCalPrompt] = useState(false);

  // TOC selection rectangle
  const [tocDragStart, setTocDragStart] = useState<PointXY | null>(null);
  const [tocDragEnd, setTocDragEnd] = useState<PointXY | null>(null);
  const [tocRect, setTocRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Reset TOC selection when tool changes away from tocSelect
  useEffect(() => {
    if (toolMode !== 'tocSelect') {
      setTocDragStart(null);
      setTocDragEnd(null);
      setTocRect(null);
    }
  }, [toolMode]);

  // Render PDF page
  useEffect(() => {
    if (!pdf || !pdfCanvasRef.current) return;
    renderPage(pdf, currentPage, pdfCanvasRef.current, scale).then(() => {
      const c = pdfCanvasRef.current!;
      setCanvasSize({ width: c.width, height: c.height });
    });
  }, [pdf, currentPage, scale]);

  // Get canvas-relative position
  const getCanvasPos = useCallback((e: React.MouseEvent): PointXY => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
  }, []);

  // Draw overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageAnnotations = annotations.filter(a => a.page === currentPage);

    // Draw existing annotations
    for (const ann of pageAnnotations) {
      const item = payItems.find(p => p.id === ann.payItemId);
      const color = item?.color || '#999';

      ctx.strokeStyle = color;
      ctx.fillStyle = color + '33';
      ctx.lineWidth = 2;

      if (ann.type === 'line' && ann.points.length === 2) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        ctx.lineTo(ann.points[1].x, ann.points[1].y);
        ctx.stroke();

        const mid = {
          x: (ann.points[0].x + ann.points[1].x) / 2,
          y: (ann.points[0].y + ann.points[1].y) / 2,
        };
        ctx.fillStyle = color;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${ann.measurement.toFixed(1)} LF`, mid.x + 5, mid.y - 5);
      }

      if (ann.type === 'polygon' && ann.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const cx = ann.points.reduce((s, p) => s + p.x, 0) / ann.points.length;
        const cy = ann.points.reduce((s, p) => s + p.y, 0) / ann.points.length;
        ctx.fillStyle = color;
        ctx.font = 'bold 11px monospace';
        const label = ann.depth
          ? `${ann.measurement.toFixed(1)} CY`
          : `${ann.measurement.toFixed(1)} SF`;
        ctx.fillText(label, cx - 20, cy);
      }
    }

    // Draw in-progress shape
    if (drawingPoints.length > 0) {
      const item = payItems.find(p => p.id === activePayItemId);
      const color = item?.color || '#fff';
      ctx.strokeStyle = color;
      ctx.fillStyle = color + '33';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);

      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
      }
      if (mousePos) {
        ctx.lineTo(mousePos.x, mousePos.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (const pt of drawingPoints) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw calibration points
    if (calibratePoints.length > 0) {
      ctx.strokeStyle = '#ff0';
      ctx.fillStyle = '#ff0';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      for (const pt of calibratePoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (calibratePoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(calibratePoints[0].x, calibratePoints[0].y);
        ctx.lineTo(calibratePoints[1].x, calibratePoints[1].y);
        ctx.stroke();
      } else if (calibratePoints.length === 1 && mousePos) {
        ctx.beginPath();
        ctx.moveTo(calibratePoints[0].x, calibratePoints[0].y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw TOC selection rectangle
    const drawTocRect = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
    };

    if (tocDragStart && tocDragEnd) {
      drawTocRect(tocDragStart.x, tocDragStart.y, tocDragEnd.x, tocDragEnd.y);
    } else if (tocRect) {
      drawTocRect(tocRect.x1, tocRect.y1, tocRect.x2, tocRect.y2);
    }
  }, [annotations, currentPage, drawingPoints, mousePos, payItems, activePayItemId, toolMode, calibratePoints, tocDragStart, tocDragEnd, tocRect]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (toolMode === 'pan' || toolMode === 'select' || toolMode === 'tocSelect') return;
    const pos = getCanvasPos(e);

    if (toolMode === 'calibrate') {
      const pts = [...calibratePoints, pos];
      setCalibratePoints(pts);
      if (pts.length === 2) {
        setShowCalPrompt(true);
      }
      return;
    }

    if (toolMode === 'line') {
      const pts = [...drawingPoints, pos];
      setDrawingPoints(pts);
      if (pts.length === 2) {
        if (!calibration) {
          setDrawingPoints([]);
          return;
        }
        const measurement = lineLength(pts, calibration.pixelsPerFoot);
        onAddAnnotation({
          id: crypto.randomUUID(),
          type: 'line',
          points: pts,
          payItemId: activePayItemId,
          page: currentPage,
          measurement,
          measurementUnit: 'LF',
        });
        setDrawingPoints([]);
      }
      return;
    }

    if (toolMode === 'polygon') {
      setDrawingPoints(prev => [...prev, pos]);
    }
  }, [toolMode, calibratePoints, drawingPoints, calibration, activePayItemId, currentPage, onAddAnnotation, getCanvasPos]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (toolMode !== 'polygon' || drawingPoints.length < 3) return;
    if (!calibration) { setDrawingPoints([]); return; }

    const areaSF = polygonAreaSF(drawingPoints, calibration.pixelsPerFoot);
    onAddAnnotation({
      id: crypto.randomUUID(),
      type: 'polygon',
      points: [...drawingPoints],
      payItemId: activePayItemId,
      page: currentPage,
      measurement: areaSF,
      measurementUnit: 'SF',
    });
    setDrawingPoints([]);
  }, [toolMode, drawingPoints, calibration, activePayItemId, currentPage, onAddAnnotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // TOC drag
    if (toolMode === 'tocSelect' && tocDragStart) {
      const pos = getCanvasPos(e);
      setTocDragEnd(pos);
      return;
    }

    const pos = getCanvasPos(e);
    setMousePos(pos);
  }, [isPanning, getCanvasPos, toolMode, tocDragStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (toolMode === 'pan') {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (toolMode === 'tocSelect') {
      const pos = getCanvasPos(e);
      setTocDragStart(pos);
      setTocDragEnd(null);
      setTocRect(null);
    }
  }, [toolMode, getCanvasPos]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (toolMode === 'tocSelect' && tocDragStart && tocDragEnd) {
      const w = Math.abs(tocDragEnd.x - tocDragStart.x);
      const h = Math.abs(tocDragEnd.y - tocDragStart.y);
      if (w > 20 && h > 20) {
        setTocRect({
          x1: tocDragStart.x,
          y1: tocDragStart.y,
          x2: tocDragEnd.x,
          y2: tocDragEnd.y,
        });
      }
      setTocDragStart(null);
      setTocDragEnd(null);
    }
  }, [isPanning, toolMode, tocDragStart, tocDragEnd]);

  const submitCalibration = () => {
    const dist = parseFloat(calibrateDistance);
    if (isNaN(dist) || dist <= 0 || calibratePoints.length !== 2) return;
    const pxDist = distancePx(calibratePoints[0], calibratePoints[1]);
    onCalibrate({
      point1: calibratePoints[0],
      point2: calibratePoints[1],
      realDistance: dist,
      pixelsPerFoot: pxDist / dist,
    });
    setCalibratePoints([]);
    setCalibrateDistance('');
    setShowCalPrompt(false);
  };

  const handleImportToc = () => {
    if (tocRect && onTocRegionSelected) {
      onTocRegionSelected(tocRect);
      setTocRect(null);
    }
  };

  // Handle right-click to cancel drawing
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDrawingPoints([]);
    setCalibratePoints([]);
    setShowCalPrompt(false);
    setTocDragStart(null);
    setTocDragEnd(null);
    setTocRect(null);
  }, []);

  // Keyboard escape to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawingPoints([]);
        setCalibratePoints([]);
        setShowCalPrompt(false);
        setTocDragStart(null);
        setTocDragEnd(null);
        setTocRect(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const cursorClass = toolMode === 'pan'
    ? (isPanning ? 'cursor-grabbing' : 'cursor-grab')
    : toolMode === 'select'
    ? 'cursor-default'
    : 'cursor-crosshair';

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-muted/50 relative"
      onMouseUp={handleMouseUp}
    >
      <div
        className="relative inline-block"
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
      >
        <canvas ref={pdfCanvasRef} className="block" />
        <canvas
          ref={overlayCanvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className={`absolute top-0 left-0 ${cursorClass}`}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onContextMenu={handleContextMenu}
        />
      </div>

      {/* Calibration distance prompt */}
      {showCalPrompt && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-md shadow-lg p-3 z-50">
          <p className="text-xs text-muted-foreground mb-2">Enter the real-world distance between the two points (feet):</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={calibrateDistance}
              onChange={e => setCalibrateDistance(e.target.value)}
              className="h-8 w-32 px-2 text-xs border border-input rounded-sm bg-background"
              placeholder="e.g. 100"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && submitCalibration()}
            />
            <button onClick={submitCalibration} className="toolbar-btn toolbar-btn-active text-xs">
              Set Scale
            </button>
            <button
              onClick={() => { setCalibratePoints([]); setShowCalPrompt(false); }}
              className="toolbar-btn text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TOC import prompt */}
      {tocRect && toolMode === 'tocSelect' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-md shadow-lg p-3 z-20">
          <p className="text-xs text-muted-foreground mb-2">Import the Table of Contents from the selected area?</p>
          <div className="flex gap-2">
            <button onClick={handleImportToc} className="toolbar-btn toolbar-btn-active text-xs">
              Import TOC
            </button>
            <button
              onClick={() => { setTocRect(null); }}
              className="toolbar-btn text-xs"
            >
              Reselect
            </button>
            <button
              onClick={() => { setTocRect(null); setTocDragStart(null); setTocDragEnd(null); }}
              className="toolbar-btn text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!pdf && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground">Upload a PDF to begin</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Use the sidebar to load your construction plans</p>
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      {pdf && toolMode !== 'select' && toolMode !== 'pan' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur border border-border rounded-sm px-3 py-1.5 z-10">
          <span className="text-[10px] text-muted-foreground">
            {toolMode === 'calibrate' && 'Click two points on a known dimension'}
            {toolMode === 'line' && 'Click two points to measure length'}
            {toolMode === 'polygon' && 'Click to place vertices • Double-click to close • Right-click to cancel'}
            {toolMode === 'tocSelect' && 'Click and drag to select the Table of Contents area'}
          </span>
        </div>
      )}
    </div>
  );
}
