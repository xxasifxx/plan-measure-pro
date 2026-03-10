export interface TocEntry {
  label: string;
  sheetNo: string;
  startPage: number;
  endPage: number;
}

export type PayItemUnit = 'SF' | 'LF' | 'CY' | 'SY' | 'EA' | 'TON' | 'LS' | 'USD' | 'MNTH';

export const DRAWABLE_UNITS = new Set<PayItemUnit>(['SF', 'LF', 'CY', 'SY']);

export function isDrawableUnit(unit: PayItemUnit): boolean {
  return DRAWABLE_UNITS.has(unit);
}

export const UNIT_LABELS: Record<PayItemUnit, string> = {
  SF: 'S.F.',
  LF: 'L.F.',
  CY: 'C.Y.',
  SY: 'S.Y.',
  EA: 'EACH',
  TON: 'TON',
  LS: 'L.S.',
  USD: 'USD',
  MNTH: 'MNTH',
};

export interface PayItem {
  id: string;
  itemCode: string;
  name: string;
  unit: PayItemUnit;
  unitPrice: number;
  color: string;
  contractQuantity?: number;
  drawable: boolean;
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

export type ToolMode = 'select' | 'calibrate' | 'line' | 'polygon' | 'pan' | 'tocSelect';

export const DEFAULT_PAY_ITEMS: PayItem[] = [];
