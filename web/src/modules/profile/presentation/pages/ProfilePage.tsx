import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui';
import { cn } from '@core/presentation/utils';
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

export const ProfilePage = () => {
  const [active, setActive] = useState(sections[0].id);

  useEffect(() => {
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]');
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { root: viewport, rootMargin: '-15% 0px -75% 0px' }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3.5 border-b border-border">
        <h1 className="text-lg font-semibold">Profile</h1>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-5xl mx-auto flex gap-6">
          <nav className="sticky top-4 hidden h-fit w-40 shrink-0 flex-col gap-1 md:flex">
            {sections.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => {
                  const el = document.getElementById(id);
                  const vp = el?.closest('[data-radix-scroll-area-viewport]');
                  if (el && vp)
                    vp.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
                }}
                className={cn(
                  'rounded-md px-3 py-2 text-left text-sm transition-colors',
                  active === id
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
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
