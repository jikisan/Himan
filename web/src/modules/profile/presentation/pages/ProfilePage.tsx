import { ScrollArea } from '@/components/ui';
import {
  ProfileHeaderForm,
  ExperienceSection,
  EducationSection,
  SkillSection,
  ProjectSection,
  CertificateSection,
} from '../components';

export const ProfilePage = () => {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3.5 border-b border-border">
        <h1 className="text-lg font-semibold">Profile</h1>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 max-w-3xl mx-auto space-y-6">
          <ProfileHeaderForm />
          <ExperienceSection />
          <EducationSection />
          <SkillSection />
          <ProjectSection />
          <CertificateSection />
        </div>
      </ScrollArea>
    </div>
  );
};
