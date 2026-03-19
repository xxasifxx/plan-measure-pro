import { FileUp, Ruler, PenTool, BarChart3 } from 'lucide-react';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  onFileUpload: (file: File) => void;
}

const steps = [
  { icon: FileUp, title: 'Upload Plans', desc: 'Load your construction PDF' },
  { icon: Ruler, title: 'Calibrate Scale', desc: 'Set a known dimension' },
  { icon: PenTool, title: 'Draw Takeoffs', desc: 'Measure areas & lengths' },
  { icon: BarChart3, title: 'Export Summary', desc: 'Get your quantities' },
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
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Drop zone */}
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center w-full py-12 px-6 rounded-xl border-2 border-dashed cursor-pointer transition-all',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          )}
        >
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <FileUp className="h-8 w-8 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Drop your PDF here
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            or tap to browse
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            <FileUp className="h-4 w-4" />
            Choose File
          </div>
          <input type="file" accept=".pdf" onChange={handleFile} className="hidden" />
        </label>

        {/* Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-card border border-border/50">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <step.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-[10px] font-semibold text-foreground">{step.title}</span>
              <span className="text-[9px] text-muted-foreground leading-tight">{step.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
