import { useMemo, useState } from 'react';
import { Check, ScanText, X } from 'lucide-react';
import { Label, Textarea } from '@/components/ui';
import { evaluateAts } from '@himan/shared/career';

interface AtsPanelProps {
  /** Rendered CV html — scored as plain text, the way a parser reads it. */
  cvHtml: string;
}

const scoreTone = (score: number) =>
  score >= 75
    ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-destructive';

// Scored locally on every keystroke — evaluateAts is pure string work, so
// there is no request to debounce and no state to persist.
export const AtsPanel = ({ cvHtml }: AtsPanelProps) => {
  const [jobDescription, setJobDescription] = useState('');
  const report = useMemo(() => evaluateAts(cvHtml, jobDescription), [cvHtml, jobDescription]);
  const hasJd = jobDescription.trim().length > 0;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">How does your CV match?</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Check keyword coverage against a job description. This is a guide, not a hiring prediction.</p>
        </div>
        {hasJd && <span className={`shrink-0 text-2xl font-semibold tabular-nums ${scoreTone(report.score)}`}>{report.score}<span className="text-xs font-normal text-muted-foreground"> / 100</span></span>}
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="jobDescription">Job description</Label>
          <Textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job ad here to score keyword coverage"
            className="min-h-40 resize-y bg-background/50 text-sm leading-6"
          />
        </div>

        {!hasJd && (
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-background/50 p-4 text-sm text-muted-foreground">
            <ScanText className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="leading-6">Paste a job description to see your match score, missing keywords and formatting checks.</p>
          </div>
        )}

        {hasJd && (
          <>
            <div role="progressbar" aria-label="CV match score" aria-valuenow={report.score} aria-valuemin={0} aria-valuemax={100} className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={
                  report.score >= 75 ? 'h-full bg-emerald-500' : report.score >= 50 ? 'h-full bg-amber-500' : 'h-full bg-destructive'
                }
                style={{ width: `${report.score}%` }}
              />
            </div>

            <ul className="divide-y divide-border">
              {report.checks.map((check) => (
                <li key={check.id} className="flex items-start gap-3 py-3 text-sm leading-6">
                  {check.passed ? (
                    <Check className="size-4 mt-1 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <X className="size-4 mt-1 flex-shrink-0 text-destructive" />
                  )}
                  <span>
                    <span className="font-medium">{check.label}</span>
                    <span className="text-muted-foreground"> — {check.detail}</span>
                  </span>
                </li>
              ))}
            </ul>

            {report.missingKeywords.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Missing keywords</p>
                <div className="flex flex-wrap gap-1">
                  {report.missingKeywords.map((word) => (
                    <span key={word} className="text-xs rounded-full bg-destructive/10 text-destructive px-2 py-0.5">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
