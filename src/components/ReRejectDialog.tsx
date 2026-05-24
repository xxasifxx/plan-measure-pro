import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  pending?: boolean;
  reportLabel: string;
}

export function ReRejectDialog({ open, onOpenChange, onConfirm, pending, reportLabel }: Props) {
  const [reason, setReason] = useState('');

  const submit = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setReason(''); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <XCircle className="h-4 w-4 text-destructive" />
            Reject report
          </DialogTitle>
          <DialogDescription className="text-xs font-mono">{reportLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider">Reason (required)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Quantity at Sta 412+50 doesn't match field measurement — please re-verify."
            rows={4}
            className="text-sm"
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            The inspector will see this and can edit the report and resubmit.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={!reason.trim() || pending}>
            {pending ? 'Rejecting…' : 'Reject report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
