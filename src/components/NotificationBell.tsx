import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, XCircle, FileSignature, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, type NotificationRow } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const KIND_META: Record<string, { icon: typeof FileSignature; label: string; tone: string; route: (n: NotificationRow) => string }> = {
  report_submitted: {
    icon: FileSignature, label: 'Daily report submitted',
    tone: 'text-amber-400',
    route: () => '/re-review',
  },
  report_approved: {
    icon: CheckCircle2, label: 'Your report was approved',
    tone: 'text-emerald-400',
    route: (n) => n.project_id ? `/project/${n.project_id}/daily-report` : '/',
  },
  report_rejected: {
    icon: XCircle, label: 'Your report was rejected',
    tone: 'text-destructive',
    route: (n) => n.project_id ? `/project/${n.project_id}/daily-report` : '/',
  },
};

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" title="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider">Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1" onClick={markAllRead}>
              <Check className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground text-center">No notifications yet.</p>
          ) : (
            notifications.map(n => {
              const meta = KIND_META[n.kind] ?? { icon: Bell, label: n.kind, tone: 'text-muted-foreground', route: () => '/' };
              const Icon = meta.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read_at) markRead(n.id);
                    navigate(meta.route(n));
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/40 transition-colors flex items-start gap-2.5',
                    !n.read_at && 'bg-primary/5',
                  )}
                >
                  <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', meta.tone)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{meta.label}</p>
                    {n.payload?.report_date && (
                      <p className="text-[11px] text-muted-foreground font-mono">{n.payload.report_date}</p>
                    )}
                    {n.kind === 'report_rejected' && n.payload?.reject_reason && (
                      <p className="text-[11px] text-muted-foreground italic mt-0.5 line-clamp-2">"{n.payload.reject_reason}"</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">{fmtAgo(n.created_at)}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
