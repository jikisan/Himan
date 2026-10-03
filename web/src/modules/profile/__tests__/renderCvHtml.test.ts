import { describe, it, expect } from 'vitest';
import { renderCvHtml } from '@himan/shared/profile';
import type {
  ProfileType,
  ExperienceType,
  EducationType,
  SkillType,
  ProjectType,
  CertificateType,
} from '@himan/shared/profile';

const baseProfile: ProfileType = {
  id: 'p1',
  userId: 'u1',
  fullName: 'Jane Doe',
  headline: 'Software Engineer',
  bio: 'Builds things.',
  location: 'Manila, PH',
  email: 'jane@example.com',
  phone: '+63 900 000 0000',
  website: 'https://jane.dev',
  links: {},
  handle: null,
  portfolioPortraitPath: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const emptyData = {
  profile: baseProfile,
  experiences: [] as ExperienceType[],
  education: [] as EducationType[],
  skills: [] as SkillType[],
  projects: [] as ProjectType[],
  certificates: [] as CertificateType[],
};

function makeExperience(overrides: Partial<ExperienceType> = {}): ExperienceType {
  return {
    id: 'e1',
    userId: 'u1',
    company: 'Acme Corp',
    title: 'Engineer',
    location: null,
    startDate: new Date('2024-01-01'),
    endDate: null,
    isCurrent: true,
    summary: null,
    bullets: [],
    position: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeSkill(overrides: Partial<SkillType> = {}): SkillType {
  return {
    id: 's1',
    userId: 'u1',
    name: 'TypeScript',
    categories: [],
    level: null,
    position: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('renderCvHtml', () => {
  it('omits a section with no rows', () => {
    const html = renderCvHtml(emptyData);
    expect(html).not.toContain('Experience');
    expect(html).not.toContain('Education');
    expect(html).not.toContain('Skills');
    expect(html).not.toContain('Projects');
    expect(html).not.toContain('Certificates');
  });

  it('renders "Present" for a current role', () => {
    const html = renderCvHtml({ ...emptyData, experiences: [makeExperience({ isCurrent: true, endDate: null })] });
    expect(html).toContain('Present');
  });

  it('renders "Present" for a null endDate even when not marked current', () => {
    const html = renderCvHtml({ ...emptyData, experiences: [makeExperience({ isCurrent: false, endDate: null })] });
    expect(html).toContain('Present');
  });

  it('groups skills by category, with uncategorized skills under "Other"', () => {
    const html = renderCvHtml({
      ...emptyData,
      skills: [
        makeSkill({ id: 's1', name: 'React', categories: ['Frontend'] }),
        makeSkill({ id: 's2', name: 'Postgres', categories: [] }),
      ],
    });
    expect(html).toContain('Frontend');
    expect(html).toContain('Other');
  });

  it('escapes user text containing <, &, and "', () => {
    const html = renderCvHtml({
      ...emptyData,
      profile: { ...baseProfile, bio: '<script>alert("x")</script> & more' },
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;');
  });

  it('renders every section heading exactly once for a fully-populated CvData', () => {
    const html = renderCvHtml({
      profile: baseProfile,
      experiences: [makeExperience()],
      education: [
        {
          id: 'ed1',
          userId: 'u1',
          school: 'State University',
          degree: 'Bachelor of Science',
          field: 'Information Technology',
          location: null,
          startDate: new Date('2018-01-01'),
          endDate: new Date('2022-01-01'),
          gpa: '1.7',
          achievements: ["Dean's Lister"],
          position: 0,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ],
      skills: [makeSkill()],
      projects: [
        {
          id: 'pr1',
          userId: 'u1',
          name: 'Side Project',
          description: 'A thing.',
          url: 'https://example.com',
          androidUrl: null,
          iosUrl: null,
          tech: ['TypeScript'],
          platform: [],
          outcome: null,
          proofMetric: null,
          proofLabel: null,
          category: null,
          featured: false,
          images: [],
          startDate: null,
          endDate: null,
          position: 0,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ],
      certificates: [
        {
          id: 'c1',
          userId: 'u1',
          name: 'AWS Certified',
          issuer: 'AWS',
          issueDate: new Date('2023-01-01'),
          expiryDate: null,
          credentialId: 'ABC123',
          credentialUrl: null,
          position: 0,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ],
    });

    for (const heading of ['Experience', 'Education', 'Skills', 'Projects', 'Certificates']) {
      const occurrences = html.split(heading).length - 1;
      expect(occurrences).toBe(1);
    }
  });

  describe('with a layout', () => {
    const exp1 = makeExperience({ id: 'e1', title: 'Engineer', company: 'Acme' });
    const exp2 = makeExperience({ id: 'e2', title: 'Intern', company: 'Beta' });
    const edu1: EducationType = {
      id: 'ed1',
      userId: 'u1',
      school: 'State University',
      degree: null,
      field: null,
      location: null,
      startDate: null,
      endDate: null,
      gpa: null,
      achievements: [],
      position: 0,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };
    const skillFrontend = makeSkill({ id: 's1', name: 'React', categories: ['Frontend'] });
    const dataWithRows = { ...emptyData, experiences: [exp1, exp2], education: [edu1], skills: [skillFrontend] };

    it('renders blocks in the given order', () => {
      const html = renderCvHtml(dataWithRows, [
        { type: 'education', id: 'ed1' },
        { type: 'experience', id: 'e1' },
      ]);
      expect(html.indexOf('State University')).toBeLessThan(html.indexOf('Acme'));
    });

    it('groups consecutive same-section blocks under one heading', () => {
      const html = renderCvHtml(dataWithRows, [
        { type: 'experience', id: 'e1' },
        { type: 'experience', id: 'e2' },
      ]);
      expect(html.split('Experience').length - 1).toBe(1);
      expect(html).toContain('Acme');
      expect(html).toContain('Beta');
    });

    it('emits the heading again when the same section is re-entered non-consecutively', () => {
      const html = renderCvHtml(dataWithRows, [
        { type: 'experience', id: 'e1' },
        { type: 'education', id: 'ed1' },
        { type: 'experience', id: 'e2' },
      ]);
      expect(html.split('Experience').length - 1).toBe(2);
    });

    it('renders a custom block as its own heading with escaped body', () => {
      const html = renderCvHtml(dataWithRows, [
        { type: 'custom', title: 'Objective', body: '<b>Ship</b> great software.' },
      ]);
      expect(html).toContain('Objective');
      expect(html).toContain('&lt;b&gt;Ship&lt;/b&gt; great software.');
    });

    it('skips a block whose referenced row no longer exists', () => {
      const html = renderCvHtml(dataWithRows, [{ type: 'experience', id: 'missing' }]);
      expect(html).not.toContain('Experience');
    });

    it('renders only the requested skill category', () => {
      const html = renderCvHtml(
        { ...dataWithRows, skills: [skillFrontend, makeSkill({ id: 's2', name: 'Postgres', categories: ['Backend'] })] },
        [{ type: 'skill', category: 'Frontend' }],
      );
      expect(html).toContain('Frontend');
      expect(html).not.toContain('Backend');
    });

    it('resolves profile tokens in a custom block body', () => {
      const data = { ...emptyData, profile: { ...baseProfile, links: { github: 'https://github.com/jane' } } };
      const html = renderCvHtml(data, [
        { type: 'custom', title: 'Links', body: 'Code: {{github}} · Reach: {{email}}' },
      ]);
      expect(html).toContain('https://github.com/jane');
      expect(html).toContain('jane@example.com');
    });

    it('drops an unset token rather than printing its key', () => {
      const html = renderCvHtml(emptyData, [
        { type: 'custom', title: 'Links', body: 'Find me: {{linkedin}}' },
      ]);
      expect(html).not.toContain('linkedin');
      expect(html).not.toContain('{{');
    });
  });
});
