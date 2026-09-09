import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui';
import { cn } from '@core/presentation/utils';
import { useExperiences, useProjects } from '../hooks';
import {
  ProfileHeaderForm,
  ExperienceSection,
  EducationSection,
  SkillSection,
  ProjectSection,
  CertificateSection,
} from '../components';

const sections = [
  { id: 'profile', label: 'Profile', Component: ProfileHeaderForm },
  { id: 'experience', label: 'Experience', Component: ExperienceSection },
  { id: 'education', label: 'Education', Component: EducationSection },
  { id: 'skills', label: 'Skills', Component: SkillSection },
  { id: 'projects', label: 'Projects', Component: ProjectSection },
  { id: 'certificates', label: 'Certificates', Component: CertificateSection },
];

const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  const vp = el?.closest('[data-radix-scroll-area-viewport]');
  if (el && vp) vp.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
};

export const ProfilePage = () => {
  const [active, setActive] = useState(sections[0].id);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ experience: true, projects: true });
  const { data: experiences } = useExperiences();
  const { data: projects } = useProjects();

  const submenus: Record<string, { id: string; label: string }[]> = {
    experience: experiences.map((e) => ({ id: `experience-${e.id}`, label: e.title })),
    projects: projects.map((p) => ({ id: `project-${p.id}`, label: p.name })),
  };

  useEffect(() => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
    const allIds = [...sections.map((s) => s.id), ...Object.values(submenus).flat().map((i) => i.id)];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { root: viewport, rootMargin: '-15% 0px -75% 0px' }
    );
    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiences.length, projects.length]);

  useEffect(() => {
    const parent = Object.entries(submenus).find(([, items]) => items.some((i) => i.id === active))?.[0];
    if (parent) setCollapsed((prev) => (prev[parent] ? { ...prev, [parent]: false } : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3.5 border-b border-border">
        <h1 className="text-lg font-semibold">Profile</h1>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-5xl mx-auto flex gap-6">
          <nav className="sticky top-4 hidden h-fit w-48 shrink-0 flex-col gap-1 md:flex">
            {sections.map(({ id, label }) => {
              const items = submenus[id];
              return (
                <div key={id}>
                  <div
                    className={cn(
                      'flex w-full items-center rounded-md text-sm transition-colors',
                      active === id
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                    )}
                  >
                    <button onClick={() => scrollToId(id)} className="flex-1 truncate px-3 py-2 text-left">
                      {label}
                    </button>
                    {items && items.length > 0 && (
                      <button
                        onClick={() => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))}
                        className="px-2 py-2 text-muted-foreground hover:text-foreground"
                        title={collapsed[id] ? 'Expand' : 'Collapse'}
                      >
                        <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', !collapsed[id] && 'rotate-90')} />
                      </button>
                    )}
                  </div>
                  {items && items.length > 0 && !collapsed[id] && (
                    <div className="ml-2 flex flex-col gap-0.5 border-l border-border pl-2">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => scrollToId(item.id)}
                          className={cn(
                            'truncate rounded-md px-2 py-1 text-left text-xs transition-colors',
                            active === item.id
                              ? 'bg-accent font-medium text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          )}
                          title={item.label}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="min-w-0 flex-1 space-y-6">
            {sections.map(({ id, Component }) => (
              <div key={id} id={id} className="scroll-mt-4">
                <Component />
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
