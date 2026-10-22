import { motion } from 'motion/react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ALL_GOVERNMENT_GROUPS } from '@himan/shared/government';
import type { GovernmentGroup } from '@himan/shared/government';

export function GovernmentGroupBar({ groups, counts, total, active, onChange, onManage, disabled }: {
  groups: GovernmentGroup[]; counts: Record<string, number>; total: number; active: string;
  onChange: (id: string) => void; onManage: () => void; disabled?: boolean;
}) {
  const tabs = [{ id: ALL_GOVERNMENT_GROUPS, name: 'All', count: total }, ...groups.map((group) => ({ id: group.id, name: group.name, count: counts[group.id] ?? 0 }))];
  return <div className="mb-6 flex flex-wrap items-center gap-3">
    <div role="group" aria-label="Filter by group" className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => <button key={tab.id} type="button" aria-pressed={active === tab.id} onClick={() => onChange(tab.id)}
        className="relative min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {active === tab.id && <motion.span layoutId="gov-group-pill" aria-hidden="true" className="absolute inset-0 rounded-full bg-foreground"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
        <span className={`relative ${active === tab.id ? 'text-background' : ''}`}>{tab.name} <span className="opacity-70">({tab.count})</span></span>
      </button>)}
    </div>
    <Button className="h-11 rounded-xl hover:scale-100" variant="outline" disabled={disabled} onClick={onManage}><Settings2 aria-hidden="true" className="h-4 w-4" />Manage groups</Button>
  </div>;
}
