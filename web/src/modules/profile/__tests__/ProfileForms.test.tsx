import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui', async (original) => ({ ...await original<typeof import('@/components/ui')>(), DatePicker: () => null }));
vi.mock('@auth/presentation/hooks', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@storage/infrastructure', () => ({ CompressionService: { compress: async (f: File) => f } }));
const media = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('../infrastructure', () => ({ ProjectMediaService: class {
  static acceptedTypes = ['image/png']; static publicUrl(p: string) { return p; } upload = media.upload; } }));
const skills = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('../presentation/hooks/useSkills', () => ({ useSkills: () => ({ data: [], loading: false, create: skills.create, remove: vi.fn() }) }));
const profile = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('../presentation/hooks/useProfile', () => ({ useProfile: () => ({ profile: null, loading: false, save: profile.save }) }));

import { CertificateEditor } from '../presentation/components/CertificateEditor';
import { EducationEditor } from '../presentation/components/EducationEditor';
import { ExperienceEditor } from '../presentation/components/ExperienceEditor';
import { ProjectEditor } from '../presentation/components/ProjectEditor';
import { SkillSection } from '../presentation/components/SkillSection';
import { ProfileHeaderForm } from '../presentation/components/ProfileHeaderForm';
import { ProjectScreenshots } from '../presentation/components/ProjectScreenshots';

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const marked = (input: HTMLElement) => document.querySelector(`label[for="${input.id}"] [aria-hidden="true"]`)?.textContent;

const editors = [
  { name: 'CertificateEditor', render: (onSave: () => unknown) => <CertificateEditor onSave={onSave} onCancel={vi.fn()} />,
    fields: [['cert-name', 'Enter the certificate name']], failure: 'Failed to create certificate' },
  { name: 'EducationEditor', render: (onSave: () => unknown) => <EducationEditor onSave={onSave} onCancel={vi.fn()} />,
    fields: [['edu-school', 'Enter the school']], failure: 'Failed to create education' },
  { name: 'ExperienceEditor', render: (onSave: () => unknown) => <ExperienceEditor onSave={onSave} onCancel={vi.fn()} />,
    fields: [['exp-company', 'Enter the company'], ['exp-title', 'Enter the title']], failure: 'Failed to create experience' },
  { name: 'ProjectEditor', render: (onSave: () => unknown) => <ProjectEditor onSave={onSave} onCancel={vi.fn()} />,
    fields: [['proj-name', 'Enter the project name']], failure: 'Failed to create project' },
];

describe.each(editors)('$name form errors', ({ render: ui, fields, failure }) => {
  it('focuses the first empty required field and shows messages under the fields', async () => {
    const onSave = vi.fn();
    render(ui(onSave));
    save();
    const first = document.getElementById(fields[0][0])!;
    await waitFor(() => expect(document.activeElement).toBe(first));
    for (const [id, message] of fields) {
      const input = document.getElementById(id)!;
      expect(input).toBeRequired();
      expect(marked(input)).toContain('*');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(document.getElementById(`${id}-error`)).toHaveTextContent(message);
    }
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(first, { target: { value: 'x' } });
    expect(first).not.toHaveAttribute('aria-invalid');
  });
  it('shows a failed save in the banner at the top', async () => {
    render(ui(vi.fn().mockRejectedValue(new Error('x'))));
    for (const [id] of fields) fireEvent.change(document.getElementById(id)!, { target: { value: 'x' } });
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent(failure);
  });
});

describe('SkillSection add errors', () => {
  it('focuses the empty skill name and shows the message under it', async () => {
    render(<SkillSection />);
    const name = screen.getByLabelText(/Skill name/);
    expect(name).toBeRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('skill-name-error')).toHaveTextContent('Enter a skill name');
    expect(skills.create).not.toHaveBeenCalled();
  });
  it('shows a refused skill in the banner', async () => {
    skills.create.mockRejectedValueOnce(new Error('Skill already exists'));
    render(<SkillSection />);
    fireEvent.change(screen.getByLabelText(/Skill name/), { target: { value: 'React' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add skill' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Skill already exists');
  });
});

describe('ProfileHeaderForm save errors', () => {
  it('shows a failed save in the banner at the top', async () => {
    profile.save.mockRejectedValueOnce(new Error('x'));
    render(<ProfileHeaderForm />);
    save();
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Failed to save profile');
    expect(banner).toHaveAttribute('data-form-error');
  });
});

describe('ProjectScreenshots upload errors', () => {
  it('shows a failed upload under the screenshots and focuses Add', async () => {
    media.upload.mockRejectedValueOnce(new Error('Upload refused'));
    const { container } = render(<ProjectScreenshots value={[]} onChange={vi.fn()} />);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /Add/ })));
    expect(document.getElementById('project-screenshots-error')).toHaveTextContent('Upload refused');
  });
});
