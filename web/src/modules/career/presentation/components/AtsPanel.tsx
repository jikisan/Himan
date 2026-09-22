import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
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
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">ATS check</h3>
        {hasJd && <span className={`text-sm font-semibold ${scoreTone(report.score)}`}>{report.score}/100</span>}
      </div>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jobDescription">Job description</Label>
          <Textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job ad here to score keyword coverage"
            className="min-h-24 text-sm"
          />
        </div>

        {hasJd && (
          <>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={
                  report.score >= 75 ? 'h-full bg-emerald-500' : report.score >= 50 ? 'h-full bg-amber-500' : 'h-full bg-destructive'
                }
                style={{ width: `${report.score}%` }}
              />
            </div>

            <ul className="space-y-1.5">
              {report.checks.map((check) => (
                <li key={check.id} className="flex items-start gap-2 text-xs">
                  {check.passed ? (
                    <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <X className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-destructive" />
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
