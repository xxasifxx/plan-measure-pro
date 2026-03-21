export interface TocEntry {
  label: string;
  sheetNo: string;
  startPage: number;
  endPage: number;
}

export type PayItemUnit = 'SF' | 'LF' | 'CY' | 'SY' | 'EA' | 'TON' | 'LS' | 'USD' | 'MNTH';

export const DRAWABLE_UNITS = new Set<PayItemUnit>(['SF', 'LF', 'CY', 'SY', 'EA']);

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
  itemNumber: number;
  itemCode: string;
  name: string;
  unit: PayItemUnit;
  unitPrice: number;
  color: string;
  contractQuantity?: number;
  drawable: boolean;
}

/**
 * Get the section number (e.g., 100, 500) from a unit code like "104-0001" or "510-N0059".
 * Section = first digit × 100.
 */
export function getPayItemSection(itemCode: string): number {
  const match = itemCode.match(/^(\d)/);
  if (!match) return 0;
  return parseInt(match[1]) * 100;
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
  type: 'line' | 'polygon' | 'count';
  points: PointXY[];
  payItemId: string;
  page: number;
  depth?: number; // feet, for volume calc
  measurement: number; // LF or SF or 1 for count
  measurementUnit: string;
  manualQuantity?: number; // overrides measurement when set
  location?: string; // e.g. "Station 42+00, NB lane"
  notes?: string; // inspector remarks
  createdAt?: string;
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

export type ToolMode = 'select' | 'calibrate' | 'line' | 'polygon' | 'pan' | 'tocSelect' | 'count';

export const DEFAULT_PAY_ITEMS: PayItem[] = [];
