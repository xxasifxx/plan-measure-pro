// Subset of the P6 PMXML schema we read/write. We keep the original DOM
// alongside the parsed projection so unknown elements survive a round-trip
// untouched — Oracle P6 is strict about importing files it didn't write.

export type P6Status = 'Not Started' | 'In Progress' | 'Completed';
export type P6PctType = 'Physical' | 'Duration' | 'Units' | 'Scope';

export interface P6ProjectMeta {
  objectId?: string;
  id: string;                  // e.g. "NJTA-104"
  name?: string;
  dataDate?: string;           // ISO without TZ
  plannedStartDate?: string;
  mustFinishByDate?: string;
}

export interface P6Activity {
  objectId?: string;
  id: string;                  // Activity ID — stable matching key
  name?: string;
  status?: P6Status;
  pctType?: P6PctType;
  physicalPctComplete?: number;   // 0-100
  durationPctComplete?: number;   // 0-100
  actualStartDate?: string;
  actualFinishDate?: string;
  plannedDuration?: number;       // hours
  remainingDuration?: number;     // hours
  atCompletionDuration?: number;  // hours
  // pointer to live DOM element (for round-trip mutations)
  _el?: Element;
}

export interface P6Tables {
  /** Root document — preserved for serialization. */
  doc: XMLDocument;
  /** The first <Project> element parsed (this demo handles single-project PMXML). */
  project: P6ProjectMeta & { _el: Element };
  activities: P6Activity[];
  /** Namespace URI of the root, if any. */
  namespaceURI: string | null;
  /** Schema version label (from comment / root attribute), purely informational. */
  schemaVersion?: string;
}

export interface ApprovedDailyReport {
  /** ISO date of the field observation (YYYY-MM-DD). */
  date: string;
  /** Activity ID this report rolls up to. */
  activityId: string;
  /** Cumulative installed quantity through this date. */
  cumulativeQty: number;
  /** Contract quantity for the activity (denominator for physical %). */
  contractQty: number;
  /** Inspector marked the activity complete. */
  isComplete?: boolean;
  notes?: string;
  /** Always true in this prototype — RE approval is the upstream gate. */
  approvedByRE: true;
  inspector?: string;
}

export interface ActivityChange {
  activityId: string;
  activityName: string;
  beforeStatus?: P6Status;
  afterStatus?: P6Status;
  beforePct?: number;
  afterPct?: number;
  beforeRemainHr?: number;
  afterRemainHr?: number;
  actualStartSet?: string;
  actualFinishSet?: string;
  sourceReports: number;
}

export interface ApplyResult {
  tables: P6Tables;
  changeLog: ActivityChange[];
  newDataDate: string;
}
