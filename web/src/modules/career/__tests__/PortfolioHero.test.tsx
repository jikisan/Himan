import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PortfolioData } from '@himan/shared/career';
import { PortfolioHero } from '../presentation/portfolio/PortfolioHero';

const data: PortfolioData = {
  itemName: 'Developer', summary: 'My selected CV summary.', portraitPath: 'owner/photo.png',
  profile: { fullName: 'Test Person', bio: 'Unselected profile bio.', headline: 'Profile headline.', location: null, website: null, links: {}, email: null },
  projects: [], experiences: [], skills: [],
};

describe('portfolio hero', () => {
  it('uses the selected summary and configured portrait', () => {
    render(<PortfolioHero data={data} delay={0} portraitUrl="https://media.example/owner/photo.png" />);
    expect(screen.getByText(data.summary!)).toBeInTheDocument();
    expect(screen.queryByText(data.profile.bio!)).not.toBeInTheDocument();
    expect(screen.queryByText(data.profile.headline!)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Portrait of Test Person' })).toHaveAttribute('src', 'https://media.example/owner/photo.png');
  });

  it('omits unselected summary and the entire photo area when no photo is set', () => {
    render(<PortfolioHero data={{ ...data, summary: null }} delay={0} portraitUrl={null} />);
    expect(screen.queryByText(data.summary!)).not.toBeInTheDocument();
    expect(screen.queryByText(data.profile.bio!)).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('#about .grid')?.children).toHaveLength(1);
  });
});
