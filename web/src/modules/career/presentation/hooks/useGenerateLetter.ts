import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { CareerRenderRepository, CareerStorageService } from '../../infrastructure';
import {
  composeLetter,
  renderLetterHtml,
  buildStoragePath,
  buildDownloadFilename,
  type CareerItemType,
  type CareerLength,
  type ComposableBlock,
} from '@himan/shared/career';
import { Logger } from '@core/infrastructure/services';

export const useGenerateLetter = (item: CareerItemType | null, blocks: ComposableBlock[]) => {
  const { user } = useAuth();
  const storage = useMemo(() => new CareerStorageService(), []);
  const renders = useMemo(() => new CareerRenderRepository(), []);

  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [hiringManager, setHiringManager] = useState('');
  const [hook, setHook] = useState('');
  const [length, setLength] = useState<CareerLength>('long');
  const [isPublishing, setIsPublishing] = useState(false);

  const ctx = { jobTitle, company, hiringManager: hiringManager || undefined, hook: hook || undefined };
  const { text, missing } = composeLetter(blocks, ctx, length);

  const publish = async (): Promise<string | null> => {
    if (!user || !item || missing.length > 0 || !text.trim()) return null;
    setIsPublishing(true);
    try {
      const html = renderLetterHtml({
        bodyText: text,
        documentTitle: `${jobTitle} — ${company}`,
      });
      const path = buildStoragePath(user.id, item.shareToken, 'letter.html');
      await storage.upload(path, new TextEncoder().encode(html), 'text/html');
      await renders.create({
        itemId: item.id,
        kind: 'cover_letter',
        length,
        jobTitle: jobTitle || null,
        company: company || null,
        hiringManager: hiringManager || null,
        hook: hook || null,
        bodyText: text,
      });
      return await storage.createShareUrl(path);
    } catch (err) {
      Logger.error('Error publishing career letter', err);
      toast.error('Failed to publish letter');
      return null;
    } finally {
      setIsPublishing(false);
    }
  };

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
    isPublishing,
    canGenerate: !!text.trim() && !!jobTitle.trim() && !!company.trim(),
    canPublish: missing.length === 0 && !!text.trim() && !!jobTitle.trim() && !!company.trim(),
    publish,
    printHtml,
    cvShareUrl,
  };
};
