import type { CareerBlockKind } from '@himan/shared/career';

// Transcribed from docs/superpowers/plans/assets/cover-letter-blocks.md.
// Inserted verbatim via career_blocks.create() on first use of the "Add
// starter blocks" empty-state action — never as a migration, since
// career_blocks.user_id is NOT NULL and per-user seed data has no
// precedent as a migration in this repo.
export interface SeedBlock {
  kind: CareerBlockKind;
  label: string;
  body: string;
  tags: string[];
}

export const SEED_BLOCKS: SeedBlock[] = [
  // ---------- Fixed blocks ----------
  { kind: 'greeting', label: 'Greeting', body: 'Dear {{hiring_manager}},', tags: [] },
  {
    kind: 'opening',
    label: 'Opening',
    body: 'I am excited to apply for the {{job_title}} position at {{company}}. {{hook}}',
    tags: [],
  },
  {
    kind: 'portfolio_line',
    label: 'Portfolio line',
    body: 'You can see examples of this work in my portfolio at https://jikisan.github.io/portfolio/.',
    tags: [],
  },
  {
    kind: 'close',
    label: 'Close',
    body: 'Thank you for your time and consideration. I would welcome the chance to talk about how I can contribute to your team.\n\nSincerely,\nKyle',
    tags: [],
  },

  // ---------- Experience lines ----------
  {
    kind: 'experience_line',
    label: 'Android',
    body: 'With nearly 5 years of professional software development experience, I have shipped production Android applications in Kotlin and Java — spanning Jetpack Compose, Kotlin Multiplatform, and Android TV — including apps currently live on Google Play.',
    tags: ['android'],
  },
  {
    kind: 'experience_line',
    label: 'Mobile (cross-platform)',
    body: 'With nearly 5 years of professional software development experience, I have built and shipped cross-platform mobile applications using React Native, Expo, and Kotlin Multiplatform, with apps published on both Google Play and the App Store.',
    tags: ['mobile'],
  },
  {
    kind: 'experience_line',
    label: 'Web',
    body: 'With nearly 5 years of professional software development experience, I have built production web applications with React, TypeScript, and Vite, backed by REST APIs in FastAPI and Supabase.',
    tags: ['web'],
  },
  {
    kind: 'experience_line',
    label: 'Web + Mobile',
    body: 'With nearly 5 years of professional software development experience, I have delivered web and native mobile applications from shared TypeScript codebases using React, React Native, and Expo.',
    tags: ['web', 'mobile'],
  },
  {
    kind: 'experience_line',
    label: 'Automation (QA)',
    body: 'With nearly 5 years of professional software development experience and ISTQB Tester certification, I have built automated test suites and internal tooling that cut manual QA effort by 60% and reduced production crashes by 50%.',
    tags: ['automation', 'qa'],
  },
  {
    kind: 'experience_line',
    label: 'Automation + Web',
    body: 'With nearly 5 years of professional software development experience and ISTQB Tester certification, I have built React and TypeScript web applications alongside the Selenium automation and internal tooling that keep them stable in production.',
    tags: ['automation', 'web'],
  },
  {
    kind: 'experience_line',
    label: 'Automation (GHL/n8n)',
    body: 'With nearly 5 years of professional software development experience, I build the API integrations, webhooks, and backend services that automation platforms run on — and I write code when the visual builder runs out of room.',
    tags: ['automation', 'n8n', 'ghl'],
  },
  {
    kind: 'experience_line',
    label: 'Automation (n8n, shipped)',
    body: 'With nearly 5 years of professional software development experience, I build automation workflows in n8n backed by real engineering — REST APIs, webhooks, JWT authentication, and custom code nodes where no-code stops.',
    tags: ['automation', 'n8n'],
  },
  {
    kind: 'experience_line',
    label: 'Mobile + TV',
    body: 'With nearly 5 years of professional software development experience, I have built and maintained Android, Apple TV, and Roku applications, publishing 30+ channels across Google Play and the Roku Channel Store.',
    tags: ['mobile', 'tv'],
  },
  {
    kind: 'experience_line',
    label: 'Full Stack',
    body: 'With nearly 5 years of professional software development experience, I have built full-stack applications end to end — React and React Native on the front end, FastAPI, Ktor, and Supabase on the back.',
    tags: ['fullstack'],
  },

  // ---------- Proof paragraphs ----------
  {
    kind: 'proof',
    label: 'Timex Android watch sim',
    body: 'At Timex Group I built an Android watch simulation that replaced physical prototypes in marketing campaigns, cutting associated costs by 90%, and led the code review process that reduced app crashes by 50% while improving load time by 40%.',
    tags: ['android'],
  },
  {
    kind: 'proof',
    label: 'Taily KMP app',
    body: 'I recently shipped Taily, a Kotlin Multiplatform pet-care app with health tracking, AI document scanning, and QR-based co-parenting, built with Jetpack Compose and Supabase and now live on both Google Play and the App Store.',
    tags: ['android', 'mobile'],
  },
  {
    kind: 'proof',
    label: 'TVStartup Compose migration',
    body: 'At TVStartup I migrated a production Android application to Jetpack Compose and Kotlin Multiplatform, improving UI scalability and development speed while keeping the app stable for an existing user base.',
    tags: ['android', 'mobile'],
  },
  {
    kind: 'proof',
    label: 'Flohmarkt platform',
    body: 'I built Flohmarkt, a flea-market and event discovery platform serving both web and native mobile from a single TypeScript monorepo — React with Vite and Tailwind on the front end, FastAPI with JWT and role-based access control on the back — including map-based search, organizer dashboards, and full EN/DE localization.',
    tags: ['web', 'fullstack'],
  },
  {
    kind: 'proof',
    label: 'Flohmarkt shared codebase',
    body: 'On Flohmarkt I shipped a web app and native iOS and Android apps from one shared TypeScript package, using React with Vite for web and React Native with Expo Router for mobile, so business logic and types stayed consistent across all three targets.',
    tags: ['web', 'mobile'],
  },
  {
    kind: 'proof',
    label: 'Selenium suite at Timex',
    body: 'At Timex Group I automated our web application test suite with Selenium, cutting testing effort and turnaround time by 60%, and led the code review process that reduced production crashes by 50%. I hold ISTQB Tester certification and apply the same discipline to internal tooling, including Postman collections that auto-populate auth tokens after login.',
    tags: ['automation', 'qa'],
  },
  {
    kind: 'proof',
    label: 'Automation tooling habit',
    body: 'Beyond feature work I build the tooling that removes repeat effort — Selenium suites that cut testing time by 60%, Postman collections that auto-populate auth tokens, and custom scripts for document generation and code restructuring.',
    tags: ['automation'],
  },
  {
    kind: 'proof',
    label: 'Engineering edge for automation roles',
    body: 'My background is in software engineering, which means I am comfortable where no-code stops — writing custom code nodes, building the webhook endpoints an automation needs to call, and debugging an API integration from the request up. On Flohmarkt I built the FastAPI backend with JWT authentication and role-based access control that both the web and mobile clients consumed.',
    tags: ['automation', 'n8n', 'ghl'],
  },
  {
    kind: 'proof',
    label: 'Process automation reframe',
    body: 'I have automated repetitive process work throughout my career — a Selenium suite at Timex Group that cut testing effort and turnaround by 60%, and Postman collections that auto-populate authentication tokens after login. I am also ISTQB certified, which means I document what I build and design for the failure cases, not just the happy path.',
    tags: ['automation', 'n8n', 'ghl'],
  },
  {
    kind: 'proof',
    label: 'n8n invoicing workflow (placeholder)',
    body: 'I built and run a production n8n workflow that automates my weekly invoicing end to end: it pulls daily reports from Slack, transforms and writes them into a Google Sheet, and generates the invoice — with retry logic for API failures and documentation for every node. It has run every week since {{date}}.',
    tags: ['automation', 'n8n'],
  },
  {
    kind: 'proof',
    label: 'TVStartup channel scale',
    body: 'At TVStartup I built and maintained Android, Apple TV, and Roku applications with consistent UX across all three platforms, publishing over 30 channels to Google Play and the Roku Channel Store.',
    tags: ['tv', 'mobile'],
  },
  {
    kind: 'proof',
    label: 'VSTECH healthcare impact',
    body: 'I developed VSTECH, a Windows application for automated vital-sign graphing with clinical decision support, which reduced nurse charting workload by 80%.',
    tags: ['fullstack'],
  },
  {
    kind: 'proof',
    label: 'Freelance ownership',
    body: 'Working independently for clients I have owned projects end to end — an e-commerce app that raised customer acquisition by 40%, and an HVAC service booking platform that increased technician income by 20% — delivering ahead of schedule and under budget.',
    tags: ['fullstack'],
  },
];
