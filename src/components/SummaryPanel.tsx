import { X, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import type { Annotation, PayItem } from '@/types/project';
import { UNIT_LABELS, getPayItemSection } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sfToCY, sfToSY } from '@/lib/geometry';

interface Props {
  annotations: Annotation[];
  payItems: PayItem[];
  projectName: string;
  contractNumber: string;
  onClose: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onExportDaily?: () => void;
  onUpdatePayItems?: (items: PayItem[]) => void;
  embedded?: boolean;
}

interface SummaryRow {
  payItem: PayItem;
  totalQuantity: number;
  displayUnit: string;
  extendedCost: number;
  count: number;
  manualQuantity?: number;
}

export function SummaryPanel({
  annotations, payItems, projectName, contractNumber,
  onClose, onExportCsv, onExportPdf, onExportDaily, embedded,
}: Props) {
  const [manualQuantities, setManualQuantities] = useState<Record<string, number>>({});

  const rows: SummaryRow[] = payItems.map(item => {
    if (!item.drawable) {
      const manualQty = manualQuantities[item.id] ?? item.contractQuantity ?? 0;
      return {
        payItem: item,
        totalQuantity: manualQty,
        displayUnit: UNIT_LABELS[item.unit],
        extendedCost: manualQty * item.unitPrice,
        count: 0,
        manualQuantity: manualQty,
      };
    }

    const itemAnns = annotations.filter(a => a.payItemId === item.id);
    let totalQuantity = 0;

    for (const ann of itemAnns) {
      const qty = ann.manualQuantity != null ? ann.manualQuantity : (() => {
        if (ann.type === 'count') return 1;
        if (ann.depth && ann.depth > 0) return sfToCY(ann.measurement, ann.depth);
        if (item.unit === 'SY') return sfToSY(ann.measurement);
        return ann.measurement;
      })();
      totalQuantity += qty;
    }

    return {
      payItem: item,
      totalQuantity,
      displayUnit: UNIT_LABELS[item.unit],
      extendedCost: totalQuantity * item.unitPrice,
      count: itemAnns.length,
    };
  }).filter(r => r.count > 0 || !r.payItem.drawable);

  const grandTotal = rows.reduce((sum, r) => sum + r.extendedCost, 0);

  const updateManualQty = (itemId: string, value: number) => {
    setManualQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-sm font-bold">Quantity Takeoff Summary</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {projectName} {contractNumber && `• ${contractNumber}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExportCsv} className="text-xs h-7">
            <Download className="h-3 w-3 mr-1" />CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={onExportPdf} className="text-xs h-7">
            <FileText className="h-3 w-3 mr-1" />PDF
          </Button>
          {onExportDaily && (
            <Button variant="ghost" size="sm" onClick={onExportDaily} className="text-xs h-7">
              <FileSpreadsheet className="h-3 w-3 mr-1" />Daily
            </Button>
          )}
          {!embedded && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No measurements yet. Draw annotations on the plans to see quantities here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Item #</th>
                  <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Description</th>
                  <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Unit</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Qty</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Price</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Extended</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sections = new Map<number, SummaryRow[]>();
                  for (const row of rows) {
                    const sec = getPayItemSection(row.payItem.itemCode);
                    if (!sections.has(sec)) sections.set(sec, []);
                    sections.get(sec)!.push(row);
                  }
                  const sortedSections = Array.from(sections.entries()).sort((a, b) => a[0] - b[0]);
                  
                  return sortedSections.map(([sec, sectionRows]) => (
                    <>
                      <tr key={`section-${sec}`}>
                        <td colSpan={6} className="py-1.5 px-2 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground bg-muted/30">
                          Section {sec}
                        </td>
                      </tr>
                      {sectionRows.map(row => (
                        <tr key={row.payItem.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-2 font-mono">{row.payItem.itemNumber}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: row.payItem.color }} />
                              <span className="truncate">{row.payItem.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2">{row.displayUnit}</td>
                          <td className="text-right py-2 px-2 font-mono">
                            {row.payItem.drawable ? (
                              row.totalQuantity.toFixed(1)
                            ) : (
                              <Input
                                type="number"
                                value={row.manualQuantity ?? 0}
                                onChange={e => updateManualQty(row.payItem.id, parseFloat(e.target.value) || 0)}
                                className="h-6 w-20 text-xs text-right inline-block"
                              />
                            )}
                          </td>
                          <td className="text-right py-2 px-2 font-mono">${row.payItem.unitPrice.toFixed(2)}</td>
                          <td className="text-right py-2 px-2 font-mono font-semibold">
                            ${(row.payItem.drawable ? row.extendedCost : (row.manualQuantity ?? 0) * row.payItem.unitPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </>
                  ));
                })()}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={5} className="py-3 px-2 font-bold text-right">Grand Total</td>
                  <td className="py-3 px-2 font-bold text-right font-mono text-primary">
                    ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col h-full bg-background">{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-md shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {content}
      </div>
    </div>
  );
}
