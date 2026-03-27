import { useState, useCallback, useRef, useEffect } from 'react';
import { Navigation, Square, Pause, Play, MapPin, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PointXY, Annotation, PayItem } from '@/types/project';
import type { GeoCalibration, GpsCoord, KalmanState } from '@/lib/geo-transform';
import { gpsToplan, initKalman, updateKalman } from '@/lib/geo-transform';
import { distancePx, polygonAreaSF } from '@/lib/geometry';

interface Props {
  geoCalibration: GeoCalibration;
  scaleCalibration: { pixelsPerFoot: number } | null;
  activePayItem: PayItem | undefined;
  currentPage: number;
  onAddAnnotation: (ann: Annotation) => void;
  /** Feed the current GPS-mapped plan position to the canvas */
  onPositionUpdate: (pos: PointXY | null) => void;
  onTracePointsUpdate: (points: PointXY[]) => void;
}

type TraceMode = 'idle' | 'tracing' | 'paused';

export function GpsTraceControls({
  geoCalibration, scaleCalibration, activePayItem, currentPage,
  onAddAnnotation, onPositionUpdate, onTracePointsUpdate,
}: Props) {
  const [mode, setMode] = useState<TraceMode>('idle');
  const [tracePoints, setTracePoints] = useState<PointXY[]>([]);
  const [currentPos, setCurrentPos] = useState<PointXY | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [runningDistance, setRunningDistance] = useState(0);
  const [runningArea, setRunningArea] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const kalmanRef = useRef<KalmanState | null>(null);
  const lastAddedRef = useRef<PointXY | null>(null);

  // Minimum distance (in plan pixels at scale=1) between trace points
  const MIN_POINT_SPACING = 5;

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      onPositionUpdate(null);
    };
  }, []);

  const startTrace = useCallback(() => {
    if (!navigator.geolocation) return;

    setMode('tracing');
    setTracePoints([]);
    setRunningDistance(0);
    setRunningArea(0);
    lastAddedRef.current = null;
    kalmanRef.current = null;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const gps: GpsCoord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy;
        const now = pos.timestamp;

        // Apply Kalman filter
        if (!kalmanRef.current) {
          kalmanRef.current = initKalman(gps, accuracy, now);
        } else {
          kalmanRef.current = updateKalman(kalmanRef.current, gps, accuracy, now);
        }

        const smoothed: GpsCoord = { lat: kalmanRef.current.lat, lng: kalmanRef.current.lng };
        const planPos = gpsToplan(geoCalibration, smoothed);

        setCurrentPos(planPos);
        setGpsAccuracy(accuracy);
        onPositionUpdate(planPos);

        // Add to trace if far enough from last point
        if (!lastAddedRef.current || distancePx(planPos, lastAddedRef.current) >= MIN_POINT_SPACING) {
          lastAddedRef.current = planPos;
          setTracePoints(prev => {
            const updated = [...prev, planPos];
            onTracePointsUpdate(updated);

            // Update running measurements
            if (updated.length >= 2 && scaleCalibration) {
              const ppf = scaleCalibration.pixelsPerFoot;
              // Total distance
              let dist = 0;
              for (let i = 1; i < updated.length; i++) {
                dist += distancePx(updated[i - 1], updated[i]) / ppf;
              }
              setRunningDistance(dist);

              // Area if 3+ points
              if (updated.length >= 3) {
                setRunningArea(polygonAreaSF(updated, ppf));
              }
            }
            return updated;
          });
        }
      },
      () => { /* ignore errors during trace */ },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, [geoCalibration, scaleCalibration, onPositionUpdate, onTracePointsUpdate]);

  const pauseTrace = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setMode('paused');
  }, []);

  const resumeTrace = useCallback(() => {
    setMode('tracing');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const gps: GpsCoord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const accuracy = pos.coords.accuracy;
        const now = pos.timestamp;

        if (kalmanRef.current) {
          kalmanRef.current = updateKalman(kalmanRef.current, gps, accuracy, now);
        } else {
          kalmanRef.current = initKalman(gps, accuracy, now);
        }

        const smoothed: GpsCoord = { lat: kalmanRef.current.lat, lng: kalmanRef.current.lng };
        const planPos = gpsToplan(geoCalibration, smoothed);

        setCurrentPos(planPos);
        setGpsAccuracy(accuracy);
        onPositionUpdate(planPos);

        if (!lastAddedRef.current || distancePx(planPos, lastAddedRef.current) >= MIN_POINT_SPACING) {
          lastAddedRef.current = planPos;
          setTracePoints(prev => {
            const updated = [...prev, planPos];
            onTracePointsUpdate(updated);
            if (updated.length >= 2 && scaleCalibration) {
              const ppf = scaleCalibration.pixelsPerFoot;
              let dist = 0;
              for (let i = 1; i < updated.length; i++) {
                dist += distancePx(updated[i - 1], updated[i]) / ppf;
              }
              setRunningDistance(dist);
              if (updated.length >= 3) {
                setRunningArea(polygonAreaSF(updated, ppf));
              }
            }
            return updated;
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }, [geoCalibration, scaleCalibration, onPositionUpdate, onTracePointsUpdate]);

  const finishTrace = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    onPositionUpdate(null);

    if (tracePoints.length < 2 || !activePayItem || !scaleCalibration) {
      setMode('idle');
      setTracePoints([]);
      onTracePointsUpdate([]);
      return;
    }

    const ppf = scaleCalibration.pixelsPerFoot;
    const isArea = ['SF', 'SY', 'CY'].includes(activePayItem.unit);
    const isLine = activePayItem.unit === 'LF';

    if (isLine) {
      let totalDist = 0;
      for (let i = 1; i < tracePoints.length; i++) {
        totalDist += distancePx(tracePoints[i - 1], tracePoints[i]) / ppf;
      }
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'line',
        points: [tracePoints[0], tracePoints[tracePoints.length - 1]],
        payItemId: activePayItem.id,
        page: currentPage,
        measurement: totalDist,
        measurementUnit: 'LF',
        notes: 'GPS trace',
      });
    } else if (isArea && tracePoints.length >= 3) {
      const areaSF = polygonAreaSF(tracePoints, ppf);
      let measurement = areaSF;
      let unit = 'SF';
      if (activePayItem.unit === 'SY') { measurement = areaSF / 9; unit = 'SY'; }
      if (activePayItem.unit === 'CY') {
        // Default 1ft depth for GPS traces — user can edit
        measurement = (areaSF * 1) / 27;
        unit = 'CY';
      }
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'polygon',
        points: tracePoints,
        payItemId: activePayItem.id,
        page: currentPage,
        measurement,
        measurementUnit: unit,
        depth: activePayItem.unit === 'CY' ? 1 : undefined,
        notes: 'GPS trace',
      });
    }

    setMode('idle');
    setTracePoints([]);
    onTracePointsUpdate([]);
  }, [tracePoints, activePayItem, scaleCalibration, currentPage, onAddAnnotation, onPositionUpdate, onTracePointsUpdate]);

  const cancelTrace = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setMode('idle');
    setTracePoints([]);
    setCurrentPos(null);
    onPositionUpdate(null);
    onTracePointsUpdate([]);
  }, [onPositionUpdate, onTracePointsUpdate]);

  const accuracyFt = gpsAccuracy ? (gpsAccuracy * 3.28084).toFixed(0) : null;
  const isAccuracyPoor = gpsAccuracy != null && gpsAccuracy > 10;

  if (mode === 'idle') {
    return (
      <Button
        onClick={startTrace}
        size="sm"
        className="gap-1.5"
        disabled={!activePayItem}
        title={!activePayItem ? 'Select a pay item first' : 'Start GPS trace'}
      >
        <Navigation className="h-4 w-4" />
        <span className="text-xs font-mono">GPS Trace</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg">
      {/* Live indicator */}
      <div className={cn(
        'h-2.5 w-2.5 rounded-full shrink-0',
        mode === 'tracing' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
      )} />

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="text-muted-foreground">{tracePoints.length} pts</span>
        {scaleCalibration && (
          <>
            <span>{runningDistance.toFixed(0)} LF</span>
            {tracePoints.length >= 3 && <span>{runningArea.toFixed(0)} SF</span>}
          </>
        )}
        {accuracyFt && (
          <span className={cn('flex items-center gap-0.5', isAccuracyPoor ? 'text-amber-500' : 'text-green-500')}>
            {isAccuracyPoor && <AlertTriangle className="h-3 w-3" />}
            ±{accuracyFt}ft
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 ml-2">
        {mode === 'tracing' ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={pauseTrace}>
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resumeTrace}>
            <Play className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" className="h-8 gap-1" onClick={finishTrace}>
          <Square className="h-3 w-3" />
          Finish
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={cancelTrace}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
