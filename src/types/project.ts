export interface TocEntry {
  label: string;
  page: number;
}

export interface PayItem {
  id: string;
  name: string;
  unit: 'SF' | 'LF' | 'CY' | 'EA' | 'SY' | 'TON' | 'LS';
  unitPrice: number;
  color: string;
}

export interface PointXY {
  x: number;
  y: number;
}

export interface Calibration {
  point1: PointXY;
  point2: PointXY;
  realDistance: number; // in feet
  pixelsPerFoot: number;
}

export interface Annotation {
  id: string;
  type: 'line' | 'polygon';
  points: PointXY[];
  payItemId: string;
  page: number;
  depth?: number; // feet, for volume calc
  measurement: number; // LF or SF
  measurementUnit: string;
}

export interface Project {
  id: string;
  name: string;
  contractNumber: string;
  pdfFileName: string;
  toc: TocEntry[];
  calibrations: Record<number, Calibration>; // keyed by page
  annotations: Annotation[];
  payItems: PayItem[];
  createdAt: string;
  updatedAt: string;
}

export type ToolMode = 'select' | 'calibrate' | 'line' | 'polygon' | 'pan';

export const DEFAULT_PAY_ITEMS: PayItem[] = [
  { id: 'exc', name: 'Unclassified Excavation', unit: 'CY', unitPrice: 12.50, color: '#e74c3c' },
  { id: 'hma', name: 'HMA Paving', unit: 'SY', unitPrice: 45.00, color: '#f39c12' },
  { id: 'conc', name: 'Concrete Sidewalk', unit: 'SF', unitPrice: 8.75, color: '#3498db' },
  { id: 'curb', name: 'Curb & Gutter', unit: 'LF', unitPrice: 22.00, color: '#2ecc71' },
  { id: 'pipe', name: 'Storm Pipe', unit: 'LF', unitPrice: 85.00, color: '#9b59b6' },
  { id: 'seed', name: 'Seeding & Mulch', unit: 'SY', unitPrice: 3.50, color: '#1abc9c' },
];
