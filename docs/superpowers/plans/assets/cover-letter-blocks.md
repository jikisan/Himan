# Cover Letter Block Library — June Kyle Santerna

Seed content for the Himan career module. Everything here is drawn from your
portfolio data (`experience_data.json`, `projects_data.json`, `portfolio_config.json`).

---

## FIXED BLOCKS (shared source — same in every item)

### Greeting
```
Dear {{hiring_manager}},
```
*Fallback when unknown: `Dear Hiring Team,`*

### Opening
```
I am excited to apply for the {{job_title}} position at {{company}}.
```

### Portfolio line
```
You can see examples of this work in my portfolio at
https://jikisan.github.io/portfolio/.
```

### Close
```
Thank you for your time and consideration. I would welcome the chance to talk
about how I can contribute to your team.

Sincerely,
Kyle
```

---

## EXPERIENCE LINES (pick one per item)

Replaces your current *"With nearly 5 years... Web, Mobile, and TV applications
using Kotlin, Java, React Native, and Swift."*

**`exp_android`**
> With nearly 5 years of professional software development experience, I have shipped production Android applications in Kotlin and Java — spanning Jetpack Compose, Kotlin Multiplatform, and Android TV — including apps currently live on Google Play.

**`exp_mobile_crossplatform`**
> With nearly 5 years of professional software development experience, I have built and shipped cross-platform mobile applications using React Native, Expo, and Kotlin Multiplatform, with apps published on both Google Play and the App Store.

**`exp_web`**
> With nearly 5 years of professional software development experience, I have built production web applications with React, TypeScript, and Vite, backed by REST APIs in FastAPI and Supabase.

**`exp_web_mobile`**
> With nearly 5 years of professional software development experience, I have delivered web and native mobile applications from shared TypeScript codebases using React, React Native, and Expo.

**`exp_automation_qa`**
> With nearly 5 years of professional software development experience and ISTQB Tester certification, I have built automated test suites and internal tooling that cut manual QA effort by 60% and reduced production crashes by 50%.

**`exp_automation_web`**
> With nearly 5 years of professional software development experience and ISTQB Tester certification, I have built React and TypeScript web applications alongside the Selenium automation and internal tooling that keep them stable in production.

**`exp_automation_ghl_n8n`** — *workflow automation (GHL / n8n / Zapier roles)*
> With nearly 5 years of professional software development experience, I build the API integrations, webhooks, and backend services that automation platforms run on — and I write code when the visual builder runs out of room.

**`exp_automation_n8n_built`** — *use once you have shipped an n8n workflow*
> With nearly 5 years of professional software development experience, I build automation workflows in n8n backed by real engineering — REST APIs, webhooks, JWT authentication, and custom code nodes where no-code stops.

**`exp_mobile_tv`**
> With nearly 5 years of professional software development experience, I have built and maintained Android, Apple TV, and Roku applications, publishing 30+ channels across Google Play and the Roku Channel Store.

**`exp_fullstack`**
> With nearly 5 years of professional software development experience, I have built full-stack applications end to end — React and React Native on the front end, FastAPI, Ktor, and Supabase on the back.

---

## PROOF PARAGRAPHS (pick one or two per item)

This is the block your current letter is missing entirely.

**`proof_android_timex`**
> At Timex Group I built an Android watch simulation that replaced physical prototypes in marketing campaigns, cutting associated costs by 90%, and led the code review process that reduced app crashes by 50% while improving load time by 40%.

**`proof_android_kmp`**
> I recently shipped Taily, a Kotlin Multiplatform pet-care app with health tracking, AI document scanning, and QR-based co-parenting, built with Jetpack Compose and Supabase and now live on both Google Play and the App Store.

**`proof_mobile_migration`**
> At TVStartup I migrated a production Android application to Jetpack Compose and Kotlin Multiplatform, improving UI scalability and development speed while keeping the app stable for an existing user base.

**`proof_web_flohmarkt`**
> I built Flohmarkt, a flea-market and event discovery platform serving both web and native mobile from a single TypeScript monorepo — React with Vite and Tailwind on the front end, FastAPI with JWT and role-based access control on the back — including map-based search, organizer dashboards, and full EN/DE localization.

**`proof_web_mobile_shared`**
> On Flohmarkt I shipped a web app and native iOS and Android apps from one shared TypeScript package, using React with Vite for web and React Native with Expo Router for mobile, so business logic and types stayed consistent across all three targets.

**`proof_automation_selenium`**
> At Timex Group I automated our web application test suite with Selenium, cutting testing effort and turnaround time by 60%, and led the code review process that reduced production crashes by 50%. I hold ISTQB Tester certification and apply the same discipline to internal tooling, including Postman collections that auto-populate auth tokens after login.

**`proof_automation_tooling`**
> Beyond feature work I build the tooling that removes repeat effort — Selenium suites that cut testing time by 60%, Postman collections that auto-populate auth tokens, and custom scripts for document generation and code restructuring.

**`proof_automation_dev_edge`** — *the differentiator for GHL/n8n roles*
> My background is in software engineering, which means I am comfortable where no-code stops — writing custom code nodes, building the webhook endpoints an automation needs to call, and debugging an API integration from the request up. On Flohmarkt I built the FastAPI backend with JWT authentication and role-based access control that both the web and mobile clients consumed.

**`proof_automation_process`** — *reframes Selenium for a workflow-automation audience*
> I have automated repetitive process work throughout my career — a Selenium suite at Timex Group that cut testing effort and turnaround by 60%, and Postman collections that auto-populate authentication tokens after login. I am also ISTQB certified, which means I document what I build and design for the failure cases, not just the happy path.

**`proof_automation_n8n_invoice`** — *PLACEHOLDER — only usable once you actually build this*
> I built and run a production n8n workflow that automates my weekly invoicing end to end: it pulls daily reports from Slack, transforms and writes them into a Google Sheet, and generates the invoice — with retry logic for API failures and documentation for every node. It has run every week since {{date}}.

**`proof_tv_scale`**
> At TVStartup I built and maintained Android, Apple TV, and Roku applications with consistent UX across all three platforms, publishing over 30 channels to Google Play and the Roku Channel Store.

**`proof_impact_healthcare`**
> I developed VSTECH, a Windows application for automated vital-sign graphing with clinical decision support, which reduced nurse charting workload by 80%.

**`proof_ownership_freelance`**
> Working independently for clients I have owned projects end to end — an e-commerce app that raised customer acquisition by 40%, and an HVAC service booking platform that increased technician income by 20% — delivering ahead of schedule and under budget.

---

## ASSEMBLED EXAMPLES

### Item: Android Developer
> Dear Hiring Team,
>
> I am excited to apply for the Senior Android Engineer position at Acme.
>
> With nearly 5 years of professional software development experience, I have shipped production Android applications in Kotlin and Java — spanning Jetpack Compose, Kotlin Multiplatform, and Android TV — including apps currently live on Google Play.
>
> At Timex Group I built an Android watch simulation that replaced physical prototypes in marketing campaigns, cutting associated costs by 90%, and led the code review process that reduced app crashes by 50% while improving load time by 40%. I recently shipped Taily, a Kotlin Multiplatform pet-care app built with Jetpack Compose and Supabase, now live on both Google Play and the App Store.
>
> You can see examples of this work in my portfolio at https://jikisan.github.io/portfolio/.
>
> Thank you for your time and consideration. I would welcome the chance to talk about how I can contribute to your team.
>
> Sincerely,
> Kyle

### Item: Automation Specialist
> Dear Hiring Team,
>
> I am excited to apply for the QA Automation Engineer position at Acme.
>
> With nearly 5 years of professional software development experience and ISTQB Tester certification, I have built automated test suites and internal tooling that cut manual QA effort by 60% and reduced production crashes by 50%.
>
> At Timex Group I automated our web application test suite with Selenium, cutting testing effort and turnaround time by 60%, and led the code review process that reduced production crashes by 50%. Beyond test automation I build tooling that removes repeat effort — Postman collections that auto-populate auth tokens, and custom scripts for document generation and code restructuring.
>
> You can see examples of this work in my portfolio at https://jikisan.github.io/portfolio/.
>
> Thank you for your time and consideration. I would welcome the chance to talk about how I can contribute to your team.
>
> Sincerely,
> Kyle

### Item: Web + Mobile Developer
> Dear Hiring Team,
>
> I am excited to apply for the Software Engineer (Web & Mobile) position at Acme.
>
> With nearly 5 years of professional software development experience, I have delivered web and native mobile applications from shared TypeScript codebases using React, React Native, and Expo.
>
> On Flohmarkt I shipped a web app and native iOS and Android apps from one shared TypeScript package, using React with Vite for web and React Native with Expo Router for mobile, so business logic and types stayed consistent across all three targets. At OnlineJobs.PH I now lead development across both web and mobile, integrating backend APIs for real-time data and optimizing performance across devices.
>
> You can see examples of this work in my portfolio at https://jikisan.github.io/portfolio/.
>
> Thank you for your time and consideration. I would welcome the chance to talk about how I can contribute to your team.
>
> Sincerely,
> Kyle

---

## SUGGESTED ITEMS AND THEIR BLOCK SELECTIONS

| Item | Experience line | Proof paragraph(s) |
|---|---|---|
| Android Developer | `exp_android` | `proof_android_timex` + `proof_android_kmp` |
| Mobile Developer | `exp_mobile_crossplatform` | `proof_android_kmp` + `proof_mobile_migration` |
| Web Developer | `exp_web` | `proof_web_flohmarkt` |
| Web + Mobile Developer | `exp_web_mobile` | `proof_web_mobile_shared` |
| QA / Test Automation | `exp_automation_qa` | `proof_automation_selenium` |
| Automation + Web | `exp_automation_web` | `proof_automation_selenium` + `proof_web_flohmarkt` |
| **Workflow Automation (GHL/n8n)** | `exp_automation_ghl_n8n` | `proof_automation_dev_edge` + `proof_automation_process` |
| **Workflow Automation (after n8n build)** | `exp_automation_n8n_built` | `proof_automation_n8n_invoice` + `proof_automation_dev_edge` |
| Mobile + TV Developer | `exp_mobile_tv` | `proof_tv_scale` |
| Full Stack Developer | `exp_fullstack` | `proof_web_flohmarkt` + `proof_android_kmp` |

---

## GAPS TO FILL

1. **Automation is missing from the portfolio site itself.** The Selenium work and ISTQB certification exist in your data but no project showcases automation. Consider adding one — the Postman token pipeline, the browser extension refactor, or the Claude Code restructuring command.
2. **`portfolio_config.json` skills list has no testing/automation entries.** Add Selenium, Jest, Vitest, and Playwright if you use it.
3. **Flohmarkt's backend stack (FastAPI, JWT, RBAC) is not in your skills list** — it's only visible inside the project entry.
4. **Your portfolio title is "Full Stack Software Developer"** but you apply as Android/Mobile/Web/Automation. Consider whether that headline helps or blurs the signal.
