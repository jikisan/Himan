import { useMemo, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useSkills } from '../hooks/useSkills';
import type { SkillType } from '@himan/shared/profile';

// A skill can carry multiple categories, so it appears under every group it
// belongs to — same grouping shape as the cover letter block library.
function groupByCategory(skills: SkillType[]): Map<string, SkillType[]> {
  const map = new Map<string, SkillType[]>();
  for (const skill of skills) {
    const categories = skill.categories.length ? skill.categories : ['Other'];
    for (const category of categories) {
      const list = map.get(category) ?? [];
      list.push(skill);
      map.set(category, list);
    }
  }
  return new Map([...map.entries()].sort((a, b) => (a[0] === 'Other' ? 1 : 0) - (b[0] === 'Other' ? 1 : 0)));
}

export const SkillSection = () => {
  const { data, loading, create, remove } = useSkills();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const grouped = useMemo(() => groupByCategory(data), [data]);
  const tabs = [...grouped.keys()];
  const visible = activeTab ? (grouped.get(activeTab) ?? []) : data;

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const categories = category.split(',').map((c) => c.trim()).filter(Boolean);
      await create({ name: name.trim(), categories, level: level.trim() || null });
      setName('');
      setCategory('');
      setLevel('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <Input placeholder="Categories (comma-separated)" value={category} onChange={(e) => setCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <Input placeholder="Level (optional)" value={level} onChange={(e) => setLevel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <Button onClick={handleAdd} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {!loading && data.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}

        {tabs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                activeTab === null ? 'bg-accent border-accent-foreground/20' : 'border-border hover:bg-accent'
              }`}
            >
              All
            </button>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  activeTab === tab ? 'bg-accent border-accent-foreground/20' : 'border-border hover:bg-accent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {visible.map((skill) => (
            <span
              key={skill.id}
              className="inline-flex items-center gap-1.5 text-sm bg-muted rounded-full px-3 py-1"
            >
              {skill.name}
              {skill.level && <span className="text-xs text-muted-foreground">({skill.level})</span>}
              <button onClick={() => remove(skill.id)} className="hover:text-destructive" title="Remove">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
