import { X, Download, FileText, FileSpreadsheet, CalendarIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Annotation, PayItem } from '@/types/project';
import { UNIT_LABELS, getPayItemSection } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { sfToCY, sfToSY } from '@/lib/geometry';
import { cn } from '@/lib/utils';

interface Props {
  annotations: Annotation[];
  payItems: PayItem[];
  projectName: string;
  contractNumber: string;
  onClose: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  onExportDaily?: (date?: Date) => void;
  onAddManualAnnotation?: (annotation: Annotation) => void;
  onUpdateManualAnnotation?: (id: string, changes: Partial<Annotation>) => void;
  embedded?: boolean;
}

interface SummaryRow {
  payItem: PayItem;
  totalQuantity: number;
  displayUnit: string;
  extendedCost: number;
  count: number;
  manualAnnotation?: Annotation;
  contractQuantity?: number;
  variancePercent?: number;
}

export function SummaryPanel({
  annotations, payItems, projectName, contractNumber,
  onClose, onExportCsv, onExportPdf, onExportDaily,
  onAddManualAnnotation, onUpdateManualAnnotation, embedded,
}: Props) {
  const [dailyDate, setDailyDate] = useState<Date>(new Date());

  // Find existing manual annotations for non-drawable items
  const getManualAnnotation = (payItemId: string): Annotation | undefined =>
    annotations.find(a => a.type === 'manual' && a.payItemId === payItemId);

  const rows: SummaryRow[] = payItems.map(item => {
    if (!item.drawable) {
      const manualAnn = getManualAnnotation(item.id);
      const manualQty = manualAnn?.manualQuantity ?? 0;
      return {
        payItem: item,
        totalQuantity: manualQty,
        displayUnit: UNIT_LABELS[item.unit],
        extendedCost: manualQty * item.unitPrice,
        count: manualAnn ? 1 : 0,
        manualAnnotation: manualAnn,
        contractQuantity: item.contractQuantity,
      };
    }

    const itemAnns = annotations.filter(a => a.payItemId === item.id && a.type !== 'manual');
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

    const contractQty = item.contractQuantity;
    const variancePercent = contractQty && contractQty > 0
      ? ((totalQuantity - contractQty) / contractQty) * 100
      : undefined;

    return {
      payItem: item,
      totalQuantity,
      displayUnit: UNIT_LABELS[item.unit],
      extendedCost: totalQuantity * item.unitPrice,
      count: itemAnns.length,
      contractQuantity: contractQty,
      variancePercent,
    };
  }).filter(r => r.count > 0 || !r.payItem.drawable);

  const grandTotal = rows.reduce((sum, r) => sum + r.extendedCost, 0);

  const handleManualQtyChange = (item: PayItem, value: number) => {
    const existing = getManualAnnotation(item.id);
    if (existing) {
      // Update existing manual annotation
      onUpdateManualAnnotation?.(existing.id, { manualQuantity: value });
    } else {
      // Create new manual annotation
      onAddManualAnnotation?.({
        id: crypto.randomUUID(),
        type: 'manual',
        points: [],
        payItemId: item.id,
        page: 0,
        measurement: 0,
        measurementUnit: UNIT_LABELS[item.unit],
        manualQuantity: value,
      });
    }
  };

  const getVarianceColor = (pct: number | undefined) => {
    if (pct === undefined) return '';
    if (pct <= 0) return 'text-green-600 dark:text-green-400';
    if (pct <= 10) return 'text-amber-600 dark:text-amber-400';
    return 'text-destructive';
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
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs h-7 px-1.5">
                    <CalendarIcon className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dailyDate}
                    onSelect={(d) => d && setDailyDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    disabled={(d) => d > new Date()}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="sm" onClick={() => onExportDaily(dailyDate)} className="text-xs h-7">
                <FileSpreadsheet className="h-3 w-3 mr-1" />Daily {format(dailyDate, 'M/d')}
              </Button>
            </div>
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
            <table className="w-full text-xs min-w-[650px]">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-2.5 px-3 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Item #</th>
                  <th className="text-left py-2.5 px-3 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Description</th>
                  <th className="text-left py-2.5 px-3 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Unit</th>
                  <th className="text-right py-2.5 px-3 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Measured</th>
                  <th className="text-right py-2.5 px-3 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Contract</th>
                  <th className="text-right py-2.5 px-3 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Var %</th>
                  <th className="text-right py-2.5 px-3 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Price</th>
                  <th className="text-right py-2.5 px-3 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Extended</th>
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
                    <>{/* Section group */}
                      <tr key={`section-${sec}`}>
                        <td colSpan={8} className="py-2 px-3 text-[11px] uppercase tracking-widest font-bold text-muted-foreground bg-muted/50 border-b border-border">
                          Section {sec}
                        </td>
                      </tr>
                      {sectionRows.map((row, rowIdx) => (
                        <tr key={row.payItem.id} className={cn(
                          'border-b border-border/50 hover:bg-muted/30 transition-colors',
                          rowIdx % 2 === 1 ? 'bg-muted/20' : ''
                        )}>
                          <td className="py-2.5 px-3 font-mono">{row.payItem.itemNumber}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: row.payItem.color }} />
                              <span className="truncate">{row.payItem.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono">{row.displayUnit}</td>
                          <td className="text-right py-2.5 px-3 font-mono font-semibold">
                            {row.payItem.drawable ? (
                              row.totalQuantity.toFixed(1)
                            ) : (
                              <Input
                                type="number"
                                value={row.manualAnnotation?.manualQuantity ?? 0}
                                onChange={e => handleManualQtyChange(row.payItem, parseFloat(e.target.value) || 0)}
                                className="h-7 w-20 text-xs text-right inline-block"
                              />
                            )}
                          </td>
                          <td className="text-right py-2.5 px-3 font-mono text-muted-foreground">
                            {row.contractQuantity != null ? row.contractQuantity.toFixed(1) : '—'}
                          </td>
                          <td className={cn("text-right py-2.5 px-3 font-mono text-[11px] font-bold", getVarianceColor(row.variancePercent))}>
                            {row.variancePercent !== undefined
                              ? `${row.variancePercent > 0 ? '+' : ''}${row.variancePercent.toFixed(0)}%`
                              : '—'}
                          </td>
                          <td className="text-right py-2.5 px-3 font-mono">${row.payItem.unitPrice.toFixed(2)}</td>
                          <td className="text-right py-2.5 px-3 font-mono font-bold">
                            ${row.extendedCost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </>
                  ));
                })()}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={7} className="py-3.5 px-3 font-bold text-right text-sm">Grand Total</td>
                  <td className="py-3.5 px-3 font-bold text-right font-mono text-primary text-sm">
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
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {content}
      </div>
    </div>
  );
}
