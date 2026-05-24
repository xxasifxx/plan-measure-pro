// Serialize the (possibly mutated) DOM back to a PMXML string. Because parser.ts
// hands us the live XMLDocument, applying progress edits + this serializer is a
// round-trip: every element we didn't touch is byte-identical (modulo whitespace).
import type { P6Tables } from './types';

export function serializeP6Xml(tables: P6Tables): string {
  const xml = new XMLSerializer().serializeToString(tables.doc);
  // Ensure an XML declaration is present (some browsers omit it).
  return xml.startsWith('<?xml')
    ? xml
    : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

/** Trigger a browser download of the updated PMXML. */
export function downloadP6Xml(tables: P6Tables, filename?: string) {
  const xml = serializeP6Xml(tables);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${tables.project.id}_update.xml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
