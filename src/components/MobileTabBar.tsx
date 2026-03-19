import { Map, ListChecks, BookOpen, BarChart3, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileTab = 'canvas' | 'items' | 'sections' | 'summary';

interface Props {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  hasPdf: boolean;
  itemCount: number;
  sectionCount: number;
  isDark: boolean;
  onToggleTheme: () => void;
}

const tabs: { id: MobileTab; icon: typeof Map; label: string }[] = [
  { id: 'canvas', icon: Map, label: 'Plans' },
  { id: 'items', icon: ListChecks, label: 'Items' },
  { id: 'sections', icon: BookOpen, label: 'Sections' },
  { id: 'summary', icon: BarChart3, label: 'Summary' },
];

export function MobileTabBar({ activeTab, onTabChange, hasPdf, itemCount, sectionCount, isDark, onToggleTheme }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-stretch">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const badge = tab.id === 'items' ? itemCount : tab.id === 'sections' ? sectionCount : 0;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              disabled={!hasPdf && tab.id !== 'canvas'}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 transition-colors min-h-[56px] relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground',
                !hasPdf && tab.id !== 'canvas' && 'opacity-30'
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {badge > 0 && (
                <span className="absolute top-1.5 right-1/4 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={onToggleTheme}
          className="flex flex-col items-center gap-0.5 py-2.5 px-3 text-muted-foreground min-h-[56px]"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="text-[10px] font-medium">Theme</span>
        </button>
      </div>
    </div>
  );
}
