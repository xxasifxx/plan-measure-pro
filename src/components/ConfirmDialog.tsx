import { useState, useCallback, useRef, type ReactNode } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ConfirmOpts = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type State = ConfirmOpts & { open: boolean };

/**
 * Imperative confirm dialog hook — drop-in replacement for window.confirm
 * for destructive actions. Returns a `confirm` function that resolves to
 * true/false, and a `<ConfirmDialog />` element to render once per consumer.
 */
export function useConfirm() {
  const [state, setState] = useState<State>({ open: false, title: '' });
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, destructive: true, ...opts });
    });
  }, []);

  const handleChange = (open: boolean) => {
    if (!open) {
      setState((s) => ({ ...s, open: false }));
      if (resolverRef.current) { resolverRef.current(false); resolverRef.current = null; }
    }
  };

  const handleConfirm = () => {
    setState((s) => ({ ...s, open: false }));
    if (resolverRef.current) { resolverRef.current(true); resolverRef.current = null; }
  };

  const dialog = (
    <AlertDialog open={state.open} onOpenChange={handleChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.description && (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{state.cancelLabel ?? 'Cancel'}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(state.destructive && buttonVariants({ variant: 'destructive' }))}
          >
            {state.confirmLabel ?? 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
