

# GPS-to-Plan Georeferencing & Field Measurement

## Concept

An inspector stands at a known point on the job site, taps the corresponding point on the plan sheet, and captures their GPS coordinates. After calibrating with 2-3 control points, the app can map real-world GPS positions onto the plan in real time. The inspector then walks a line or perimeter and the app traces their path on the plan, automatically computing LF/SF/CY measurements.

## How It Works

```text
CALIBRATION (one-time per sheet)
─────────────────────────────────
1. Inspector stands at Point A (e.g., survey monument at STA 42+00)
   → Taps the matching spot on the plan sheet
   → App captures GPS (lat/lng) + plan pixel (x, y)

2. Repeats for Point B (e.g., centerline at STA 44+00)

3. Optionally Point C for rotation/skew correction

   Result: an affine transform matrix mapping GPS → plan pixels


FIELD MEASUREMENT
─────────────────
1. Inspector selects a pay item (e.g., "HMA Surface Course")
2. Taps "Start GPS Trace"
3. Walks the area boundary or along a line
4. App plots their GPS position on the plan in real time
5. Taps "Finish" → annotation is created with auto-calculated measurement
```

## Technical Design

### 1. Geo-Calibration Data Model

New fields on the project/page level:

```typescript
interface GeoControlPoint {
  gps: { lat: number; lng: number };
  plan: PointXY; // normalized plan coordinates
}

interface GeoCal