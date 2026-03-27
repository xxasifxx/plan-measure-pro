import { FileUp, Ruler, PenTool, BarChart3 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  onFileUpload: (file: File) => void;
}

const steps = [
  { icon: FileUp, title: 'Upload Plans', desc: 'Load your NJTA/NJDOT contract plan set' },
  { icon: Ruler, title: 'Calibrate Scale', desc: 'Set a known dimension from the plan' },
  { icon: PenTool, title: 'Draw Takeoffs', desc: 'Measure areas, lengths & counts' },
  { icon: BarChart3, title: 'Export Summary', desc: 'Get audit-ready quantity reports' },
];

export function EmptyState({ onFileUpload }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') onFileUpload(file);
  }, [onFileUpload]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'application/pdf') onFileUpload(file);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 blueprint-grid">
      <div className="w-full max-w-lg text-center">
        {/* Drop zone */}
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center w-full py-16 px-8 rounded-xl border-2 border-dashed cursor-pointer transition-all',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-border hover:border-primary/50 hover:bg-card/80'
          )}
        >
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <FileUp className="h-10 w-10 text-primary" />
          </div>
          <p className="text-base font-bold text-foreground mb-1">
            Drop your plan set here
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            NJTA & NJDOT construction PDFs supported
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-md hover:bg-primary/90 transition-colors">
            <FileUp className="h-4 w-4" />
            Choose File
          </div>
          <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
        </label>

        {/* Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground">{step.title}</span>
              <span className="text-[10px] text-muted-foreground leading-relaxed text-center">{step.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
