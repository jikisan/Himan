import { useEffect, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@/components/ui';
import { useProfile } from '../hooks/useProfile';

// Social links promoted to their own fields; their keys double as CV block
// tokens ({{github}}, ...). Everything else lives in `otherLinks`.
const NAMED_LINKS = [
  { key: 'github', label: 'GitHub' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'twitter', label: 'Twitter / X' },
] as const;

const NAMED_KEYS = NAMED_LINKS.map((l) => l.key) as string[];

export const ProfileHeaderForm = () => {
  const { profile, loading, save } = useProfile();

  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [named, setNamed] = useState<Record<string, string>>({});
  const [otherLinks, setOtherLinks] = useState<{ key: string; value: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form when profile loads or changes
    setFullName(profile?.fullName ?? '');
    setHeadline(profile?.headline ?? '');
    setBio(profile?.bio ?? '');
    setLocation(profile?.location ?? '');
    setEmail(profile?.email ?? '');
    setPhone(profile?.phone ?? '');
    setWebsite(profile?.website ?? '');
    const links = profile?.links ?? {};
    setNamed(Object.fromEntries(NAMED_KEYS.map((k) => [k, links[k] ?? ''])));
    setOtherLinks(Object.entries(links).filter(([k]) => !NAMED_KEYS.includes(k)).map(([key, value]) => ({ key, value })));
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const links: Record<string, string> = {};
      for (const [key, value] of Object.entries(named)) {
        if (value.trim()) links[key] = value.trim();
      }
      for (const { key, value } of otherLinks) {
        if (key.trim() && value.trim()) links[key.trim()] = value.trim();
      }
      await save({
        fullName: fullName || null,
        headline: headline || null,
        bio: bio || null,
        location: location || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        links,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Senior Software Engineer" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </div>
        </div>

        <div className="space-y-4">
          <Label>Links</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            {NAMED_LINKS.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`link-${key}`} className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  id={`link-${key}`}
                  value={named[key] ?? ''}
                  onChange={(e) => setNamed((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="https://"
                />
              </div>
            ))}
          </div>

          {otherLinks.map((link, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="space-y-2 w-40 flex-shrink-0">
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input
                  value={link.key}
                  onChange={(e) => setOtherLinks((prev) => prev.map((l, i) => (i === index ? { ...l, key: e.target.value } : l)))}
                  placeholder="portfolio"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label className="text-xs text-muted-foreground">URL</Label>
                <Input
                  value={link.value}
                  onChange={(e) => setOtherLinks((prev) => prev.map((l, i) => (i === index ? { ...l, value: e.target.value } : l)))}
                  placeholder="https://"
                />
              </div>
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setOtherLinks((prev) => prev.filter((_, i) => i !== index))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button size="sm" variant="outline" onClick={() => setOtherLinks((prev) => [...prev, { key: '', value: '' }])}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add link
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
