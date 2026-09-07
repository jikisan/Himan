import {
  useProfile,
  useExperiences,
  useEducation,
  useSkills,
  useProjects,
  useCertificates,
} from '../../../profile/presentation/hooks';
import type { CvData } from '@himan/shared/profile';
import type { CvBlockRef } from '@himan/shared/career';

export interface CvBlockOption {
  ref: CvBlockRef;
  label: string;
}

function uniqueSkillCategories(skills: CvData['skills']): string[] {
  const seen: string[] = [];
  for (const skill of skills) {
    const categories = skill.categories.length ? skill.categories : ['Other'];
    for (const category of categories) {
      if (!seen.includes(category)) seen.push(category);
    }
  }
  return seen.sort((a, b) => (a === 'Other' ? 1 : 0) - (b === 'Other' ? 1 : 0));
}

// Cross-module hook import, not a new store — the profile hooks already own
// the fetching; this just aggregates them into the shape renderCvHtml wants,
// plus the pool of profile-sourced blocks a career item can select from.
export const useCvData = () => {
  const { profile, loading: profileLoading } = useProfile();
  const { data: experiences, loading: experiencesLoading } = useExperiences();
  const { data: education, loading: educationLoading } = useEducation();
  const { data: skills, loading: skillsLoading } = useSkills();
  const { data: projects, loading: projectsLoading } = useProjects();
  const { data: certificates, loading: certificatesLoading } = useCertificates();

  const loading =
    profileLoading || experiencesLoading || educationLoading || skillsLoading || projectsLoading || certificatesLoading;

  const cvData: CvData | null = profile
    ? { profile, experiences, education, skills, projects, certificates }
    : null;

  const hasContent =
    !!profile?.fullName?.trim() &&
    (experiences.length > 0 ||
      education.length > 0 ||
      skills.length > 0 ||
      projects.length > 0 ||
      certificates.length > 0);

  const profileBlocks: CvBlockOption[] = [
    { ref: { type: 'header' }, label: 'Header' },
    { ref: { type: 'summary' }, label: 'Professional Summary' },
    ...experiences.map((exp) => ({ ref: { type: 'experience' as const, id: exp.id }, label: `${exp.title} — ${exp.company}` })),
    ...education.map((edu) => ({ ref: { type: 'education' as const, id: edu.id }, label: edu.school })),
    ...uniqueSkillCategories(skills).map((category) => ({ ref: { type: 'skill' as const, category }, label: `Skills: ${category}` })),
    ...projects.map((project) => ({ ref: { type: 'project' as const, id: project.id }, label: project.name })),
    ...certificates.map((cert) => ({ ref: { type: 'certificate' as const, id: cert.id }, label: cert.name })),
  ];

  const defaultLayout: CvBlockRef[] = profileBlocks.map((b) => b.ref);

  return { cvData, profileBlocks, defaultLayout, hasContent, loading };
};
