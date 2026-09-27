import { useState } from 'react';
import {
  composeLetter,
  renderLetterHtml,
  type CareerItemType,
  type CareerLength,
  type ComposableBlock,
} from '@himan/shared/career';

export const useGenerateLetter = (item: CareerItemType | null, blocks: ComposableBlock[]) => {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [hiringManager, setHiringManager] = useState('');
  const [hook, setHook] = useState('');
  const [length, setLength] = useState<CareerLength>('long');

  const portfolioUrl = item?.portfolioEnabled ? `${window.location.origin}/p/${item.shareToken}` : undefined;
  const ctx = { jobTitle, company, hiringManager: hiringManager || undefined, hook: hook || undefined, portfolioUrl };
  const { text, missing } = composeLetter(blocks, ctx, length);

  const printHtml = (): string =>
    renderLetterHtml({ bodyText: text, documentTitle: `${jobTitle} — ${company}` });

  return {
    jobTitle, setJobTitle,
    company, setCompany,
    hiringManager, setHiringManager,
    hook, setHook,
    length, setLength,
    text, missing,
    canGenerate: !!text.trim() && !!jobTitle.trim() && !!company.trim(),
    printHtml,
  };
};
