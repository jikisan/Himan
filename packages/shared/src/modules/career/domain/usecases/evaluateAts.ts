// Deterministic ATS scoring — no LLM, no network. It reads the CV the way a
// résumé parser does: as plain text. So the input is the rendered cv.html
// stripped to text, not the structured profile, and every check below is one
// an actual applicant-tracking system performs.

export interface AtsCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  weight: number;
}

export interface AtsReport {
  score: number; // 0-100
  checks: AtsCheck[];
  matchedKeywords: string[];
  missingKeywords: string[];
}

// Strip <style>/<script> bodies first — CV_PRINT_CSS would otherwise leak
// selector words into the keyword match.
export function cvPlainText(html: string): string {
  return html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    // Keep list items marked — the bullet checks below count on it.
    .replace(/<li\b[^>]*>/gi, ' • ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','been','but','by','can','for','from','has','have','how','in','into','is','it','its','of','on','or','our','that','the','their','them','they','this','to','was','we','were','what','when','where','which','who','will','with','you','your','yours','us','their','more','than','then','also','all','any','about','across','within','while','using','use','used','must','should','would','could','may','might','well','work','working','role','team','teams','years','year','plus','strong','good','great','ability','able','including','include','includes','etc','join','looking','ideal','candidate','candidates','experience','experienced','requirements','required','responsibilities','qualifications','preferred','nice','bonus','company','job','position','opportunity','benefits','salary','apply','you’ll','well-versed',
]);

const ACTION_VERBS = [
  'led','built','shipped','designed','developed','implemented','created','launched','improved','reduced','increased','migrated','automated','owned','drove','delivered','optimized','refactored','architected','mentored','scaled','integrated','maintained','managed','established','streamlined',
];

function normalize(word: string): string {
  const w = word.toLowerCase();
  // Poor-man's stemmer: only plural 's'. Enough to match "APIs"/"API".
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
}

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9+#./-]*/g) ?? []).map(normalize);
}

// Job-description keywords, ranked by frequency then length. Frequency is the
// only signal available without an LLM, and a term repeated in a JD is
// genuinely what the ATS filter was configured with.
function jobKeywords(jobDescription: string, limit = 25): string[] {
  const counts = new Map<string, number>();
  for (const token of tokens(jobDescription)) {
    if (token.length < 3 || STOPWORDS.has(token) || /^\d+$/.test(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

function check(id: string, label: string, weight: number, passed: boolean, detail: string): AtsCheck {
  return { id, label, weight, passed, detail };
}

export function evaluateAts(cvHtmlOrText: string, jobDescription: string): AtsReport {
  const text = cvHtmlOrText.includes('<') ? cvPlainText(cvHtmlOrText) : cvHtmlOrText;
  const cvTokens = new Set(tokens(text));
  const words = text.split(/\s+/).filter(Boolean);

  const keywords = jobKeywords(jobDescription);
  const matchedKeywords = keywords.filter((k) => cvTokens.has(k));
  const missingKeywords = keywords.filter((k) => !cvTokens.has(k));
  const coverage = keywords.length ? matchedKeywords.length / keywords.length : 0;

  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(text);
  const sections = ['experience', 'education', 'skill'].filter((s) => new RegExp(s, 'i').test(text));
  const bullets = text.match(/[•·]\s*[^•·]{10,}/g) ?? [];
  const quantified = bullets.filter((b) => /\d/.test(b));
  const verbStarted = bullets.filter((b) => {
    const first = normalize(b.replace(/^[•·]\s*/, '').split(/\s+/)[0] ?? '');
    return ACTION_VERBS.includes(first);
  });

  const checks: AtsCheck[] = [
    check(
      'keywords',
      'Job keyword coverage',
      45,
      coverage >= 0.5,
      keywords.length
        ? `${matchedKeywords.length}/${keywords.length} key terms from the job description appear in the CV`
        : 'Paste a job description to score keyword coverage',
    ),
    check('contact', 'Contact details parseable', 10, hasEmail && hasPhone,
      [hasEmail ? null : 'no email', hasPhone ? null : 'no phone number'].filter(Boolean).join(', ') || 'Email and phone found'),
    check('sections', 'Standard section headings', 15, sections.length === 3,
      sections.length === 3 ? 'Experience, education and skills all present' : `Missing: ${['experience', 'education', 'skill'].filter((s) => !sections.includes(s)).join(', ')}`),
    check('quantified', 'Quantified achievements', 15, bullets.length > 0 && quantified.length / bullets.length >= 0.3,
      bullets.length ? `${quantified.length}/${bullets.length} bullets contain a number` : 'No bullet points found'),
    check('verbs', 'Bullets start with action verbs', 5, bullets.length > 0 && verbStarted.length / bullets.length >= 0.5,
      bullets.length ? `${verbStarted.length}/${bullets.length} bullets start with an action verb` : 'No bullet points found'),
    check('length', 'Length in ATS-friendly range', 10, words.length >= 300 && words.length <= 1000,
      `${words.length} words (aim for 300–1000)`),
  ];

  // Keyword coverage scores proportionally; every other check is pass/fail.
  const earned = checks.reduce(
    (sum, c) => sum + (c.id === 'keywords' ? c.weight * coverage : c.passed ? c.weight : 0),
    0,
  );
  const total = checks.reduce((sum, c) => sum + c.weight, 0);

  return {
    score: Math.round((earned / total) * 100),
    checks,
    matchedKeywords,
    missingKeywords,
  };
}
