# Architecture — App Builder Multi-Agent System

> **Output type legend:**
> 💻 Code — source files that are executed / compiled
> 📋 Document — specification / guidance files that direct other agents
> 🔍 Report — analysis / review files that drive fix rounds
> ⚙️ Config — configuration files (Docker, CI, tsconfig, Fastlane)

---

## System Structure — 3 Tiers

```
┌─────────────────────────────────────────────────────────┐
│  Leaders Team (Layer 2b — parallel)                     │
│  VP PM · Tech Lead · QA Lead · Security Lead            │
│  Design Lead · Rendering Strategy · Input Policy        │
│  Produce guideline documents consumed by all teams      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Platform Team (Layer 2c — 7-phase pipeline)            │
│  Spec → Build → Feature Infra → QA loop → Security     │
│  → PM Review → PM fix round                            │
│  Builds shared/components · shared/api · shared/db      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Squad A     │  │  Squad B     │  │  Squad C     │  ← parallel
│  PM→Design   │  │  PM→Design   │  │  PM→Design   │
│  →Dev→ErrH   │  │  →Dev→ErrH   │  │  →Dev→ErrH   │
│  →Clean→Dedup│  │  →Clean→Dedup│  │  →Clean→Dedup│
│  →CMS→QA loop│  │  →CMS→QA loop│  │  →CMS→QA loop│
│  →Sec→PM loop│  │  →Sec→PM loop│  │  →Sec→PM loop│
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Phase 0 — Startup (index.js)

```
1. UI language selection: lang.js → selectLanguage()
   8 supported languages: EN / HE / AR / ES / FR / DE / RU / ZH
   All user-facing text uses t() calls throughout the run.
   getLangInstruction() is injected into AI prompts so that planner
   and designPicker also output in the selected language.

2. Requirements mode selection:
   Mode 1 — AI planning session: planner.js (Sonnet conversation)
   Mode 2 — Direct text input

3. GitHub repository: askForGithubRepo()
   validateGithubAccess() — or create a new repo

4. designPicker.js (optional): Sonnet proposes 3 design themes, user picks one.
   The chosen spec is appended to requirements before orchestrate() is called.

5. Checkpoint check: if .build-checkpoint.json exists, show 3 options:
   1️⃣  Fresh build from scratch
   2️⃣  Resume from last completed layer
   3️⃣  Update / add a feature  ← requires squadPlan in checkpoint

Note: model selection (Light / Medium / Heavy per agent category) happens
      inside orchestrate() after the plan is approved and the tier is set.
      There is no separate tier prompt in index.js.
```

---

## Phase 1 — Plan Creation (orchestrator.js)

```
createPlan()      — Sonnet 4.6 → JSON plan (tech stack, agents, optionalAgents, tier)
                    → approval gate shown to user
selectBuildTier() — interactive: user can keep PM-recommended tier or override (0–3)
selectAgentModels()— interactive: user can keep default model config or customize
                    per category (Light / Medium / Heavy). In mock mode: auto-accept.
createSquadPlan() — Sonnet 4.6 → squad split by domain
                    → approval gate shown to user
ProjectContext created (requirements, plan, squadPlan, outputDir)
```

---

## LAYER 1 — Discovery (sequential)

| Agent | Task | Input | Output | Type |
|-------|------|-------|--------|------|
| **requirementsAnalyst** | Converts raw requirements into a structured PRD: user stories, acceptance criteria, edge cases, MVP scope | Raw requirements | `docs/requirements-spec.md`, `docs/domain-glossary.md` | 📋 |
| **systemArchitect** | Defines system architecture: monolith vs microservices, patterns, full tech stack | requirementsAnalyst | `docs/system-architecture.md`, `docs/architecture.md` | 📋 |
| **mobileTechAdvisor** *(opt)* | Selects mobile framework, state management, navigation, build config | requirementsAnalyst + systemArchitect | `docs/mobile-tech-decisions.md` | 📋 |
| **webTechAdvisor** *(opt)* | Selects web framework, TypeScript setup, monorepo config, ESLint/Prettier | requirementsAnalyst + systemArchitect | `docs/web-tech-decisions.md` | 📋 |
| **businessPlanningAgent** *(opt)* | Estimates costs, defines MVP scope and business roadmap | requirementsAnalyst | `docs/business-plan.md` | 📋 |

---

## LAYER 2 — Design (parallel)

> All agents read Layer 1 outputs only — no dependencies among them, so they run simultaneously.

| Agent | Task | Input | Output | Type |
|-------|------|-------|--------|------|
| **dataArchitect** | Designs full data model: entities, relations, indexes, constraints. Blueprint for dbSchemaAgent | requirementsAnalyst + systemArchitect | `docs/data-model.md` | 📋 |
| **apiDesigner** | Defines every endpoint: method, path, request/response schema, auth. Contract between backend and frontend | requirementsAnalyst + systemArchitect | `docs/api-design.md` | 📋 |
| **frontendArchitect** | Defines folder structure, routing, state management, data fetching for the client side | requirementsAnalyst + systemArchitect | `docs/frontend-architecture.md` | 📋 |
| **uxDesignerAgent** *(opt)* | Draws text wireframes for every screen, defines user flows, empty/error/loading states | requirementsAnalyst + systemArchitect | `docs/ux-flows.md`, `docs/wireframes.md` | 📋 |

---

## LAYER 2b — Leaders Team (parallel)

> Every agent here reads Layer 1+2 outputs. No dependencies within Layer 2b itself — all run in parallel.
> **Each agent produces a guideline document** that feature squads read before starting work.

| Agent | Task | Input | Output | Type |
|-------|------|-------|--------|------|
| **vpPmAgent** | Reads requirements + squad split → defines per-Squad PM tasks: user stories, acceptance criteria, inter-squad dependencies, priority (P0/P1/P2) | requirementsAnalyst + systemArchitect + dataArchitect + apiDesigner | `docs/guidelines/pm-guidelines.md` | 📋 |
| **techLeadAgent** | Defines coding standards: module structure, naming conventions, mandatory shared/ usage, error handling patterns, testing requirements. **Includes timezone rules:** store UTC everywhere, convert only at display layer — TIMESTAMPTZ in DB, Intl.DateTimeFormat in UI | systemArchitect + apiDesigner + dataArchitect + frontendArchitect | `docs/guidelines/tech-guidelines.md` | 📋 |
| **qaLeadAgent** | Defines testing strategy: unit vs integration, coverage requirements, test data, forbidden patterns, accessibility requirements. **Includes timezone test patterns:** UTC storage, client normalization, date range, local display, date picker UTC | requirementsAnalyst + apiDesigner + systemArchitect | `docs/guidelines/qa-guidelines.md` | 📋 |
| **securityLeadAgent** | Analyzes threat model for this specific project → produces project-specific OWASP checklist + per-squad security guidance based on what each squad handles | systemArchitect + apiDesigner + dataArchitect | `docs/guidelines/security-guidelines.md` | 📋 |
| **designLeadAgent** | Writes two documents: (1) design system — tokens, variants, dark mode. (2) design guidelines for every Squad Designer | frontendArchitect + uxDesignerAgent | `docs/design-system.md`, `docs/guidelines/design-guidelines.md` | 📋 |
| **renderingStrategyAgent** *(opt)* | Decides CSR/SSR/SSG/ISR per page in Next.js/Nuxt, defines App Router and protected routes | systemArchitect + frontendArchitect | `docs/rendering-strategy.md` | 📋 |
| **inputPolicyAgent** | Produces full validation policy: max length, regex, file types/sizes, timing, error messages for every input field | requirementsAnalyst + uxDesignerAgent | `docs/input-policy.md` | 📋 |

---

## LAYER 2c — Platform Pipeline (7 phases, `platformRunner.js`)

> The platform team runs the **same** pipeline as every squad: spec → build → feature infra → QA loop → security → PM review → PM fix.
> Entirely managed by `platformRunner.js` — the orchestrator runs it as Layer 2c then moves directly to Layer 3.

### Pipeline Phases

| Phase | Agent / Action | Output | Type |
|-------|----------------|--------|------|
| **Phase 1** — Spec | **platformPmAgent** — reads pm-guidelines + design + API + data model → writes detailed platform spec | `docs/squads/platform-spec.md` | 📋 |
| **Phase 2** — Build | **uiPrimitivesAgent** → **uiCompositeAgent** → **apiClientAgent** → **dbSchemaAgent** (sequential) | `shared/components/`, `shared/api/`, `shared/db/` | 💻 |
| **Phase 3** — Feature Infra | All selected feature agents (parallel) | `shared/notifications/`, `shared/animations/`, `shared/offline/`, … | 💻 |
| **Phase 4** — QA loop | **platformQaAgent** → if INCOMPLETE → re-run Phase 2 → re-check (max 2 rounds) | `docs/squads/platform-review.md` — READY / INCOMPLETE | 🔍 |
| **Phase 5** — Security | **platformSecurityAgent** — scans `shared/` against security-guidelines | `docs/squads/platform-security-report.md` — SECURE / NEEDS_FIXES | 🔍 + 💻 |
| **Phase 6** — PM Review | **platformPmReview** — checks spec vs actual implementation | `docs/squads/platform-pm-review.md` — ACCEPTED / GAPS | 🔍 |
| **Phase 7** — PM Fix | If GAPS → re-run Phase 2 → QA re-check → PM re-review | — | 💻 |

### Phase 2 — Platform Build

| Agent | Task | Input | Output |
|-------|------|-------|--------|
| **uiPrimitivesAgent** | Implements all base components: Button, Input, Select, Checkbox, Radio, TextArea, Typography, Icon, Badge, Avatar, Spinner, Tooltip + index.ts | designLeadAgent + uxDesignerAgent + inputPolicyAgent | `shared/components/primitives/` |
| **uiCompositeAgent** | Implements composite components: Card, Modal, Drawer, Toast, Table, Carousel, **EmptyState, ErrorState, LoadingState** (mandatory), NavBar, Sidebar + index.ts | uiPrimitivesAgent + uxDesignerAgent | `shared/components/composite/` |
| **apiClientAgent** | HTTP wrapper with auth injection, retry, timeout. Typed methods for every endpoint | apiDesigner + systemArchitect | `shared/api/` |
| **dbSchemaAgent** | DB connection, model/entity files, migrations. Mongoose/Prisma/TypeORM/Sequelize/Drizzle | dataArchitect + systemArchitect | `shared/db/` |

### Phase 3 — Feature Infrastructure (parallel, optional per PM selection)

#### Mobile
| Agent | Infrastructure | Output |
|-------|----------------|--------|
| **notificationsAgent** | FCM/APNs service, notification handlers, local reminders | `shared/notifications/` |
| **deepLinksAgent** | Universal Links, App Links, deep link router | `shared/deepLinks/` |
| **offlineFirstAgent** | WatermelonDB/TanStack persistence, offline queue, sync engine | `shared/offline/` |
| **realtimeAgent** | Socket.io server + client hooks, live update infrastructure | `shared/realtime/` |
| **animationsAgent** | Reanimated utils, animation hooks, Lottie wrapper, Skeleton, BottomSheet, SwipeableRow, haptics | `shared/animations/` |
| **onboardingAgent** | Splash screen, onboarding slides, PermissionRationale, FeatureDiscovery, EmptyState, ProfileSetup | `mobile/src/screens/onboarding/` |
| **monetizationAgent** | RevenueCat SDK, IAP flows, subscription service | `shared/monetization/` |
| **mlMobileAgent** | ML Kit/TFLite utilities, OCR, face detection | `shared/ml/` |
| **arVrAgent** | ARKit/ARCore setup, 3D scene utilities | `shared/ar/` |
| **widgetsExtensionsAgent** | Home screen widget infrastructure, Share extension setup | widget targets |
| **otaUpdatesAgent** | Expo EAS Update / CodePush config, update check service | `shared/updates/` |
| **socialSharingAgent** | Native Share Sheet, URL schemes (WhatsApp/Telegram/Instagram/Facebook/Twitter/LinkedIn/SMS), clipboard, `OpenInApp` utilities including **native calendar event creation** — exports `useShare()` + `OpenInApp` from `shared/sharing/` | `shared/sharing/` |

#### Web
| Agent | Infrastructure | Output |
|-------|----------------|--------|
| **responsiveDesignAgent** | Mobile-first CSS utilities, breakpoint hooks, fluid typography | `shared/responsive/` |
| **pwaAgent** | Service Worker, Web App Manifest, offline cache, install prompt hook | `public/sw.js`, `public/manifest.json` |
| **webMonetizationAgent** | Stripe Billing, checkout, customer portal, webhook handler, feature gate | `shared/billing/` |

#### Cross-platform
| Agent | Infrastructure | Output |
|-------|----------------|--------|
| **localizationAgent** *(opt)* | i18n infrastructure — i18next setup, device language detection, runtime switching, RTL layout mirroring. Languages: LTR (en/es/fr/de/zh/ja/…) and RTL (he/ar/fa/ur) | `shared/i18n/` |

**Every squad receives in context:**
```
⚠️ MANDATORY — import from platform, do NOT duplicate:
  import { Button, Input }    from '../../shared/components/primitives';
  import { Card, EmptyState } from '../../shared/components/composite';
  import { api }              from '../../shared/api';
  import type { User, ... }   from '../../shared/api/types';
  import { User, connect }    from '../../shared/db';
```

---

## LAYER 3 — Implementation — Squad Mode (squads run in parallel)

Each squad runs **sequentially internally** across 9 phases. The squads themselves run **in parallel** with each other.

### Self-Planning Pattern (every code-writing agent — no exceptions)
Before writing **any** file, **every** code-writing agent writes a plan for itself:
```
docs/agent-plans/{agentName}-{squadId}.md:
  ## Files to create
  - path/to/file.ts — description
  ## Files to modify
  - path/to/existing.ts — what changes
  ## Execution order
  1. First: ...
```

**All 37 code-writing agents** are bound by this step:

| Category | Agents |
|----------|--------|
| Core implementation | `backendDev`, `frontendDev`, `authAgent`, `integrationAgent` |
| Platform build | `uiPrimitivesAgent`, `uiCompositeAgent`, `apiClientAgent`, `dbSchemaAgent` |
| Per-squad specialists | `squadErrorHandlingAgent`, `squadCodeCleanupAgent`, `squadDeduplicationAgent`, `squadQaAgent`, `squadSecurityAgent` |
| Mobile features (Platform Phase 3) | `notificationsAgent`, `deepLinksAgent`, `offlineFirstAgent`, `realtimeAgent`, `animationsAgent`, `onboardingAgent`, `monetizationAgent`, `mlMobileAgent`, `arVrAgent`, `widgetsExtensionsAgent`, `otaUpdatesAgent` |
| Web features (Platform Phase 3) | `responsiveDesignAgent`, `pwaAgent`, `webMonetizationAgent`, `cmsIntegratorAgent` |
| Cross-platform (Platform Phase 3) | `localizationAgent`, `socialSharingAgent` |
| Global refinement | `codeDeduplicationAgent` |
| Quality | `testWriter`, `loadTestingAgent`, `testFixer` |
| Operations | `devops`, `analyticsMonitoring`, `appStorePublisher` |

### The 9 Squad Phases

| Phase | Agent | Task | Input | Output | Type |
|-------|-------|------|-------|--------|------|
| 1 | **Squad PM (Spec)** | Reads pm-guidelines + requirements → translates into concrete technical tasks for this squad only: endpoints, screens, acceptance criteria | vpPmAgent guidelines + design docs + squad info | `docs/squads/{id}-spec.md` | 📋 |
| 2 | **squadDesignerAgent** | Reads design-guidelines + squad spec → writes detailed screen-by-screen design: components, layout, states, forms, navigation | designLeadAgent guidelines + spec + ux-flows | `docs/squads/{id}-design.md` | 📋 |
| 3 | **backendDev** | Implements backend for squad domain per tech-guidelines + spec: routes, controllers, services, DB queries | tech-guidelines + spec + shared/db + shared/api | `backend/src/modules/{squad}/` | 💻 |
| 3 | **frontendDev** | Implements frontend for squad domain per tech-guidelines + squad design: screens, hooks, forms | tech-guidelines + squad design + shared/components + shared/api | `frontend/src/{squad}/` | 💻 |
| 3 | **authAgent** *(squad auth only)* | Implements JWT/session, login/register/logout, route protection | tech-guidelines + spec + shared/db + inputPolicyAgent | auth routes + middleware | 💻 |
| 3 | **integrationAgent** *(opt)* | Implements third-party APIs, webhooks, external services | tech-guidelines + spec | integration services | 💻 |
| 4a | **squadErrorHandlingAgent** | **Only** error handling: asyncHandler on every route handler, ErrorBoundary on every screen, .catch on every API call | tech-guidelines + all squad files | in-place updates + `docs/squads/{id}-errorhandling-report.md` | 💻 (modifies existing) |
| 4b | **squadCodeCleanupAgent** | **Only** code cleanup: unused imports, console.log, debugger, dead code, commented-out blocks | tech-guidelines + all squad files | in-place updates + `docs/squads/{id}-codecleanup-report.md` | 💻 (modifies existing) |
| 4c | **squadDeduplicationAgent** | **Only** within-squad duplicates: extracts repeated patterns into `{squad}/utils.ts` | all squad files | `{squad}/utils.ts` + updated imports + `docs/squads/{id}-dedup-report.md` | 💻 |
| 5 | **cmsIntegratorAgent** *(opt)* | **Combined per-squad CMS agent**: (1) checks if CMS infra exists — if not, sets it up (Payload/Strapi, contentService, useContent hook). (2) scans squad files for hardcoded text. (3) adds seed data. (4) applies t() replacements | frontendDev + backendDev + systemArchitect | CMS config *(first squad only)* + `cms/seed-data.json` + updated files + `docs/squads/{id}-cms-report.md` | 💻 |
| 6 | **squadQaAgent** | Writes unit + integration tests, runs them, fixes failures, checks accessibility. **Then QA fix loop (max 2 rounds)** | qa-guidelines + spec + all squad files | `*.test.ts`, `docs/squads/{id}-qa-report.md` | 💻 + 🔍 |
| 6+ | **QA Fix Loop** | If QA report contains FAIL → dev agents fix → QA re-check (max 2 rounds) | qa-report | in-place fixes | 💻 |
| 7 | **squadSecurityAgent** | Applies security-guidelines OWASP checklist to this squad's code specifically. Fixes HIGH severity findings directly | security-guidelines + all squad files | `docs/squads/{id}-security-report.md` + fixes | 🔍 + 💻 |
| 8 | **Squad PM (Review)** | Reads spec + all squad files → were all acceptance criteria met? | spec + all squad files | `docs/squads/{id}-review.md` — VERDICT: ACCEPTED / GAPS | 🔍 |
| 9 | **PM Fix Loop** *(if GAPS)* | Dev agents read the gaps → fix → **QA re-check** → PM re-review | squad gaps doc | in-place fixes | 💻 |

After all squads, `_mergeOutputsToContext()` merges outputs:
`auth:backendDev` + `listings:backendDev` → `agentOutputs['backendDev']`

---

## LAYER 3f — Global Deduplication (sequential)

> squadDeduplicationAgent removes duplicates **within each squad**. This layer removes duplicates **across squads**.

| Agent | Task | Input | Output | Type |
|-------|------|-------|--------|------|
| **codeDeduplicationAgent** | Reads **all code from all squads** → identifies cross-squad duplicates → extracts to `shared/utils/` | backendDev + frontendDev + authAgent | `shared/utils/` + updated imports + `docs/deduplication-report.md` | 💻 (modifies existing) |

---

## LAYER 4 — Global Quality (parallel)

> squadQaAgent and squadSecurityAgent work **on each squad's code separately**.
> This layer runs a quality + audit pass **on the entire unified application**.

| Agent | Task | Input | Output | Type |
|-------|------|-------|--------|------|
| **testWriter** | Writes additional cross-squad tests: integration between squads, E2E flows | backendDev + frontendDev + authAgent + dataArchitect | additional `*.test.ts` | 💻 |
| **security** | Global security review across the entire application | backendDev + authAgent + apiDesigner | `docs/security-report.md` | 🔍 |
| **reviewer** | Global code review: patterns, consistency across squads | backendDev + frontendDev + authAgent + integrationAgent | `docs/code-review.md` | 🔍 |
| **errorAuditAgent** | **Scans all code** → reports where error handling is missing (asyncHandler, ErrorBoundary, catch). **Does not fix** — reports only | backendDev + frontendDev + authAgent | `docs/audits/error-audit.md` | 🔍 |
| **codeQualityAuditAgent** | **Scans all code** → reports cross-squad duplicates, unused code, anti-patterns. **Does not fix** — reports only | backendDev + frontendDev + codeDeduplicationAgent | `docs/audits/code-quality-audit.md` | 🔍 |
| **cmsQaAgent** *(opt, if cmsIntegratorAgent active)* | **Scans CMS setup** → duplicate seed keys, missing keys, orphaned entries, cache/error handling in service | cmsIntegratorAgent + frontendDev | `docs/audits/cms-audit.md` | 🔍 |
| **performanceAgent** *(opt)* | Full app profiling: startup, memory, 60fps | frontendDev + frontendArchitect | `docs/performance-report.md` | 🔍 |
| **webPerformanceAgent** *(opt)* | Core Web Vitals, bundle analysis, code splitting | frontendDev + frontendArchitect + renderingStrategyAgent | `docs/web-performance-report.md` | 🔍 |
| **accessibilityAgent** *(opt)* | Global WCAG 2.1 review | frontendDev | `docs/accessibility-report.md` | 🔍 |
| **loadTestingAgent** *(opt)* | k6 load/stress/soak scripts for the full backend | backendDev + apiDesigner + devops | `k6/` | 💻 |
| **dependencyManagementAgent** *(opt)* | npm audit, licenses, outdated packages | frontendDev + backendDev | `docs/dependency-report.md` | 🔍 |
| **userTestingAgent** *(opt)* | TestFlight/Firebase Distribution setup, A/B testing scripts | frontendDev + backendDev | `docs/user-testing-plan.md` | 📋 |
| **privacyEthicsAgent** *(opt)* | GDPR/CCPA: cookie consent, data retention, data deletion endpoints | backendDev + frontendDev + analyticsMonitoring | `docs/privacy-report.md` | 🔍 |

---

## LAYER 4b — Test Run (sequential, global)

| Agent | Task | Input | Output | Type |
|-------|------|-------|--------|------|
| **testRunner** | Runs `npm install` + full test suite (jest/vitest/playwright) with `\|\| true`. Needs the complete app — therefore global. Shell access only. | testWriter + code files | `docs/quality-findings/test-results.md` | 🔍 |

**Smart skip:** if `testWriter` produced 0 files in the current run, Layer 4b is skipped and marked complete automatically.

---

## LAYER 4c — Test Fix (sequential, global)

| Agent | Task | Input | Output | Type |
|-------|------|-------|--------|------|
| **testFixer** | Reads test-results.md and for each failure reads the test + source. If test is wrong → fixes test. If code is wrong → fixes code. | test-results.md | in-place fixes | 💻 (modifies existing) |

**Smart skip:** skipped automatically if Layer 4b was skipped (testWriter wrote 0 files).

---

## 🔄 Quality Fix Loop (up to 2 rounds, squad-based)

```
After Layer 4c — buildQualityFeedback() collects summaries from:
  testWriter, testRunner, testFixer, reviewer, security,
  performanceAgent, webPerformanceAgent, accessibilityAgent, dependencyManagementAgent

If issues found → approval gate shown to user

  mapFindingsToSquads() parses the findings text:
    - identifies file paths (modules/{backendModule}/, src/{frontendModule}/)
    - maps each section to the responsible squad
    - sections with no specific path → broadcast to all squads
    - shared/ / platform/ sections → sent to the platform team

  Each squad receives only its relevant findings:
    runSquadUpdate(squad, filteredFindings, ...) — runs the full squad pipeline:
      PM spec update → devs fix → cleanup → QA → security → PM review

  Platform team (if shared/ files were affected):
    uiPrimitivesAgent + uiCompositeAgent + apiClientAgent + dbSchemaAgent (sequential)
    context.setPlatformUpdateNote() injects the findings

  Quality re-run: Layer 4 → 4b → 4c
  approval gate → another round if needed (max 2 total)

Fallback (no squad plan): backendDev + frontendDev + authAgent (parallel) — classic mode

Implementation: orchestrator.js — mapFindingsToSquads() + after layerDef.id === '4c'
```

---

## LAYER 5 — Operations (parallel, no approval gate)

| Agent | Task | Input | Output | Type |
|-------|------|-------|--------|------|
| **devops** | **Step 0**: reads all `package.json` files, detects Expo native modules, generates a smart `scripts/install.sh`. Then: Dockerfile, docker-compose, GitHub Actions CI/CD, nginx, env vars | systemArchitect + backendDev + frontendDev | `scripts/install.sh`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `nginx.conf` | ⚙️ |
| **documentation** | README, developer guide, API reference, CONTRIBUTING, mobile dev guide (if RN). Also writes `docs/setup-guide.md` — step-by-step setup (env vars, DB, Firebase, Stripe, code signing). Also writes `docs/INDEX.md` — navigation index for all docs | requirementsAnalyst + apiDesigner + backendDev + frontendDev + devops | `README.md`, `docs/developer-guide.md`, `docs/api-reference.md`, `docs/setup-guide.md`, `docs/INDEX.md` | 📋 |
| **deploymentAdvisor** | Reads the project → produces `docs/deployment-guide.md` with 3 tier-appropriate deployment options, step-by-step instructions, cost estimates ($USD/month), and troubleshooting. Tier 1→Vercel/Railway/Expo, Tier 2→DigitalOcean/Railway Pro/EAS, Tier 3→AWS/GCP/Azure/K8s | all agent outputs + docs/deployment.md | `docs/deployment-guide.md` | 📋 |
| **analyticsMonitoring** *(opt)* | Sentry, GA4/Plausible, RUM, feature flags | frontendDev + backendDev | Sentry config, analytics setup | 💻 + ⚙️ |
| **seoAgent** *(opt)* | meta tags, Open Graph, JSON-LD, sitemap.xml, robots.txt | frontendDev + renderingStrategyAgent + frontendArchitect | SEO components, sitemap | 💻 |
| **appStorePublisher** *(opt)* | Fastlane, code signing, App Store Connect + Google Play | systemArchitect + frontendDev + devops | Fastlane config, `docs/release-checklist.md` | ⚙️ + 📋 |
| **asoMarketingAgent** *(opt)* | App Store Optimization: keywords, store listing copy, screenshot strategy | requirementsAnalyst | `docs/store-listing.md` | 📋 |

---

## PM Acceptance Review (global, VP-level)

| Agent | Task | Input | Output | Type |
|-------|------|-------|--------|------|
| **pmReviewer** | Reads the entire project and checks full coverage against the original requirements. Returns a verdict with a gap list | vpPmAgent + requirementsAnalyst + all agent outputs | `docs/pm-review.md` — ✅/⚠️/❌ per requirement + **VERDICT: ACCEPTED / NEEDS_FIXES** | 🔍 |

**PM Fix Loop (up to 2 rounds):** if NEEDS_FIXES → backendDev + frontendDev + authAgent fix → Quality re-run → PM re-review.

---

## 🏢 Squad System — Runtime Mechanics

### Squad Planner (squadPlanner.js)
Sonnet 4.6 splits into squads: 2–3 small project, 3–5 medium, 5–6 large.
Each squad: `id`, `name`, `userFacingArea`, `backendModule`, `frontendModule`, `keyFeatures`, `agents`

### Squad Runner (squadRunner.js)
```
runAllSquads() — all squads in parallel
  runSquad(squad):
    Phase 1:  Squad PM Spec           → docs/squads/{id}-spec.md          📋
    Phase 2:  squadDesignerAgent      → docs/squads/{id}-design.md        📋
              Smart skip: if squad has no frontendDev → phase 2 is skipped
    Phase 3:  dev agents              → backend + frontend code            💻
    Phase 4a: squadErrorHandlingAgent → error handling per-squad           💻
    Phase 4b: squadCodeCleanupAgent   → code cleanup per-squad            💻
    Phase 4c: squadDeduplicationAgent → within-squad dedup                💻
    Phase 5:  cmsIntegratorAgent *(opt)* → CMS migration                  💻
    Phase 6:  squadQaAgent            → tests + accessibility + QA fix loop (max 2)
    Phase 7:  squadSecurityAgent      → security review                   🔍 + 💻
    Phase 8:  Squad PM Review         → VERDICT: ACCEPTED / GAPS          🔍
    Phase 9:  PM fix round if GAPS    → dev fix → QA re-check → PM re-review

_mergeOutputsToContext(): merges per-squad outputs for global Layer 4
```

### Leadership Context Flow
```
Leaders Team writes → docs/guidelines/
                              ↓
                     injected via GUIDELINE_MAP in context.js:
  vpPmAgent         → Squad PM + platformPmAgent
  techLeadAgent     → backendDev + frontendDev + authAgent + integrationAgent
                       + squadErrorHandlingAgent + squadCodeCleanupAgent + squadDeduplicationAgent
  designLeadAgent   → squadDesignerAgent + uiPrimitivesAgent + uiCompositeAgent
  qaLeadAgent       → squadQaAgent + platformQaAgent
  securityLeadAgent → squadSecurityAgent + platformSecurityAgent
```

### Self-Planning Flow
```
ALL 37 code-writing agents (no exceptions):

  Step 0: write docs/agent-plans/{agentName}-{squadId}.md
          → list every file to create/modify + execution order
  Step 1+: execute the plan file by file

Mechanism: _injectSelfPlanningPrompt() in context.js checks SELF_PLANNING_AGENTS
           and injects Step 0 into each agent's prompt individually.
```

### Universal Rules Flow
```
Every agent (no exceptions) receives at the start of its context:

  ## Language
  All code identifiers, function names, variable names, file names, comments
  must be in English. User-facing strings match the language in the project spec.

  ## Output quality
  - No TODOs, no placeholder stubs, no empty function bodies
  - No commented-out code blocks
  - No console.log in production code — use a logger
  - Every function, component, and endpoint must be fully implemented

  ## File operations
  - Use write_file to create or update files — never print code as markdown
  - Before modifying an existing file: use read_file first
  - Paths relative to output directory — never include the output dir prefix

Mechanism: _injectUniversalRules() in context.js — injected into
           buildScopedContext, buildSquadPmSpecContext,
           buildSquadScopedContext, buildSquadUpdateContext.
```

### Update Mode (updatePlanner.js + orchestrateUpdate)
```
analyzeUpdate(changeRequest, existingSquadPlan) → {
  affectedSquads:  [{ id, changeDescription }],
  newSquads:       [{ ...squad schema }],
  platformUpdates: {
    uiPrimitives, uiComposite, apiClient, dbSchema, designLead  (each: "..." | null)
  }
}

Execution order in Update Mode:
  Affected platform agents (read existing code → additive only)
           ↓
  Existing squads: SquadPmUpdateSpec → dev update → cleanup → QA → security → PM review
  New squads:      Full 9-phase pipeline
           ↓
  Quality re-run + PM Review + GitHub push
```

---

## 🐙 GitHub Integration (github.js)

| Function | Role |
|----------|------|
| `parseGithubRepo(input)` | Parses owner/repo / URL / SSH formats |
| `checkGithubAccess(owner, repo, token)` | Checks repo existence + push permissions |
| `createGithubRepo(repoName, token, isPrivate)` | Creates a new repo |
| `pushCheckpoint(outputDir, ...)` | **Non-fatal** — push after every layer |
| `pushToGithub(outputDir, ...)` | **Fatal** — final push at end of build |

---

## 💾 Checkpoint System

```
saveCheckpoint(layerLabel) — called after every layer:
  context.saveCheckpoint() → .build-checkpoint.json (local)
  pushCheckpoint()         → GitHub push (non-fatal)

Checkpoint contains: requirements, plan, squadPlan,
                     agentOutputs, allFilesCreated, completedLayers

index.js — when checkpoint found:
  1️⃣  Fresh build from scratch
  2️⃣  Resume from last stopped point
  3️⃣  Update / add feature  ← requires squadPlan in checkpoint
```

---

## Shell Access & Package Installation

Only 3 agent types run shell commands — all via `tools/shell.js`:

| Agent | Layer | What it does with shell |
|-------|-------|------------------------|
| **testRunner** | Layer 4b | Runs `npm install` then the full test suite. This is the **primary install** of all packages added to `package.json` by prior agents |
| **devops** | Layer 5 | Sets up Docker, CI/CD pipeline, env vars, nginx. Runs install inside Dockerfile and CI workflow |
| **squadQaAgent** | per-squad (Phase 6) | Runs tests inside the squad — `npm test`, linters, coverage |

**How a new package gets added to the project:**

```
Step 1 — agent writes code that imports the package + adds it to package.json
         (write_file only — no shell)

Step 2 — testRunner (Layer 4b) runs:
           npm install          ← installs all dependencies
           npm test             ← runs tests

Step 3 — devops (Layer 5) adds the install to Dockerfile and CI workflow
```

**⚠️ Native Modules (React Native / Expo):**
Feature infrastructure agents like `animationsAgent` (react-native-reanimated) and `notificationsAgent` (expo-notifications) add packages that require `npx expo install` rather than plain `npm install` — because they are pinned to the Expo SDK version.
The `devops` agent is aware of this and adds the correct commands to the `Dockerfile` and `prebuild` script.

---

## Social Sharing & Open-in-App

### Full Coverage by Direction

| Direction | Agent | What is covered |
|-----------|-------|----------------|
| **Inbound** (another app opens yours) | `deepLinksAgent` | Firebase Dynamic Links, Universal Links (iOS), App Links (Android), deep link router, deferred deep links |
| **Outbound — sharing** | `socialSharingAgent` | Native Share Sheet, URL schemes for WhatsApp/Telegram/Facebook/Twitter/LinkedIn/SMS, Instagram Stories, clipboard |
| **Outbound — open app** | `socialSharingAgent` (`OpenInApp`) | Opens WhatsApp/Telegram/Instagram/Facebook, opens native calendar with prefilled event, maps, dialer |
| **Social Login** | `authAgent` | Facebook/Google/Apple Sign-In |
| **API integrations** | `integrationAgent` | WhatsApp Business API (bots), Google Calendar API, Stripe, Firebase Admin, etc. |

### Example — WhatsApp Bot That Adds Meetings to Calendar

> **All existing agents are sufficient for this use case — no new agents needed.**

| Part | Agent | Role |
|------|-------|------|
| WhatsApp Business API (webhooks + send) | `integrationAgent` | Receives inbound messages, sends replies |
| Date/time extraction from text | `backendDev` | regex / AI API call (OpenAI/Claude) to parse date and time |
| Calendar OAuth | `authAgent` | Google OAuth2 / Microsoft OAuth — business owner authenticates once |
| Google Calendar / Outlook | `integrationAgent` | Creates event via Calendar API |
| Opening native calendar from app | `socialSharingAgent` | `OpenInApp.calendar(event)` — opens native calendar with event prefilled |

**When to consider a `botFrameworkAgent` (does not exist today):**
Only for very complex bots — multi-turn conversation management, intent classification, session state across many messages, middleware chain. For simple bots `integrationAgent` + `backendDev` are sufficient.

---

## Core Infrastructure Modules

| Module | Role |
|--------|------|
| **base.js** | `BaseAgent` class. Model selected per category: Light→Haiku 4.5, Medium→Sonnet 4.6, Heavy→Opus 4.7 (Tier 3) / Sonnet+Thinking (Tier 2) / Sonnet (Tier 1). All API calls use prompt caching (`cache_control: ephemeral` on system prompt, user message, and last tool). Timeout: 20 min. |
| **agentModels.js** | `LIGHT_KEYS` (14) + `MEDIUM_KEYS` (29) sets. `getAgentCategory(displayName)` — maps display name → light/medium/heavy via agent-name-map.json. `getDefaultModels(tier)` — returns the three configs for a given tier. `MODEL_OPTIONS` — 4 presets: haiku / sonnet / sonnetThinking / opus. |
| **agentModelSelector.js** | `selectAgentModels(plan, askFn)` — interactive prompt after tier selection. Shows default config per group, asks "continue (y) / customize (c)". Customize loop lets user pick a preset per group. In mock mode: returns defaults immediately. |
| **costTracker.js** | `record(agentName, model, usage)` — accumulates per-agent cost from API usage. `getTotal()` — sum of all records. `getSummary()` — formatted table sorted by cost. `reset()` — called at the start of every `orchestrate()` / `orchestrateUpdate()`. Prints summary at end of build. |
| **lang.js** | `selectLanguage()` — 8 supported languages. `t(key)` for all user-facing strings. `getLangInstruction()` injected into AI prompts (planner, designPicker, etc.). |
| **context.js** | `ProjectContext` — shared state throughout a build. `buildScopedContext()` + `buildSquadScopedContext()`. Injectors: `_injectUniversalRules()`, `_injectPlatformRules()`, `_injectLeadershipGuidelines()`, `_injectSelfPlanningPrompt()` — each applied automatically per agent role. |
| **agentDependencies.js** | `DEPENDENCY_MAP` — defines what each agent "sees" from agents that ran before it. |
| **layerRunner.js** | `runLayerInParallel` / `runLayerSequential` — retry ×2 per agent. |
| **squadRunner.js** | `runAllSquads`, `runSquadUpdate`, `runAllSquadsUpdate` — 9-phase squad pipeline. |
| **platformRunner.js** | `runPlatformPipeline` — 7-phase platform pipeline (spec → build → feature infra → QA loop → security → PM review → PM fix). |
| **squadPlanner.js** | `createSquadPlan` — Sonnet 4.6 splits into squads. |
| **updatePlanner.js** | `analyzeUpdate` — Sonnet 4.6 analyzes a change request → affectedSquads + newSquads + platformUpdates. |
| **withRetry.js** | `withRetry(fn, agentName)` — wraps any API call with exponential-backoff retry for overload / rate-limit errors. Used by `BaseAgent.run()` and `createPlan()`. |
| **tools/fileSystem.js** | `read_file` / `write_file` / `list_files` — available to all agents. |
| **tools/shell.js** | `run_command` — available to testRunner, devops, and squadQaAgent only. See: [Shell Access](#shell-access--package-installation). |
| **approval.js** | Approval gates between layers. |
| **github.js** | GitHub: validation, repo creation, checkpoint push, final push. |

---

## Summary

| | |
|-|-|
| **Total agents** | 75 |
| **Code-writing agents** (💻) | 37 |
| **Guideline-document agents** (📋) | ~15 |
| **Report-generating agents** (🔍) | ~12 |
| **Config agents** (⚙️) | ~5 |
| **Agents that modify existing files** | cmsIntegratorAgent (per-squad, also sets up infra), codeDeduplicationAgent, testFixer, squadErrorHandlingAgent, squadCodeCleanupAgent, squadDeduplicationAgent, squadSecurityAgent (HIGH findings) |
| **Audit agents (report only, no code changes)** | errorAuditAgent, codeQualityAuditAgent, cmsQaAgent |
| **Leaders Team agents** | vpPmAgent, techLeadAgent, qaLeadAgent, securityLeadAgent, designLeadAgent, renderingStrategyAgent *(opt)*, inputPolicyAgent |
| **Platform Team agents** | platformPmAgent, uiPrimitivesAgent, uiCompositeAgent, apiClientAgent, dbSchemaAgent, platformQaAgent, platformSecurityAgent, + feature infra agents |
| **Per-squad agents** | squadDesignerAgent, squadErrorHandlingAgent, squadCodeCleanupAgent, squadDeduplicationAgent, squadQaAgent, squadSecurityAgent |
| **Phases per squad** | 9 (PM spec → designer → devs → error handling → cleanup → dedup → CMS → QA+loop → security → PM review+loop) |
| **Model — Light agents (14)** | Haiku 4.5 — 4,096 max tokens — docs, devops, publishing, localization |
| **Model — Medium agents (29)** | Sonnet 4.6 — 8,096 max tokens — design, review, planning, leaders, audit |
| **Model — Heavy agents (32)** | Tier 3: Opus 4.7 (32k) · Tier 2: Sonnet+Thinking (16k) · Tier 1: Sonnet (8k) — core implementation, security, platform build |
| **Model — Planning calls** | Sonnet 4.6 — 10 min timeout (createPlan, createSquadPlan, analyzeUpdate) |
| **Agents with shell access** | testRunner, devops, squadQaAgent |
| **Checkpoint** | After every layer — local + GitHub push |
| **Smart skips** | squadDesigner (backend-only squad) · socialSharing (only via optionalAgents) · testRunner+testFixer (if testWriter wrote 0 files) |
| **Prompt caching** | System prompt, first user message, last tool definition — all marked `cache_control: ephemeral` |
