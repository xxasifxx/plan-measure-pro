import { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Navigation, X, Check, AlertTriangle, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PointXY } from '@/types/project';
import type { GeoControlPoint, GeoCalibration, GpsCoord } from '@/lib/geo-transform';
import { buildGeoCalibration } from '@/lib/geo-transform';

interface Props {
  onComplete: (cal: GeoCalibration) => void;
  onCancel: () => void;
  /** Called when wizard needs user to tap a point on the plan */
  onRequestPlanTap: (callback: (point: PointXY) => void) => void;
  existingCalibration?: GeoCalibration | null;
}

type Step = 'intro' | 'waiting-gps' | 'waiting-plan' | 'confirm' | 'done';

export function GpsCalibration({ onComplete, onCancel, onRequestPlanTap, existingCalibration }: Props) {
  const [controlPoints, setControlPoints] = useState<GeoControlPoint[]>(
    existingCalibration?.controlPoints || []
  );
  const [step, setStep] = useState<Step>(existingCalibration ? 'confirm' : 'intro');
  const [currentGps, setCurrentGps] = useState<GpsCoord | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const captureGps = useCallback(() => {
    setGpsError(null);
    setStep('waiting-gps');

    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device');
      return;
    }

    // Clear previous watch
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsAccuracy(pos.coords.accuracy);
      },
      (err) => {
        setGpsError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  }, []);

  const confirmGpsAndRequestPlan = useCallback(() => {
    if (!currentGps) return;
    // Stop watching
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setStep('waiting-plan');
    const capturedGps = { ...currentGps };

    onRequestPlanTap((planPoint: PointXY) => {
      setControlPoints(prev => {
        const updated = [...prev, { gps: capturedGps, plan: planPoint }];
        if (updated.length >= 2) {
          setStep('confirm');
        } else {
          setStep('intro');
        }
        return updated;
      });
    });
  }, [currentGps, onRequestPlanTap]);

  const finalize = useCallback(() => {
    if (controlPoints.length < 2) return;
    try {
      const cal = buildGeoCalibration(controlPoints);
      onComplete(cal);
    } catch (err) {
      setGpsError(String(err));
    }
  }, [controlPoints, onComplete]);

  const removePoint = useCallback((idx: number) => {
    setControlPoints(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      if (updated.length < 2) setStep('intro');
      return updated;
    });
  }, []);

  const accuracyFt = gpsAccuracy ? (gpsAccuracy * 3.28084).toFixed(1) : null;
  const isAccuracyPoor = gpsAccuracy != null && gpsAccuracy > 10;

  return (
    <div className="absolute top-4 left-4 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
        <Navigation className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold font-mono tracking-wide">GPS CALIBRATION</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {/* Control points list */}
        {controlPoints.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Control Points</span>
            {controlPoints.map((cp, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 text-xs font-mono">
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">
                  {cp.gps.lat.toFixed(6)}, {cp.gps.lng.toFixed(6)}
                </span>
                <button onClick={() => removePoint(i)} className="ml-auto text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Step: Intro / add more */}
        {step === 'intro' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {controlPoints.length === 0
                ? 'Stand at a known point on the job site (survey monument, station marker). Tap below to capture GPS, then tap the matching spot on the plan.'
                : `${controlPoints.length}/3 points captured. Add ${controlPoints.length < 2 ? 'at least 1 more' : 'another for better accuracy'}.`}
            </p>
            <Button onClick={captureGps} className="w-full gap-2" size="sm">
              <Crosshair className="h-4 w-4" />
              Capture GPS Position
            </Button>
          </div>
        )}

        {/* Step: Waiting for GPS lock */}
        {step === 'waiting-gps' && (
          <div className="space-y-3">
            {gpsError ? (
              <div className="flex items-start gap-2 text-destructive text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            ) : currentGps ? (
              <div className="space-y-2">
                <div className="text-xs font-mono bg-muted/50 rounded-lg p-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lat:</span>
                    <span>{currentGps.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lng:</span>
                    <span>{currentGps.lng.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <span className={cn(isAccuracyPoor ? 'text-destructive' : 'text-green-500')}>
                      ±{accuracyFt} ft
                    </span>
                  </div>
                </div>
                {isAccuracyPoor && (
                  <p className="text-[10px] text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Poor GPS accuracy. Move to open sky if possible.
                  </p>
                )}
                <Button onClick={confirmGpsAndRequestPlan} className="w-full gap-2" size="sm">
                  <Check className="h-4 w-4" />
                  Use This Position
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                Acquiring GPS signal…
              </div>
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep('intro')}>
              Cancel
            </Button>
          </div>
        )}

        {/* Step: Waiting for plan tap */}
        {step === 'waiting-plan' && (
          <div className="space-y-2 text-center">
            <div className="h-3 w-3 rounded-full bg-primary animate-pulse mx-auto" />
            <p className="text-xs text-muted-foreground">
              Now tap the matching point on the plan sheet.
            </p>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep('intro')}>
              Cancel
            </Button>
          </div>
        )}

        {/* Step: Confirm / finalize */}
        {step === 'confirm' && controlPoints.length >= 2 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {controlPoints.length} control points set.
              {controlPoints.length < 3 && ' Add a 3rd point for better skew correction.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={captureGps} variant="outline" size="sm" className="flex-1 gap-1" disabled={controlPoints.length >= 3}>
                <Crosshair className="h-3 w-3" />
                Add Point
              </Button>
              <Button onClick={finalize} size="sm" className="flex-1 gap-1">
                <Check className="h-3 w-3" />
                Calibrate
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
