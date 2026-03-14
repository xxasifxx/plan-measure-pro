import { useRef, useEffect, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPage } from '@/lib/pdf-utils';
import { distancePx, polygonAreaSF, lineLength, pointToSegmentDistance, pointInPolygon, pointToMarkerDistance } from '@/lib/geometry';
import type { ToolMode, PointXY, Annotation, Calibration, PayItem } from '@/types/project';
import { UNIT_LABELS } from '@/types/project';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  onUpdateAnnotation?: (id: string, changes: Partial<Annotation>) => void;
  onTocRegionSelected?: (rect: { x1: number; y1: number; x2: number; y2: number }) => void;
  externalContainerRef?: React.RefObject<HTMLDivElement>;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
}

const HIT_TOLERANCE = 8; // pixels at scale=1
const MARKER_RADIUS = 8;

export function PdfCanvas({
  pdf, currentPage, scale, toolMode, calibration,
  annotations, activePayItemId, payItems, onCalibrate, onAddAnnotation, onRemoveAnnotation,
  onUpdateAnnotation, onTocRegionSelected, externalContainerRef, selectedAnnotationId, onSelectAnnotation,
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

  // Depth prompt for CY polygons
  const [pendingPolygon, setPendingPolygon] = useState<{ points: PointXY[]; areaSF: number } | null>(null);
  const [depthInput, setDepthInput] = useState('');

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

  // Get canvas-relative position normalized to scale=1
  const getCanvasPos = useCallback((e: React.MouseEvent): PointXY => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }, [scale]);

  // Helper to scale a normalized point to current canvas pixels
  const s = useCallback((pt: PointXY): PointXY => ({ x: pt.x * scale, y: pt.y * scale }), [scale]);

  // Hit-test annotations at a normalized point
  const hitTestAnnotations = useCallback((pos: PointXY): Annotation | null => {
    const pageAnnotations = annotations.filter(a => a.page === currentPage);
    // Reverse order so topmost drawn annotation is selected first
    for (let i = pageAnnotations.length - 1; i >= 0; i--) {
      const ann = pageAnnotations[i];
      if (ann.type === 'count') {
        if (pointToMarkerDistance(pos, ann.points[0]) <= MARKER_RADIUS) return ann;
      } else if (ann.type === 'line' && ann.points.length === 2) {
        if (pointToSegmentDistance(pos, ann.points[0], ann.points[1]) <= HIT_TOLERANCE) return ann;
      } else if (ann.type === 'polygon' && ann.points.length >= 3) {
        if (pointInPolygon(pos, ann.points)) return ann;
      }
    }
    return null;
  }, [annotations, currentPage]);

  // Draw overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pageAnnotations = annotations.filter(a => a.page === currentPage);

    for (const ann of pageAnnotations) {
      const item = payItems.find(p => p.id === ann.payItemId);
      const color = item?.color || '#999';
      const isSelected = ann.id === selectedAnnotationId;

      ctx.strokeStyle = isSelected ? '#fff' : color;
      ctx.fillStyle = color + '33';
      ctx.lineWidth = isSelected ? 3 : 2;

      if (ann.type === 'count') {
        const sp = s(ann.points[0]);
        // Draw marker circle
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, MARKER_RADIUS * scale, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        // Draw count number
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(10 * scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Find count index among same pay item count annotations on this page
        const sameItemCounts = pageAnnotations.filter(a => a.type === 'count' && a.payItemId === ann.payItemId);
        const idx = sameItemCounts.indexOf(ann) + 1;
        ctx.fillText(String(idx), sp.x, sp.y);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        continue;
      }

      if (ann.type === 'line' && ann.points.length === 2) {
        const p0 = s(ann.points[0]), p1 = s(ann.points[1]);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        ctx.fillStyle = color;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${ann.measurement.toFixed(1)} LF`, mid.x + 5, mid.y - 5);
      }

      if (ann.type === 'polygon' && ann.points.length >= 3) {
        const scaled = ann.points.map(s);
        ctx.beginPath();
        ctx.moveTo(scaled[0].x, scaled[0].y);
        for (let i = 1; i < scaled.length; i++) {
          ctx.lineTo(scaled[i].x, scaled[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = color + '33';
        ctx.fill();
        ctx.stroke();

        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const cx = scaled.reduce((sum, p) => sum + p.x, 0) / scaled.length;
        const cy = scaled.reduce((sum, p) => sum + p.y, 0) / scaled.length;
        ctx.fillStyle = color;
        const unitLabel = ann.measurementUnit || (ann.depth ? 'CY' : 'SF');
        const label = `${ann.measurement.toFixed(1)} ${unitLabel}`;
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

      const scaledPts = drawingPoints.map(s);
      ctx.beginPath();
      ctx.moveTo(scaledPts[0].x, scaledPts[0].y);
      for (let i = 1; i < scaledPts.length; i++) {
        ctx.lineTo(scaledPts[i].x, scaledPts[i].y);
      }
      if (mousePos) {
        const sm = s(mousePos);
        ctx.lineTo(sm.x, sm.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (const pt of scaledPts) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Show running total for polygon
      if (toolMode === 'polygon' && drawingPoints.length >= 3 && calibration) {
        const areaSF = polygonAreaSF(drawingPoints, calibration.pixelsPerFoot);
        const lastScaled = scaledPts[scaledPts.length - 1];
        ctx.fillStyle = color;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`~${areaSF.toFixed(1)} SF`, lastScaled.x + 10, lastScaled.y - 10);
      }
    }

    // Draw calibration points
    if (calibratePoints.length > 0) {
      ctx.strokeStyle = '#ff0';
      ctx.fillStyle = '#ff0';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      for (const pt of calibratePoints) {
        const sp = s(pt);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (calibratePoints.length === 2) {
        const sp0 = s(calibratePoints[0]), sp1 = s(calibratePoints[1]);
        ctx.beginPath();
        ctx.moveTo(sp0.x, sp0.y);
        ctx.lineTo(sp1.x, sp1.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // TOC selection rectangle
    const drawTocRect = (x1: number, y1: number, x2: number, y2: number) => {
      const sx1 = x1 * scale, sy1 = y1 * scale, sx2 = x2 * scale, sy2 = y2 * scale;
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1);
      ctx.fillRect(sx1, sy1, sx2 - sx1, sy2 - sy1);
      ctx.setLineDash([]);
    };

    if (toolMode === 'tocSelect' && tocDragStart && tocDragEnd) {
      drawTocRect(tocDragStart.x, tocDragStart.y, tocDragEnd.x, tocDragEnd.y);
    }
    if (tocRect && toolMode === 'tocSelect') {
      drawTocRect(tocRect.x1, tocRect.y1, tocRect.x2, tocRect.y2);
    }
  }, [annotations, currentPage, drawingPoints, mousePos, payItems, activePayItemId, toolMode, calibratePoints, tocDragStart, tocDragEnd, tocRect, scale, s, selectedAnnotationId, calibration]);

  // Guard: check active pay item and calibration before drawing
  const guardDrawing = useCallback((needsCalibration: boolean): boolean => {
    if (!activePayItemId || !payItems.find(p => p.id === activePayItemId)) {
      toast({ title: 'No pay item selected', description: 'Select a pay item in the sidebar before drawing.', variant: 'destructive' });
      return false;
    }
    if (needsCalibration && !calibration) {
      toast({ title: 'No calibration set', description: 'Calibrate the scale on this page before measuring.', variant: 'destructive' });
      return false;
    }
    return true;
  }, [activePayItemId, payItems, calibration]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (toolMode === 'pan' || toolMode === 'tocSelect') return;
    const pos = getCanvasPos(e);

    // Select tool: hit-test
    if (toolMode === 'select') {
      const hit = hitTestAnnotations(pos);
      onSelectAnnotation(hit?.id || null);
      return;
    }

    // Count tool: place marker
    if (toolMode === 'count') {
      if (!guardDrawing(false)) return;
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'count',
        points: [pos],
        payItemId: activePayItemId,
        page: currentPage,
        measurement: 1,
        measurementUnit: 'EA',
      });
      return;
    }

    if (toolMode === 'calibrate') {
      const pts = [...calibratePoints, pos];
      setCalibratePoints(pts);
      if (pts.length === 2) {
        setShowCalPrompt(true);
      }
      return;
    }

    if (toolMode === 'line') {
      if (!guardDrawing(true)) return;
      const pts = [...drawingPoints, pos];
      setDrawingPoints(pts);
      if (pts.length === 2) {
        const measurement = lineLength(pts, calibration!.pixelsPerFoot);
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
      if (drawingPoints.length === 0 && !guardDrawing(true)) return;
      setDrawingPoints(prev => [...prev, pos]);
    }
  }, [toolMode, calibratePoints, drawingPoints, calibration, activePayItemId, currentPage, onAddAnnotation, getCanvasPos, hitTestAnnotations, onSelectAnnotation, guardDrawing]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (toolMode !== 'polygon' || drawingPoints.length < 3) return;
    if (!calibration) {
      toast({ title: 'No calibration set', description: 'Calibrate the scale before measuring areas.', variant: 'destructive' });
      setDrawingPoints([]);
      return;
    }

    const areaSF = polygonAreaSF(drawingPoints, calibration.pixelsPerFoot);
    const activeItem = payItems.find(p => p.id === activePayItemId);

    // If CY pay item, prompt for depth
    if (activeItem?.unit === 'CY') {
      setPendingPolygon({ points: [...drawingPoints], areaSF });
      setDepthInput('');
      setDrawingPoints([]);
      return;
    }

    // SY conversion: divide SF by 9
    const isSY = activeItem?.unit === 'SY';
    const measurement = isSY ? areaSF / 9 : areaSF;

    onAddAnnotation({
      id: crypto.randomUUID(),
      type: 'polygon',
      points: [...drawingPoints],
      payItemId: activePayItemId,
      page: currentPage,
      measurement,
      measurementUnit: isSY ? 'SY' : 'SF',
    });
    setDrawingPoints([]);
  }, [toolMode, drawingPoints, calibration, activePayItemId, currentPage, onAddAnnotation, payItems]);

  const submitDepth = useCallback(() => {
    if (!pendingPolygon || !calibration) return;
    const depth = parseFloat(depthInput);
    if (isNaN(depth) || depth <= 0) return;
    const volumeCY = (pendingPolygon.areaSF * depth) / 27;
    onAddAnnotation({
      id: crypto.randomUUID(),
      type: 'polygon',
      points: pendingPolygon.points,
      payItemId: activePayItemId,
      page: currentPage,
      depth,
      measurement: volumeCY,
      measurementUnit: 'CY',
    });
    setPendingPolygon(null);
    setDepthInput('');
  }, [pendingPolygon, depthInput, calibration, activePayItemId, currentPage, onAddAnnotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDrawingPoints([]);
    setCalibratePoints([]);
    setShowCalPrompt(false);
    setTocDragStart(null);
    setTocDragEnd(null);
    setTocRect(null);
    setPendingPolygon(null);
  }, []);

  // Keyboard: escape to cancel, delete to remove selected annotation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawingPoints([]);
        setCalibratePoints([]);
        setShowCalPrompt(false);
        setTocDragStart(null);
        setTocDragEnd(null);
        setTocRect(null);
        setPendingPolygon(null);
        onSelectAnnotation(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId && toolMode === 'select') {
        // Don't delete if user is typing in an input
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
        onRemoveAnnotation(selectedAnnotationId);
        onSelectAnnotation(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedAnnotationId, toolMode, onRemoveAnnotation, onSelectAnnotation]);

  const cursorClass = toolMode === 'pan'
    ? (isPanning ? 'cursor-grabbing' : 'cursor-grab')
    : toolMode === 'select'
    ? 'cursor-default'
    : 'cursor-crosshair';

  // Selected annotation info
  const selectedAnnotation = selectedAnnotationId ? annotations.find(a => a.id === selectedAnnotationId) : null;
  const selectedPayItem = selectedAnnotation ? payItems.find(p => p.id === selectedAnnotation.payItemId) : null;

  return (
    <div
      ref={(el) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (externalContainerRef) (externalContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className="flex-1 overflow-auto bg-muted/50 relative min-h-0"
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

      {/* Selected annotation info popup */}
      {selectedAnnotation && selectedPayItem && (
        <div className="absolute top-3 right-3 bg-card border border-border rounded-md shadow-lg p-3 z-20 min-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedPayItem.color }} />
            <span className="text-xs font-semibold truncate">{selectedPayItem.name}</span>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Type: {selectedAnnotation.type}</p>
            <p>Measurement: {selectedAnnotation.measurement.toFixed(2)} {selectedAnnotation.measurementUnit}</p>
            {selectedAnnotation.depth && <p>Depth: {selectedAnnotation.depth} ft</p>}
            <p>Page: {selectedAnnotation.page}</p>
          </div>
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => { onRemoveAnnotation(selectedAnnotation.id); onSelectAnnotation(null); }}
              className="toolbar-btn text-[10px] text-destructive hover:bg-destructive/10"
            >
              Delete
            </button>
            <button
              onClick={() => onSelectAnnotation(null)}
              className="toolbar-btn text-[10px]"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

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

      {/* Depth prompt for CY polygons */}
      {pendingPolygon && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-md shadow-lg p-3 z-50">
          <p className="text-xs text-muted-foreground mb-1">Area: {pendingPolygon.areaSF.toFixed(1)} SF</p>
          <p className="text-xs text-muted-foreground mb-2">Enter depth in feet to calculate cubic yards:</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={depthInput}
              onChange={e => setDepthInput(e.target.value)}
              className="h-8 w-32 px-2 text-xs border border-input rounded-sm bg-background"
              placeholder="e.g. 1.5"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && submitDepth()}
            />
            <button onClick={submitDepth} className="toolbar-btn toolbar-btn-active text-xs">
              Calculate
            </button>
            <button
              onClick={() => setPendingPolygon(null)}
              className="toolbar-btn text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* TOC import prompt */}
      {tocRect && toolMode === 'tocSelect' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-md shadow-lg p-3 z-50">
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
            {toolMode === 'count' && 'Click to place count markers'}
            {toolMode === 'tocSelect' && 'Click and drag to select the Table of Contents area'}
          </span>
        </div>
      )}
    </div>
  );
}
