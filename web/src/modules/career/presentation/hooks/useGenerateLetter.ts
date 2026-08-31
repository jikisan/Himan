import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { CareerStorageService } from '../../infrastructure';
import {
  composeLetter,
  renderLetterHtml,
  type CareerItemType,
  type CareerLength,
  type ComposableBlock,
} from '@himan/shared/career';
import { Logger } from '@core/infrastructure/services';

export const useGenerateLetter = (item: CareerItemType | null, blocks: ComposableBlock[]) => {
  const { user } = useAuth();
  const storage = useMemo(() => new CareerStorageService(), []);

  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [hiringManager, setHiringManager] = useState('');
  const [hook, setHook] = useState('');
  const [length, setLength] = useState<CareerLength>('long');

  const ctx = { jobTitle, company, hiringManager: hiringManager || undefined, hook: hook || undefined };
  const { text, missing } = composeLetter(blocks, ctx, length);

  const printHtml = (): string =>
    renderLetterHtml({ bodyText: text, documentTitle: `${jobTitle} — ${company}` });

  const cvShareUrl = async (): Promise<string | null> => {
    if (!user || !item?.cvFilePath) return null;
    try {
      return await storage.createShareUrl(item.cvFilePath);
    } catch (err) {
      Logger.error('Error creating CV share link', err);
      toast.error('Failed to create CV link');
      return null;
    }
  };

  return {
    jobTitle, setJobTitle,
    company, setCompany,
    hiringManager, setHiringManager,
    hook, setHook,
    length, setLength,
    text, missing,
    canGenerate: !!text.trim() && !!jobTitle.trim() && !!company.trim(),
    printHtml,
    cvShareUrl,
  };
};
