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
  onScaleChange?: (scale: number) => void;
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
  isMobile?: boolean;
  /** GPS position dot (normalized to scale=1) */
  gpsPosition?: PointXY | null;
  /** GPS trace polyline (normalized to scale=1) */
  gpsTracePoints?: PointXY[];
  /** Callback for GPS calibration plan-tap */
  onGpsPlanTap?: ((point: PointXY) => void) | null;
}

const HIT_TOLERANCE = 8; // pixels at scale=1
const MARKER_RADIUS = 8;
const HANDLE_RADIUS = 6; // endpoint drag handle radius at scale=1
const HANDLE_HIT_RADIUS = 12; // hit-test radius for handles

export function PdfCanvas({
  pdf, currentPage, scale, onScaleChange, toolMode, calibration,
  annotations, activePayItemId, payItems, onCalibrate, onAddAnnotation, onRemoveAnnotation,
  onUpdateAnnotation, onTocRegionSelected, externalContainerRef, selectedAnnotationId, onSelectAnnotation,
  isMobile, gpsPosition, gpsTracePoints, onGpsPlanTap,
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

  // Label annotation state
  const [labelPoints, setLabelPoints] = useState<PointXY[]>([]);
  const [showLabelPrompt, setShowLabelPrompt] = useState(false);
  const [labelTextInput, setLabelTextInput] = useState('');

  // Endpoint drag handle state
  const [draggingHandle, setDraggingHandle] = useState<{
    annotationId: string;
    pointIndex: number;
    currentPos: PointXY;
  } | null>(null);

  // Touch gesture state
  const touchStateRef = useRef<{
    lastTouches: { x: number; y: number }[];
    lastDist: number;
    lastCenter: { x: number; y: number };
    isTwoFinger: boolean;
    // Single-finger touch tracking
    startPos: PointXY | null;
    startTime: number;
    dragging: boolean;
    dragFirstPointPlaced: boolean;
    lastTapTime: number;
    suppressClick: boolean;
  }>({
    lastTouches: [], lastDist: 0, lastCenter: { x: 0, y: 0 }, isTwoFinger: false,
    startPos: null, startTime: 0, dragging: false, dragFirstPointPlaced: false,
    lastTapTime: 0, suppressClick: false,
  });

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

  // Render PDF page (cancel previous render to avoid concurrent canvas use)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    if (!pdf || !pdfCanvasRef.current) return;
    // Cancel any in-flight render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    let cancelled = false;
    const pagePromise = pdf.getPage(currentPage);
    pagePromise.then(page => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = pdfCanvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = { cancel: () => task.cancel() };
      task.promise.then(() => {
        if (!cancelled) {
          setCanvasSize({ width: canvas.width, height: canvas.height });
        }
      }).catch(() => { /* cancelled */ });
    });
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdf, currentPage, scale]);

  // Get canvas-relative position normalized to scale=1
  const getCanvasPos = useCallback((e: React.MouseEvent): PointXY => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }, [scale]);

  // Get canvas-relative position from a Touch object
  const getTouchCanvasPos = useCallback((touch: { clientX: number; clientY: number }): PointXY => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) / scale,
      y: (touch.clientY - rect.top) / scale,
    };
  }, [scale]);

  // Helper to scale a normalized point to current canvas pixels
  const s = useCallback((pt: PointXY): PointXY => ({ x: pt.x * scale, y: pt.y * scale }), [scale]);

  // Hit-test annotations at a normalized point
  const hitTestAnnotations = useCallback((pos: PointXY): Annotation | null => {
    const pageAnnotations = annotations.filter(a => a.page === currentPage && a.type !== 'manual');
    // Reverse order so topmost drawn annotation is selected first
    for (let i = pageAnnotations.length - 1; i >= 0; i--) {
      const ann = pageAnnotations[i];
      if (ann.type === 'count') {
        if (pointToMarkerDistance(pos, ann.points[0]) <= MARKER_RADIUS) return ann;
      } else if (ann.type === 'label' && ann.points.length >= 2) {
        if (pointToSegmentDistance(pos, ann.points[0], ann.points[1]) <= HIT_TOLERANCE) return ann;
        if (distancePx(pos, ann.points[0]) <= MARKER_RADIUS) return ann;
        if (distancePx(pos, ann.points[1]) <= 20) return ann;
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

    const pageAnnotations = annotations.filter(a => a.page === currentPage && a.type !== 'manual');

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
        // If dragging a handle on this annotation, use the preview position
        let pts = ann.points;
        if (draggingHandle && draggingHandle.annotationId === ann.id) {
          pts = pts.map((p, i) => i === draggingHandle.pointIndex ? draggingHandle.currentPos : p);
        }

        const p0 = s(pts[0]), p1 = s(pts[1]);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();

        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw endpoint drag handles
          for (const ep of [p0, p1]) {
            ctx.beginPath();
            ctx.arc(ep.x, ep.y, HANDLE_RADIUS * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        // Measurement label — recalc if dragging (only if no manual override)
        let measLabel: string;
        if (draggingHandle && draggingHandle.annotationId === ann.id && calibration && ann.manualQuantity == null) {
          measLabel = lineLength(pts, calibration.pixelsPerFoot).toFixed(1);
        } else {
          measLabel = (ann.manualQuantity != null ? ann.manualQuantity : ann.measurement).toFixed(1);
        }
        const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        ctx.fillStyle = color;
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${measLabel} LF`, mid.x + 5, mid.y - 5);
      }

      if (ann.type === 'polygon' && ann.points.length >= 3) {
        // If dragging a handle on this polygon, use the preview position
        let polyPts = ann.points;
        if (draggingHandle && draggingHandle.annotationId === ann.id) {
          polyPts = polyPts.map((p, i) => i === draggingHandle.pointIndex ? draggingHandle.currentPos : p);
        }

        const scaled = polyPts.map(s);
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

          // Draw vertex drag handles
          for (const ep of scaled) {
            ctx.beginPath();
            ctx.arc(ep.x, ep.y, HANDLE_RADIUS * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        const cx = scaled.reduce((sum, p) => sum + p.x, 0) / scaled.length;
        const cy = scaled.reduce((sum, p) => sum + p.y, 0) / scaled.length;
        ctx.fillStyle = color;
        const unitLabel = ann.measurementUnit || (ann.depth ? 'CY' : 'SF');
        // Live preview measurement during drag (only if no manual override)
        let polyMeas: number;
        if (draggingHandle && draggingHandle.annotationId === ann.id && calibration && ann.manualQuantity == null) {
          const areaSF = polygonAreaSF(polyPts, calibration.pixelsPerFoot);
          if (ann.depth) {
            polyMeas = (areaSF * ann.depth) / 27;
          } else if (ann.measurementUnit === 'SY') {
            polyMeas = areaSF / 9;
          } else {
            polyMeas = areaSF;
          }
        } else {
          polyMeas = ann.manualQuantity != null ? ann.manualQuantity : ann.measurement;
        }
        const label = `${polyMeas.toFixed(1)} ${unitLabel}`;
        ctx.fillText(label, cx - 20, cy);
      }

      if (ann.type === 'label' && ann.points.length >= 2) {
        let labelPts = ann.points;
        if (draggingHandle && draggingHandle.annotationId === ann.id) {
          labelPts = labelPts.map((p, i) => i === draggingHandle.pointIndex ? draggingHandle.currentPos : p);
        }
        const anchor = s(labelPts[0]);
        const labelPos = s(labelPts[1]);
        const text = (ann as any).labelText || '';

        // Leader line (dashed)
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(labelPos.x, labelPos.y);
        ctx.strokeStyle = isSelected ? '#fff' : color;
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Anchor dot
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Text box
        const fontSize = Math.max(10, Math.round(11 * scale));
        ctx.font = `bold ${fontSize}px monospace`;
        const metrics = ctx.measureText(text || ' ');
        const pad = 4 * scale;
        const boxW = metrics.width + pad * 2;
        const boxH = fontSize + pad * 2;

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(labelPos.x - pad, labelPos.y - boxH / 2, boxW, boxH, 3);
        } else {
          ctx.rect(labelPos.x - pad, labelPos.y - boxH / 2, boxW, boxH);
        }
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.fillStyle = '#fff';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, labelPos.x + pad, labelPos.y);
        ctx.textBaseline = 'alphabetic';

        // Drag handles when selected
        if (isSelected) {
          for (const ep of [anchor, labelPos]) {
            ctx.beginPath();
            ctx.arc(ep.x, ep.y, HANDLE_RADIUS * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
        continue;
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

    // Draw GPS trace polyline
    if (gpsTracePoints && gpsTracePoints.length > 0) {
      const scaled = gpsTracePoints.map(s);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(scaled[0].x, scaled[0].y);
      for (let i = 1; i < scaled.length; i++) {
        ctx.lineTo(scaled[i].x, scaled[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Breadcrumb dots
      for (const pt of scaled) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();
      }
    }

    // Draw GPS position dot
    if (gpsPosition) {
      const gp = s(gpsPosition);
      // Accuracy ring
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Center dot
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [annotations, currentPage, drawingPoints, mousePos, payItems, activePayItemId, toolMode, calibratePoints, tocDragStart, tocDragEnd, tocRect, scale, s, selectedAnnotationId, calibration, draggingHandle, gpsPosition, gpsTracePoints]);

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

  // Hit-test drag handles on selected line annotation
  const hitTestHandles = useCallback((pos: PointXY): { annotationId: string; pointIndex: number } | null => {
    if (!selectedAnnotationId) return null;
    const ann = annotations.find(a => a.id === selectedAnnotationId);
    if (!ann || (ann.type !== 'line' && ann.type !== 'polygon' && ann.type !== 'label')) return null;
    for (let i = 0; i < ann.points.length; i++) {
      if (distancePx(pos, ann.points[i]) <= HANDLE_HIT_RADIUS) {
        return { annotationId: ann.id, pointIndex: i };
      }
    }
    return null;
  }, [selectedAnnotationId, annotations]);

  // Core click logic extracted to accept PointXY directly (shared by mouse + touch)
  const handleClickAtPos = useCallback((pos: PointXY) => {
    // Intercept for GPS calibration plan-tap
    if (onGpsPlanTap) {
      onGpsPlanTap(pos);
      return;
    }

    if (toolMode === 'pan' || toolMode === 'tocSelect') return;

    if (toolMode === 'select') {
      const hit = hitTestAnnotations(pos);
      onSelectAnnotation(hit?.id || null);
      return;
    }

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

    if (toolMode === 'label') {
      const pts = [...drawingPoints, pos];
      setDrawingPoints(pts);
      if (pts.length === 2) {
        setLabelPoints(pts);
        setShowLabelPrompt(true);
        setDrawingPoints([]);
      }
      return;
    }

    if (toolMode === 'polygon') {
      if (drawingPoints.length === 0 && !guardDrawing(true)) return;
      setDrawingPoints(prev => [...prev, pos]);
    }
  }, [toolMode, calibratePoints, drawingPoints, calibration, activePayItemId, currentPage, onAddAnnotation, hitTestAnnotations, onSelectAnnotation, guardDrawing, onGpsPlanTap]);

  // Suppress click after handle drag
  const handleDragJustFinished = useRef(false);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (touchStateRef.current.suppressClick) {
      touchStateRef.current.suppressClick = false;
      return;
    }
    if (handleDragJustFinished.current) {
      handleDragJustFinished.current = false;
      return;
    }
    handleClickAtPos(getCanvasPos(e));
  }, [handleClickAtPos, getCanvasPos]);

  // Core double-click logic (shared by mouse + touch)
  const handleDoubleClickAtPos = useCallback(() => {
    if (toolMode !== 'polygon' || drawingPoints.length < 3) return;
    if (!calibration) {
      toast({ title: 'No calibration set', description: 'Calibrate the scale before measuring areas.', variant: 'destructive' });
      setDrawingPoints([]);
      return;
    }

    const areaSF = polygonAreaSF(drawingPoints, calibration.pixelsPerFoot);
    const activeItem = payItems.find(p => p.id === activePayItemId);

    if (activeItem?.unit === 'CY') {
      setPendingPolygon({ points: [...drawingPoints], areaSF });
      setDepthInput('');
      setDrawingPoints([]);
      return;
    }

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

  const handleDoubleClick = useCallback((_e: React.MouseEvent) => {
    handleDoubleClickAtPos();
  }, [handleDoubleClickAtPos]);

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

  const submitLabel = useCallback(() => {
    if (labelPoints.length !== 2 || !labelTextInput.trim()) return;
    onAddAnnotation({
      id: crypto.randomUUID(),
      type: 'label',
      points: labelPoints,
      payItemId: activePayItemId || '',
      page: currentPage,
      measurement: 0,
      measurementUnit: '',
      labelText: labelTextInput.trim(),
    });
    setLabelPoints([]);
    setLabelTextInput('');
    setShowLabelPrompt(false);
  }, [labelPoints, labelTextInput, activePayItemId, currentPage, onAddAnnotation]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle endpoint dragging
    if (draggingHandle) {
      e.preventDefault();
      const pos = getCanvasPos(e);
      setDraggingHandle(prev => prev ? { ...prev, currentPos: pos } : null);
      return;
    }

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
  }, [isPanning, getCanvasPos, toolMode, tocDragStart, draggingHandle]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Check for handle drag on selected line
    if (toolMode === 'select') {
      const pos = getCanvasPos(e);
      const handle = hitTestHandles(pos);
      if (handle) {
        e.preventDefault();
        const ann = annotations.find(a => a.id === handle.annotationId);
        if (ann) {
          setDraggingHandle({
            annotationId: handle.annotationId,
            pointIndex: handle.pointIndex,
            currentPos: ann.points[handle.pointIndex],
          });
        }
        return;
      }
    }

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
  }, [toolMode, getCanvasPos, hitTestHandles, annotations]);

  const handleMouseUp = useCallback(() => {
    // Finalize endpoint drag
    if (draggingHandle && onUpdateAnnotation) {
      const ann = annotations.find(a => a.id === draggingHandle.annotationId);
      if (ann) {
        const newPoints = ann.points.map((p, i) =>
          i === draggingHandle.pointIndex ? draggingHandle.currentPos : p
        );
        // Only recalculate if no manual quantity override
        const changes: Partial<Annotation> = { points: newPoints };
        if (ann.manualQuantity == null && calibration) {
          if (ann.type === 'line') {
            changes.measurement = lineLength(newPoints, calibration.pixelsPerFoot);
          } else if (ann.type === 'polygon' && newPoints.length >= 3) {
            const areaSF = polygonAreaSF(newPoints, calibration.pixelsPerFoot);
            if (ann.depth) {
              changes.measurement = (areaSF * ann.depth) / 27;
            } else if (ann.measurementUnit === 'SY') {
              changes.measurement = areaSF / 9;
            } else {
              changes.measurement = areaSF;
            }
          }
        }
        onUpdateAnnotation(draggingHandle.annotationId, changes);
      }
      setDraggingHandle(null);
      handleDragJustFinished.current = true;
    }

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
  }, [isPanning, toolMode, tocDragStart, tocDragEnd, draggingHandle, onUpdateAnnotation, calibration, annotations]);

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

  // ──── Touch gesture handlers ────
  // Single-finger: tap → click, drag → draw or pan
  // Two-finger: pinch-zoom + pan (always, regardless of tool)

  const handleOverlayTouchStart = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current;

    if (e.touches.length === 2) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const center = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };
      ts.isTwoFinger = true;
      ts.lastDist = dist;
      ts.lastCenter = center;
      ts.lastTouches = [{ x: t0.clientX, y: t0.clientY }, { x: t1.clientX, y: t1.clientY }];
      // Cancel any in-progress single-finger action
      ts.startPos = null;
      ts.dragging = false;
      ts.dragFirstPointPlaced = false;
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      ts.startPos = getTouchCanvasPos(touch);
      ts.startTime = Date.now();
      ts.dragging = false;
      ts.dragFirstPointPlaced = false;
      ts.isTwoFinger = false;

      // Check for handle drag on selected line (touch)
      if (toolMode === 'select') {
        const handle = hitTestHandles(ts.startPos);
        if (handle) {
          const ann = annotations.find(a => a.id === handle.annotationId);
          if (ann) {
            setDraggingHandle({
              annotationId: handle.annotationId,
              pointIndex: handle.pointIndex,
              currentPos: ann.points[handle.pointIndex],
            });
            return;
          }
        }
      }

      // For pan/select, start panning immediately
      if (toolMode === 'pan' || toolMode === 'select') {
        panStart.current = { x: touch.clientX, y: touch.clientY };
      }

      // TOC select: start drag rectangle
      if (toolMode === 'tocSelect') {
        setTocDragStart(ts.startPos);
        setTocDragEnd(null);
        setTocRect(null);
      }
    }
  }, [getTouchCanvasPos, toolMode, hitTestHandles, annotations]);

  const handleOverlayTouchMove = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current;

    // Handle endpoint dragging (touch)
    if (draggingHandle && e.touches.length === 1) {
      e.preventDefault();
      const pos = getTouchCanvasPos(e.touches[0]);
      setDraggingHandle(prev => prev ? { ...prev, currentPos: pos } : null);
      return;
    }

    // Two-finger: pinch-zoom + pan (always)
    if (e.touches.length === 2 && ts.isTwoFinger) {
      e.preventDefault();
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const center = { x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 };

      if (ts.lastDist > 0 && onScaleChange) {
        const ratio = dist / ts.lastDist;
        const newScale = Math.min(4, Math.max(0.25, scale * ratio));
        onScaleChange(Math.round(newScale * 100) / 100);
      }

      const dx = center.x - ts.lastCenter.x;
      const dy = center.y - ts.lastCenter.y;
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));

      ts.lastDist = dist;
      ts.lastCenter = center;
      ts.lastTouches = [{ x: t0.clientX, y: t0.clientY }, { x: t1.clientX, y: t1.clientY }];
      return;
    }

    // Single finger
    if (e.touches.length === 1 && !ts.isTwoFinger && ts.startPos) {
      const touch = e.touches[0];
      const currentPos = getTouchCanvasPos(touch);
      const moveDistance = distancePx(ts.startPos, currentPos);

      // Threshold to distinguish tap from drag
      if (!ts.dragging && moveDistance > 10) {
        ts.dragging = true;

        // For line/calibrate tools, place first point at drag start
        if ((toolMode === 'line' || toolMode === 'calibrate') && !ts.dragFirstPointPlaced) {
          handleClickAtPos(ts.startPos);
          ts.dragFirstPointPlaced = true;
        }
      }

      if (ts.dragging) {
        e.preventDefault();

        // Pan/select/count/polygon: single-finger drag = pan
        if (toolMode === 'pan' || toolMode === 'select' || toolMode === 'count' || toolMode === 'polygon') {
          const dx = touch.clientX - panStart.current.x;
          const dy = touch.clientY - panStart.current.y;
          setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
          panStart.current = { x: touch.clientX, y: touch.clientY };
        }

        // Line/calibrate: update rubber-band visual
        if (toolMode === 'line' || toolMode === 'calibrate') {
          setMousePos(currentPos);
        }

        // TOC select: update drag rectangle
        if (toolMode === 'tocSelect') {
          setTocDragEnd(currentPos);
        }
      }
    }
  }, [scale, onScaleChange, getTouchCanvasPos, toolMode, handleClickAtPos, draggingHandle]);

  const handleOverlayTouchEnd = useCallback((e: React.TouchEvent) => {
    const ts = touchStateRef.current;

    if (e.touches.length < 2) {
      ts.isTwoFinger = false;
    }

    // Finalize handle drag (touch)
    if (e.touches.length === 0 && draggingHandle) {
      if (onUpdateAnnotation && calibration) {
        const ann = annotations.find(a => a.id === draggingHandle.annotationId);
        if (ann) {
          const newPoints = ann.points.map((p, i) =>
            i === draggingHandle.pointIndex ? draggingHandle.currentPos : p
          );
          const changes: Partial<Annotation> = { points: newPoints };
          if (ann.manualQuantity == null) {
            if (ann.type === 'line') {
              changes.measurement = lineLength(newPoints, calibration.pixelsPerFoot);
            } else if (ann.type === 'polygon' && newPoints.length >= 3) {
              const areaSF = polygonAreaSF(newPoints, calibration.pixelsPerFoot);
              if (ann.depth) {
                changes.measurement = (areaSF * ann.depth) / 27;
              } else if (ann.measurementUnit === 'SY') {
                changes.measurement = areaSF / 9;
              } else {
                changes.measurement = areaSF;
              }
            }
          }
          onUpdateAnnotation(draggingHandle.annotationId, changes);
        }
      }
      setDraggingHandle(null);
      touchStateRef.current.startPos = null;
      touchStateRef.current.suppressClick = true;
      return;
    }

    // Only process single-finger end when no fingers remain
    if (e.touches.length === 0 && ts.startPos) {
      const touch = e.changedTouches[0];
      const endPos = getTouchCanvasPos(touch);

      if (!ts.dragging) {
        // It was a tap
        const now = Date.now();
        const timeSinceLastTap = now - ts.lastTapTime;

        if (timeSinceLastTap < 300) {
          // Double-tap → close polygon
          handleDoubleClickAtPos();
          ts.lastTapTime = 0;
        } else {
          // Single tap → place point (skip for tocSelect)
          if (toolMode !== 'tocSelect') {
            handleClickAtPos(endPos);
          }
          ts.lastTapTime = now;
        }
      } else {
        // It was a drag
        if ((toolMode === 'line' || toolMode === 'calibrate') && ts.dragFirstPointPlaced) {
          // Place second point at drag end → complete the line/calibration
          handleClickAtPos(endPos);
        }

        // TOC select: finalize rectangle
        if (toolMode === 'tocSelect' && tocDragStart) {
          const x1 = Math.min(tocDragStart.x, endPos.x);
          const y1 = Math.min(tocDragStart.y, endPos.y);
          const x2 = Math.max(tocDragStart.x, endPos.x);
          const y2 = Math.max(tocDragStart.y, endPos.y);
          if (x2 - x1 > 20 && y2 - y1 > 20) {
            // Just show the rect for confirmation — don't call onTocRegionSelected
            setTocRect({ x1, y1, x2, y2 });
          }
          setTocDragStart(null);
          setTocDragEnd(null);
        }
      }

      // Suppress the ghost click event
      ts.suppressClick = true;
      ts.startPos = null;
      ts.dragging = false;
      ts.dragFirstPointPlaced = false;
      setMousePos(null);
    }
  }, [getTouchCanvasPos, handleClickAtPos, handleDoubleClickAtPos, toolMode, tocDragStart, onTocRegionSelected, draggingHandle, onUpdateAnnotation, calibration, annotations]);

  // Prevent default touch zoom on the container (only multi-touch)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const preventMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    const preventStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault();
    };
    container.addEventListener('touchmove', preventMove, { passive: false });
    container.addEventListener('touchstart', preventStart, { passive: false });
    return () => {
      container.removeEventListener('touchmove', preventMove);
      container.removeEventListener('touchstart', preventStart);
    };
  }, []);

  const cursorClass = draggingHandle
    ? 'cursor-grabbing'
    : toolMode === 'pan'
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
      style={{ touchAction: 'none', overscrollBehavior: 'none', WebkitOverflowScrolling: 'auto' } as React.CSSProperties}
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
          style={{ touchAction: 'none' }}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onContextMenu={handleContextMenu}
          onTouchStart={handleOverlayTouchStart}
          onTouchMove={handleOverlayTouchMove}
          onTouchEnd={handleOverlayTouchEnd}
        />
      </div>

      {/* Selected annotation info popup — desktop only */}
      {!isMobile && selectedAnnotation && selectedPayItem && (
        <div className="absolute top-3 right-3 bg-card border border-border rounded-md shadow-lg p-3 z-20 min-w-[240px] max-w-[320px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: selectedPayItem.color }} />
            <span className="text-xs font-semibold truncate">{selectedPayItem.name}</span>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>Type: {selectedAnnotation.type}</p>
            <p>Calc'd Qty: {selectedAnnotation.measurement.toFixed(2)} {selectedAnnotation.measurementUnit}</p>
            {selectedAnnotation.depth && <p>Depth: {selectedAnnotation.depth} ft</p>}
            <p>Page: {selectedAnnotation.page}</p>
          </div>

          {/* Manual quantity override */}
          {onUpdateAnnotation && (
            <div className="mt-2 space-y-1.5">
              <div>
                <label className="text-[10px] text-muted-foreground">Override Qty:</label>
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    value={selectedAnnotation.manualQuantity ?? ''}
                    placeholder={selectedAnnotation.measurement.toFixed(2)}
                    onChange={e => {
                      const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                      onUpdateAnnotation(selectedAnnotation.id, { manualQuantity: val });
                    }}
                    className="h-6 w-20 px-1.5 text-[10px] border border-input rounded-sm bg-background font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground">{selectedAnnotation.measurementUnit}</span>
                  {selectedAnnotation.manualQuantity != null && (
                    <button
                      onClick={() => onUpdateAnnotation(selectedAnnotation.id, { manualQuantity: undefined })}
                      className="text-[9px] text-primary hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Location:</label>
                <input
                  type="text"
                  value={selectedAnnotation.location || ''}
                  placeholder="e.g. Station 42+00"
                  onChange={e => onUpdateAnnotation(selectedAnnotation.id, { location: e.target.value })}
                  className="h-6 w-full px-1.5 text-[10px] border border-input rounded-sm bg-background"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Notes:</label>
                <input
                  type="text"
                  value={selectedAnnotation.notes || ''}
                  placeholder="Inspector notes…"
                  onChange={e => onUpdateAnnotation(selectedAnnotation.id, { notes: e.target.value })}
                  className="h-6 w-full px-1.5 text-[10px] border border-input rounded-sm bg-background"
                />
              </div>
            </div>
          )}

          {/* Reassign pay item */}
          {onUpdateAnnotation && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground mb-1">Reassign to:</p>
              <Select
                value={selectedAnnotation.payItemId}
                onValueChange={(newId) => {
                  const newItem = payItems.find(p => p.id === newId);
                  if (newItem) {
                    onUpdateAnnotation(selectedAnnotation.id, { payItemId: newId });
                  }
                }}
              >
                <SelectTrigger className="h-7 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {payItems.filter(p => p.drawable).map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name} ({UNIT_LABELS[p.unit]})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
