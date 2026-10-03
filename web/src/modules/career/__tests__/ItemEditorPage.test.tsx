import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ItemEditorPage } from '../presentation/pages/ItemEditorPage';

const fixtures = vi.hoisted(() => ({
  items: [{ id: 'application', name: 'Software Engineer', cvFilePath: null, shareToken: 'token', portfolioSlug: 'software-engineer', portfolioEnabled: false, portfolioShowEmail: false, portfolioPortraitPath: null, updatedAt: new Date('2026-01-01') }],
  blocks: [{ id: 'opening', kind: 'opening', label: 'Introduction', body: 'Applying for {{job_title}} at {{company}}.' }],
  itemBlocks: [{ blockId: 'opening', length: null }],
  cv: { cvData: null, profileBlocks: [], defaultLayout: [], hasContent: false },
}));

vi.mock('@auth/presentation/hooks', () => ({ useAuth: () => ({ user: { id: 'user' } }) }));
vi.mock('../infrastructure', () => ({ CareerStorageService: class {} }));
vi.mock('../presentation/hooks/useCareerItems', () => ({
  useCareerItems: () => ({ items: fixtures.items, createItem: vi.fn(), updateItem: vi.fn(), rotateShareLink: vi.fn() }),
}));
vi.mock('../presentation/hooks/useCareerBlocks', () => ({ useCareerBlocks: () => ({ blocks: fixtures.blocks }) }));
vi.mock('../presentation/hooks/useItemBlocks', () => ({
  useItemBlocks: () => ({ itemBlocks: fixtures.itemBlocks, saveItemBlocks: vi.fn(), isSaving: false }),
}));
vi.mock('../presentation/hooks/useCvData', () => ({ useCvData: () => fixtures.cv }));
vi.mock('../presentation/hooks/useCvBlocks', () => ({ useCvBlocks: () => ({ blocks: [] }) }));

describe('career application workspace', () => {
  it('keeps letter details and ATS input when switching document tabs', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/career/application']}>
        <Routes><Route path="/career/:itemId" element={<ItemEditorPage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('tab', { name: 'CV' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'Complete your profile' })).toHaveAttribute('href', '/profile');
    expect(screen.queryByLabelText(/Job title/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Cover letter' }));
    const copy = screen.getByRole('button', { name: 'Copy cover letter' });
    expect(copy).toBeDisabled();
    await user.type(screen.getByLabelText(/Job title/), 'Frontend Engineer');
    await user.type(screen.getByLabelText(/Company/), 'Acme');
    expect(copy).toBeEnabled();
    expect(within(screen.getByRole('tabpanel', { name: 'Cover letter' })).getByText('Applying for Frontend Engineer at Acme.')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'ATS check' }));
    await user.type(screen.getByLabelText('Job description'), 'React TypeScript accessibility');
    expect(screen.getByRole('progressbar', { name: 'CV match score' })).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'CV' }));
    await user.click(screen.getByRole('tab', { name: 'ATS check' }));
    expect(screen.getByLabelText('Job description')).toHaveValue('React TypeScript accessibility');

    await user.click(screen.getByRole('tab', { name: 'Cover letter' }));
    expect(screen.getByLabelText(/Job title/)).toHaveValue('Frontend Engineer');
    expect(screen.getByLabelText(/Company/)).toHaveValue('Acme');
    expect(screen.getByRole('button', { name: 'Copy cover letter' })).toBeEnabled();
  });
});
