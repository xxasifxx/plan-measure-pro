// Tolerant PMXML parser. We keep the live DOM so mutations + serialization
// preserve every element/attribute that we don't explicitly touch — Oracle P6
// rejects round-tripped files that drop unknown nodes, so this is non-negotiable.
import type { P6Activity, P6PctType, P6Status, P6Tables } from './types';

function childText(parent: Element, name: string): string | undefined {
  // PMXML uses an XML namespace on the root; child element local names match.
  for (const c of Array.from(parent.children)) {
    if (c.localName === name) return c.textContent?.trim() || undefined;
  }
  return undefined;
}

function childNum(parent: Element, name: string): number | undefined {
  const t = childText(parent, name);
  if (t === undefined || t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function parseP6Xml(xmlText: string): P6Tables {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parseError = doc.getElementsByTagName('parsererror')[0];
  if (parseError) {
    throw new Error(`Invalid PMXML: ${parseError.textContent || 'parse error'}`);
  }
  const root = doc.documentElement;
  if (!root || root.localName !== 'APIBusinessObjects') {
    throw new Error(`Expected <APIBusinessObjects> root, got <${root?.localName || 'null'}>`);
  }
  const namespaceURI = root.namespaceURI;

  const projectEl = Array.from(root.children).find(c => c.localName === 'Project');
  if (!projectEl) throw new Error('PMXML contains no <Project>');

  const project = {
    _el: projectEl,
    objectId: childText(projectEl, 'ObjectId'),
    id: childText(projectEl, 'Id') || 'UNKNOWN',
    name: childText(projectEl, 'Name'),
    dataDate: childText(projectEl, 'DataDate'),
    plannedStartDate: childText(projectEl, 'PlannedStartDate'),
    mustFinishByDate: childText(projectEl, 'MustFinishByDate'),
  };

  const activities: P6Activity[] = Array.from(projectEl.children)
    .filter(c => c.localName === 'Activity')
    .map(el => ({
      _el: el,
      objectId: childText(el, 'ObjectId'),
      id: childText(el, 'Id') || '',
      name: childText(el, 'Name'),
      status: childText(el, 'Status') as P6Status | undefined,
      pctType: childText(el, 'PercentCompleteType') as P6PctType | undefined,
      physicalPctComplete: childNum(el, 'PhysicalPercentComplete'),
      durationPctComplete: childNum(el, 'DurationPercentComplete'),
      actualStartDate: childText(el, 'ActualStartDate'),
      actualFinishDate: childText(el, 'ActualFinishDate'),
      plannedDuration: childNum(el, 'PlannedDuration'),
      remainingDuration: childNum(el, 'RemainingDuration'),
      atCompletionDuration: childNum(el, 'AtCompletionDuration'),
    }))
    .filter(a => a.id);

  // Schema version is encoded in the namespace URI (e.g. .../V22.12/...)
  const schemaVersion = namespaceURI?.match(/\/V([\d.]+)\//)?.[1];

  return { doc, project, activities, namespaceURI, schemaVersion };
}
