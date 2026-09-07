import { format } from 'date-fns';
import { escapeHtml } from '../../../../services/index.js';
import { CV_PRINT_CSS } from '../templates/cvStyles.js';
import { sortByPosition } from './sortByPosition.js';
import { profileTokens, resolveProfileTokens } from './profileTokens.js';
import type {
  ProfileType,
  ExperienceType,
  EducationType,
  SkillType,
  ProjectType,
  CertificateType,
} from '../types/index.js';

export interface CvData {
  profile: ProfileType;
  experiences: ExperienceType[];
  education: EducationType[];
  skills: SkillType[];
  projects: ProjectType[];
  certificates: CertificateType[];
}

// Render-ready block: 'custom' carries its resolved title/body inline, so
// this renderer stays pure and never needs the career_cv_blocks table — the
// caller resolves a stored CvBlockRef[] (career module) into this shape.
export type RenderCvBlock =
  | { type: 'header' }
  | { type: 'summary' }
  | { type: 'experience'; id: string }
  | { type: 'education'; id: string }
  | { type: 'project'; id: string }
  | { type: 'certificate'; id: string }
  | { type: 'skill'; category: string }
  | { type: 'custom'; title: string; body: string };

function formatDate(date: Date): string {
  return format(date, 'MMM yyyy');
}

// Null endDate or isCurrent both mean "still ongoing" — render "Present"
// rather than a blank cell, matching the sample résumé.
function dateRange(start: Date | null, end: Date | null, isCurrent = false): string {
  if (!start && !end) return '';
  const startStr = start ? formatDate(start) : '';
  const endStr = isCurrent || !end ? 'Present' : formatDate(end);
  return [startStr, endStr].filter(Boolean).join(' – ');
}

function section(heading: string, bodyHtml: string): string {
  return bodyHtml ? `<h2>${escapeHtml(heading)}</h2>${bodyHtml}` : '';
}

function contactLine(parts: (string | null | undefined)[]): string {
  const clean = parts.filter((v): v is string => !!v && v.trim().length > 0).map(escapeHtml);
  return clean.length ? `<p class="contact-line">${clean.join(' | ')}</p>` : '';
}

function renderHeader(profile: ProfileType): string {
  const name = profile.fullName ? escapeHtml(profile.fullName) : '';
  // Location on its own line, then everything else — mirrors the reference résumé.
  const locationLine = contactLine([profile.location]);
  const contactRest = contactLine([profile.phone, profile.email, profile.website, ...Object.values(profile.links)]);
  return `<h1>${name}</h1>${locationLine}${contactRest}`;
}

function renderSummary(bio: string | null): string {
  return section('Professional Summary', bio ? `<p>${escapeHtml(bio)}</p>` : '');
}

function renderExperienceRow(exp: ExperienceType): string {
  const dates = dateRange(exp.startDate, exp.endDate, exp.isCurrent);
  const company = exp.company ? `<div class="entry-company">${escapeHtml(exp.company)}</div>` : '';
  const subtitle = exp.location ? `<div class="entry-subtitle">${escapeHtml(exp.location)}</div>` : '';
  const summary = exp.summary ? `<p>${escapeHtml(exp.summary)}</p>` : '';
  const bullets = exp.bullets.length
    ? `<ul>${exp.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
    : '';
  return `<div class="entry"><div class="entry-row"><span class="entry-title">${escapeHtml(exp.title)}</span><span class="entry-dates">${escapeHtml(dates)}</span></div>${company}${subtitle}${summary}${bullets}</div>`;
}

function renderExperience(experiences: ExperienceType[]): string {
  return section('Experience', sortByPosition(experiences).map(renderExperienceRow).join(''));
}

function renderEducationRow(edu: EducationType): string {
  const dates = dateRange(edu.startDate, edu.endDate);
  const degreeLine = [edu.degree, edu.field].filter(Boolean).join(', ');
  const gpaLine = edu.gpa ? `GPA: ${edu.gpa}` : '';
  const subtitle = [degreeLine, gpaLine].filter(Boolean).join(' · ');
  const achievements = edu.achievements.length
    ? `<ul>${edu.achievements.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
    : '';
  return `<div class="entry"><div class="entry-row"><span class="entry-title">${escapeHtml(edu.school)}</span><span class="entry-dates">${escapeHtml(dates)}</span></div>${subtitle ? `<div class="entry-subtitle">${escapeHtml(subtitle)}</div>` : ''}${achievements}</div>`;
}

function renderEducation(education: EducationType[]): string {
  return section('Education', sortByPosition(education).map(renderEducationRow).join(''));
}

function skillCategories(skill: SkillType): string[] {
  return skill.categories.length ? skill.categories : ['Other'];
}

function renderSkillGroupRow(category: string, items: SkillType[]): string {
  return `<p>${escapeHtml(category)}: ${items.map((s) => escapeHtml(s.name)).join(', ')}</p>`;
}

// A skill can carry multiple categories, so it appears in every group it
// belongs to (e.g. Kotlin lists under both "Mobile" and "Android").
function renderSkills(skills: SkillType[]): string {
  const sorted = sortByPosition(skills);
  const groups = new Map<string, SkillType[]>();
  for (const skill of sorted) {
    for (const key of skillCategories(skill)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(skill);
    }
  }
  const entries = [...groups.entries()].sort((a, b) => (a[0] === 'Other' ? 1 : 0) - (b[0] === 'Other' ? 1 : 0));
  const rows = entries.map(([category, items]) => renderSkillGroupRow(category, items)).join('');
  return section('Skills', rows);
}

function renderProjectRow(project: ProjectType): string {
  const platform = project.platform.length ? escapeHtml(project.platform.join('/')) : '';
  const header = platform
    ? `<div class="entry-row"><span class="entry-title">${escapeHtml(project.name)}</span><span class="entry-platform">${platform}</span></div>`
    : `<div class="entry-title">${escapeHtml(project.name)}</div>`;
  const urlLine = project.url ? `<div class="entry-subtitle">${escapeHtml(project.url)}</div>` : '';
  const description = project.description ? `<p>${escapeHtml(project.description)}</p>` : '';
  const tech = project.tech.length
    ? `<p class="entry-tech"><span class="entry-tech-label">Tech Stack: </span>${escapeHtml(project.tech.join(', '))}</p>`
    : '';
  return `<div class="entry">${header}${urlLine}${description}${tech}</div>`;
}

function renderProjects(projects: ProjectType[]): string {
  return section('Projects', sortByPosition(projects).map(renderProjectRow).join(''));
}

function renderCertificateRow(cert: CertificateType): string {
  const details = [cert.issuer, cert.issueDate ? formatDate(cert.issueDate) : null, cert.credentialId ? `Credential ID: ${cert.credentialId}` : null]
    .filter(Boolean)
    .join(' · ');
  return `<div class="entry"><div class="entry-title">${escapeHtml(cert.name)}</div>${details ? `<div class="entry-subtitle">${escapeHtml(details)}</div>` : ''}</div>`;
}

function renderCertificates(certificates: CertificateType[]): string {
  return section('Certificates', sortByPosition(certificates).map(renderCertificateRow).join(''));
}

function renderCustomBlock(title: string, body: string, tokens: Record<string, string>): string {
  const paragraphs = resolveProfileTokens(body, tokens)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');
  return section(title, paragraphs);
}

const ROW_SECTION_HEADING: Record<'experience' | 'education' | 'project' | 'certificate' | 'skill', string> = {
  experience: 'Experience',
  education: 'Education',
  project: 'Projects',
  certificate: 'Certificates',
  skill: 'Skills',
};

// Renders blocks in the given order; consecutive blocks belonging to the
// same section share one heading (so row-level blocks still print under a
// single "Experience"/"Education"/etc. heading, matching the default mode).
// Refs whose row no longer exists are silently skipped.
function renderWithLayout(data: CvData, layout: RenderCvBlock[]): string {
  const tokens = profileTokens(data.profile);
  const parts: string[] = [];
  let currentHeading: string | null = null;
  let currentRows: string[] = [];

  const flush = () => {
    if (currentHeading && currentRows.length) {
      parts.push(section(currentHeading, currentRows.join('')));
    }
    currentHeading = null;
    currentRows = [];
  };

  const pushRow = (heading: string, rowHtml: string) => {
    if (currentHeading !== heading) {
      flush();
      currentHeading = heading;
    }
    currentRows.push(rowHtml);
  };

  for (const block of layout) {
    switch (block.type) {
      case 'header':
        flush();
        parts.push(renderHeader(data.profile));
        break;
      case 'summary':
        flush();
        parts.push(renderSummary(data.profile.bio));
        break;
      case 'custom':
        flush();
        parts.push(renderCustomBlock(block.title, block.body, tokens));
        break;
      case 'experience': {
        const exp = data.experiences.find((e) => e.id === block.id);
        if (exp) pushRow(ROW_SECTION_HEADING.experience, renderExperienceRow(exp));
        break;
      }
      case 'education': {
        const edu = data.education.find((e) => e.id === block.id);
        if (edu) pushRow(ROW_SECTION_HEADING.education, renderEducationRow(edu));
        break;
      }
      case 'project': {
        const project = data.projects.find((p) => p.id === block.id);
        if (project) pushRow(ROW_SECTION_HEADING.project, renderProjectRow(project));
        break;
      }
      case 'certificate': {
        const cert = data.certificates.find((c) => c.id === block.id);
        if (cert) pushRow(ROW_SECTION_HEADING.certificate, renderCertificateRow(cert));
        break;
      }
      case 'skill': {
        const items = sortByPosition(data.skills.filter((s) => skillCategories(s).includes(block.category)));
        if (items.length > 0) pushRow(ROW_SECTION_HEADING.skill, renderSkillGroupRow(block.category, items));
        break;
      }
    }
  }
  flush();

  return parts.join('');
}

function renderDefault(data: CvData): string {
  return [
    renderHeader(data.profile),
    renderSummary(data.profile.bio),
    renderExperience(data.experiences),
    renderEducation(data.education),
    renderSkills(data.skills),
    renderProjects(data.projects),
    renderCertificates(data.certificates),
  ].join('');
}

// Standalone document: what a recruiter opens via the share link and what
// the browser prints are the same bytes — same guarantee as renderLetterHtml.
// With no layout, renders every section in the profile's default order. With
// a layout, renders exactly the given blocks in the given order — the
// per-item selection that makes two items' CVs actually differ.
export function renderCvHtml(data: CvData, layout?: RenderCvBlock[] | null): string {
  const title = escapeHtml(data.profile.fullName ? `${data.profile.fullName} — CV` : 'CV');
  const body = layout ? renderWithLayout(data, layout) : renderDefault(data);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${CV_PRINT_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}
