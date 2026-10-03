---
version: 1
slug: "src-modules-career-presentation-portfolio"
primary_target: "src/modules/career/presentation/portfolio"
related_targets: []
---

# Public career portfolio (/p/:token)

Mode: Experience (the builds lead), with Persuade's one action (contact).
Audience: a recruiter or hiring manager who clicked a link inside a job application, cold, often on a phone, deciding in under a minute whether to read the CV.
Job: prove the candidate ships, for this specific role. Content is chosen per career item (its CV layout), UI is identical across items.
Constraints: public, no login; no phone ever; email only if the owner opts in; reduced motion respected; lives inside Himan but owns its own visual world (the app's shadcn look stays in the app).

## Direction contract

THESIS: Evidence over adjectives: every section is a build you can open. Refuses avatar + bio + skill bars + same-size card grid.
OWN-WORLD: Ink navy field (#020c1f/#031942), one sky accent (#0EA5E9) owning the surname, rules and active state; Archivo expanded black uppercase display over Archivo text; hairline white/10 rules; browser-chrome frames; Tech → Platform chips.
STORY: Name and role in two seconds, then one proof claim, then live builds, then the career line, then a way to reply.
FIRST VIEWPORT: Splash (name rises, sky rule draws, headline fades, overlay lifts at 1.85s). Hero: surname-split wordmark left-aligned at display scale, role line under it, headline plus location, primary "See the work", secondary contact, faint grid with top-right sky glow.
FORM: Pinned by brief (geotechengine.com reference); no concept roll. Signature interaction: build list drives the browser frame, sky indicator slides between rows (shared layout).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
