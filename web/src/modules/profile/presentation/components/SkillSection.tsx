import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useSkills } from '../hooks/useSkills';

export const SkillSection = () => {
  const { data, loading, create, remove } = useSkills();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await create({ name: name.trim(), category: category.trim() || null, level: level.trim() || null });
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
          <Input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <Input placeholder="Level (optional)" value={level} onChange={(e) => setLevel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <Button onClick={handleAdd} disabled={isSaving || !name.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {!loading && data.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}

        <div className="flex flex-wrap gap-2">
          {data.map((skill) => (
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
