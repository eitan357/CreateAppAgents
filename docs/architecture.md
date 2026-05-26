# Architecture — App Builder Multi-Agent System

> **Output type legend:**
> 💻 Code — source files that are executed / compiled
> 📋 Document — specification / guidance files that direct other agents
> 🔍 Report — analysis / review files that drive fix rounds
> ⚙️ Config — configuration files (Docker, CI, tsconfig, Fastlane)

---

## 📊 Statistics Dashboard

### Totals

| Metric | Count |
|--------|-------|
| Total agents | 75 |
| Code-writing agents 💻 | 37 |
| Guideline / document agents 📋 | ~15 |
| Report / audit agents 🔍 | ~15 |
| Config / ops agents ⚙️ | ~5 |
| Infrastructure modules (src/*.js) | 19 |
| Total exported functions across modules | ~70 |
| Test suites | 12 |
| Passing tests | 267 |
| Phases per squad | 9 |
| Platform pipeline phases | 7 |
| Build tiers | 4 (0–3) |
| Max quality fix rounds | 2 |
| Max PM fix rounds | 2 |
| Max QA fix rounds per squad | 2 |
| Supported UI languages | 8 |

### Agents by Role

| Role | Count | Agents |
|------|-------|--------|
| **Software Developers** | 26 | `backendDev`, `frontendDev`, `authAgent`, `integrationAgent` (core 4) · `uiPrimitivesAgent`, `uiCompositeAgent`, `apiClientAgent`, `dbSchemaAgent` (platform build 4) · `notificationsAgent`, `deepLinksAgent`, `offlineFirstAgent`, `realtimeAgent`, `animationsAgent`, `onboardingAgent`, `monetizationAgent`, `mlMobileAgent`, `arVrAgent`, `widgetsExtensionsAgent`, `otaUpdatesAgent`, `socialSharingAgent` (mobile features 12) · `responsiveDesignAgent`, `pwaAgent`, `webMonetizationAgent`, `cmsIntegratorAgent` (web features 4) · `localizationAgent` (cross-platform 1) · `simpleAppBuilder` (Tier 0 1) |
| **QA Engineers** | 5 | `testWriter`, `testRunner`, `testFixer`, `squadQaAgent`, `platformQaAgent` |
| **Security Engineers** | 4 | `security`, `squadSecurityAgent`, `platformSecurityAgent`, `securityLeadAgent` |
| **UX / Product Designers** | 3 | `uxDesignerAgent`, `squadDesignerAgent`, `designLeadAgent` |
| **Tech Architects** | 8 | `requirementsAnalyst`, `systemArchitect`, `dataArchitect`, `apiDesigner`, `frontendArchitect`, `techLeadAgent`, `mobileTechAdvisor`, `webTechAdvisor` |
| **Product Managers** | 4 | `vpPmAgent`, `platformPmAgent`, `pmReviewer`, `businessPlanningAgent` |
| **Code Quality / Cleanup** | 5 | `reviewer`, `codeDeduplicationAgent`, `squadErrorHandlingAgent`, `squadCodeCleanupAgent`, `squadDeduplicationAgent` |
| **Audit (report-only)** | 3 | `errorAuditAgent`, `codeQualityAuditAgent`, `cmsQaAgent` |
| **Performance & Accessibility** | 4 | `loadTestingAgent`, `performanceAgent`, `webPerformanceAgent`, `accessibilityAgent` |
| **Policy & Standards** | 3 | `qaLeadAgent`, `inputPolicyAgent`, `renderingStrategyAgent` |
| **DevOps / Operations** | 7 | `devops`, `documentation`, `deploymentAdvisor`, `analyticsMonitoring`, `seoAgent`, `appStorePublisher`, `asoMarketingAgent` |
| **Compliance / Legal** | 3 | `privacyEthicsAgent`, `dependencyManagementAgent`, `userTestingAgent` |
| **Total** | **75** | |

### Agents by Model Category

| Category | Count | Default model | Who |
|----------|-------|--------------|-----|
| **Light** | 14 | Haiku 4.5 · 4k tokens | `documentation`, `devops`, `deploymentAdvisor`, `analyticsMonitoring`, `seoAgent`, `appStorePublisher`, `asoMarketingAgent`, `businessPlanningAgent`, `userTestingAgent`, `privacyEthicsAgent`, `dependencyManagementAgent`, `squadCodeCleanupAgent`, `squadDeduplicationAgent`, `localizationAgent` |
| **Medium** | 29 | Sonnet 4.6 · 8k tokens | All architects, leaders, reviewers, audit agents — see [Agent Model Selection](#️-agent-model-selection) |
| **Heavy** | 32 | Tier 3: Opus 4.7 · 32k | All core devs, security, platform build, mobile feature agents |

### Agents by Output Type

| Output | Symbol | Count | Examples |
|--------|--------|-------|---------|
| Source code | 💻 | 37 | backendDev, frontendDev, authAgent, uiPrimitivesAgent, testWriter… |
| Guideline / spec docs | 📋 | ~15 | requirementsAnalyst, systemArchitect, vpPmAgent, techLeadAgent, deploymentAdvisor… |
| Review / audit reports | 🔍 | ~15 | security, reviewer, errorAuditAgent, performanceAgent, pmReviewer… |
| Config / ops files | ⚙️ | ~5 | devops, appStorePublisher |
| Mixed (code + report) | 💻+🔍 | ~5 | squadQaAgent, platformQaAgent, squadSecurityAgent, analyticsMonitoring… |

### Build Tier Reference

Light agents always default to **Haiku 4.5**; Medium agents always default to **Sonnet 4.6**. Only the Heavy agent default changes by tier. All three can be customized interactively at build start via `selectAgentModels()`.

| Tier | Label | Layers that run | Default light model | Default medium model | Default heavy model | Est. cost |
|------|-------|-----------------|--------------------|--------------------|-------------------|-----------|
| **0** | Single Agent | Tier 0 fast path only (simpleAppBuilder) | Haiku 4.5 | Sonnet 4.6 | Sonnet 4.6 | ~$0.50 |
| **1** | Simple | 1 · 2 · 3 · 5 (no leaders, no platform, no quality) | Haiku 4.5 | Sonnet 4.6 | Sonnet 4.6 | ~$3 |
| **2** | Standard | + 2b (Leaders) + 2c (Platform) + squad Designer + squad QA | Haiku 4.5 | Sonnet 4.6 | Sonnet 4.6 + Thinking | ~$20 |
| **3** | Full | + 3f (global dedup) + 4 (quality) + 4b (test run) + 4c (test fix) | Haiku 4.5 | Sonnet 4.6 | Opus 4.7 | ~$50 |

### Module Function Counts

| Module | Exported functions | Total functions (incl. private) |
|--------|-------------------|---------------------------------|
| orchestrator.js | 2 (orchestrate, orchestrateUpdate) | 13 |
| squadRunner.js | 4 (runSquad, runAllSquads, runSquadUpdate, runAllSquadsUpdate) | 14 |
| platformRunner.js | 1 (runPlatformPipeline) | 4 |
| context.js — ProjectContext | 19 methods + 2 static | 24 (incl. 5 private injectors) |
| layerRunner.js | 3 (runLayerInParallel, runLayerSequential, getFailedAgents) | 5 |
| costTracker.js | 4 (record, getTotal, getSummary, reset) | 4 |
| agentModels.js | 2 (getAgentCategory, getDefaultModels) | 2 |
| agentModelSelector.js | 1 (selectAgentModels) | 3 |
| base.js | 3 (BaseAgent class + setModelConfigs + getModelConfigs) | 5 |
| withRetry.js | 2 (withRetry, sleep) | 3 |
| approval.js | 4 (approveStep, approveLayer, approveLayerStart, showAgentOutput) | 5 |
| github.js | 5 (parseGithubRepo, checkGithubAccess, createGithubRepo, pushCheckpoint, pushToGithub) | 6 |
| squadPlanner.js | 2 (createSquadPlan, formatSquadPlan) | 2 |
| updatePlanner.js | 2 (analyzeUpdate, formatUpdatePlan) | 2 |
| agentDependencies.js | 1 (DEPENDENCY_MAP constant) | 0 |
| tools/fileSystem.js | 1 (createFileSystemTools) | 3 |
| tools/shell.js | 1 (createShellTools) | 2 |
| lang.js | 5 (setLanguage, getLanguage, getLangName, getLangInstruction, t) | 5 |
| planner.js | 1 (runPlanningSession) | 5 |
| designPicker.js | 1 (runDesignPicker) | 8 |

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

## 🎛️ Agent Model Selection

Every agent belongs to one of three **model categories**. The category is determined by the agent's display name looked up in `agentModels.js` via `scripts/agent-name-map.json`. Before any layer runs, `selectAgentModels()` sets the three model configs and `setModelConfigs()` stores them in `base.js`.

### Categories

| Category | Count | Rationale | Member agents (key examples) |
|----------|-------|-----------|------------------------------|
| **Light** | 14 | Formatting, docs, config, publishing — output quality is less sensitive to model power | `documentation`, `devops`, `deploymentAdvisor`, `analyticsMonitoring`, `seoAgent`, `appStorePublisher`, `asoMarketingAgent`, `businessPlanningAgent`, `userTestingAgent`, `privacyEthicsAgent`, `dependencyManagementAgent`, `squadCodeCleanupAgent`, `squadDeduplicationAgent`, `localizationAgent` |
| **Medium** | 29 | Analysis, design, review, planning — benefit from deeper reasoning | `requirementsAnalyst`, `systemArchitect`, `apiDesigner`, `dataArchitect`, `frontendArchitect`, `uxDesignerAgent`, `designLeadAgent`, `inputPolicyAgent`, `renderingStrategyAgent`, `reviewer`, `pmReviewer`, `testWriter`, `loadTestingAgent`, `accessibilityAgent`, `performanceAgent`, `webPerformanceAgent`, `errorAuditAgent`, `codeQualityAuditAgent`, `codeDeduplicationAgent`, `squadDesignerAgent`, `vpPmAgent`, `techLeadAgent`, `qaLeadAgent`, `securityLeadAgent`, `platformPmAgent`, `platformQaAgent`, `platformSecurityAgent`, `mobileTechAdvisor`, `webTechAdvisor` |
| **Heavy** | 32 | Core implementation — most time-consuming, highest impact on code quality | `backendDev`, `frontendDev`, `authAgent`, `integrationAgent`, `testRunner`, `testFixer`, `security`, `uiPrimitivesAgent`, `uiCompositeAgent`, `apiClientAgent`, `dbSchemaAgent`, `squadErrorHandlingAgent`, `squadQaAgent`, `squadSecurityAgent`, all mobile feature agents, `cmsIntegratorAgent`, `cmsQaAgent`, `responsiveDesignAgent`, `pwaAgent`, `webMonetizationAgent`, `simpleAppBuilder` |

### Default Models per Tier

| Category | Tier 1 — Simple | Tier 2 — Standard | Tier 3 — Full |
|----------|-----------------|--------------------|----------------|
| **Light** | Haiku 4.5 · 4,096 tokens | Haiku 4.5 · 4,096 tokens | Haiku 4.5 · 4,096 tokens |
| **Medium** | Sonnet 4.6 · 8,096 tokens | Sonnet 4.6 · 8,096 tokens | Sonnet 4.6 · 8,096 tokens |
| **Heavy** | Sonnet 4.6 · 8,096 tokens | Sonnet 4.6 + Thinking · 16,000 tokens | Opus 4.7 · 32,000 tokens |

### Available Model Presets

| Preset | Model ID | max_tokens | Thinking | Price (per MTok) |
|--------|----------|-----------|---------|-----------------|
| `haiku` | claude-haiku-4-5-20251001 | 4,096 | off | $1 in · $5 out |
| `sonnet` | claude-sonnet-4-6 | 8,096 | off | $3 in · $15 out |
| `sonnetThinking` | claude-sonnet-4-6 | 16,000 | adaptive | $3 in · $15 out |
| `opus` | claude-opus-4-7 | 32,000 | adaptive | $5 in · $25 out |

### Interactive Selection UX (agentModelSelector.js)

```
Triggered inside orchestrate() immediately after tier is finalized.

1. Compute defaults via getDefaultModels(plan.tier)
2. Print a summary:
     Light agents      →  Haiku 4.5           ($1/MTok in  · $5/MTok out)
     Medium agents     →  Sonnet 4.6          ($3/MTok in  · $15/MTok out)
     Heavy agents      →  Opus 4.7            ($5/MTok in  · $25/MTok out)
3. Ask: "Continue with defaults (y) or customize (c)? [default: y]"
4. If defaults accepted → return immediately.
5. If customize → loop over ['light', 'medium', 'heavy']:
     - Print group description and example agents
     - Show numbered preset list, marking the current selection
     - Ask: "Choose (1-4) [Enter = keep current]"
     - Enter = keep; 1-4 = switch to that preset
6. Call setModelConfigs({ light, medium, heavy }) → stored in base.js

Edge cases:
  - Mock mode:       returns defaults immediately, no prompt shown
  - Resume build:    applies getDefaultModels(checkpoint.plan.tier), no prompt
  - Update mode:     applies getDefaultModels(checkpoint.plan.tier), no prompt
  - Unknown agent:   getAgentCategory() returns 'heavy' as fallback
```

---

## ⚡ Smart Agent Skips

Three conditional skips are applied automatically during a build. All three check **runtime context** (not disk state), so they work correctly on fresh builds, resumed builds, and builds run after previous failures.

### Skip 1 — `squadDesignerAgent`: backend-only squads

| | |
|-|-|
| **Where** | `squadRunner.js` — Phase 2 of every squad |
| **Condition** | `squad.agents` does not include `'frontendDev'` OR build tier < 2 |
| **Code** | `const hasFrontend = squad.agents.includes('frontendDev'); if (tier >= 2 && hasFrontend) { run designer }` |
| **Effect** | No `docs/squads/{id}-design.md` created; dev agents fall back to tech-guidelines alone |
| **Why** | A backend-only squad has no screens — running the designer would produce irrelevant output |

### Skip 2 — `socialSharingAgent`: not in optionalAgents

| | |
|-|-|
| **Where** | `orchestrator.js` — `getActiveAgents()` |
| **Condition** | `'socialSharingAgent'` not present in `plan.optionalAgents` |
| **Code** | socialSharingAgent is NOT unconditionally added for frontend projects; it only enters `activeAgents` if the PM explicitly included it |
| **Effect** | `shared/sharing/` not created; squads do not receive `useShare()` / `OpenInApp` |
| **Why** | Previously added unconditionally for all frontend projects; corrected to be optional so projects that don't need sharing don't carry the infrastructure |

### Skip 3 — `testRunner` + `testFixer`: testWriter wrote no files

| | |
|-|-|
| **Where** | `orchestrator.js` — main layer loop, evaluated before Layer 4b and again before Layer 4c |
| **Condition** | `context.agentOutputs['testWriter']?.files?.length === 0` |
| **Code** | `const testFiles = context.agentOutputs['testWriter']?.files \|\| []; if (testFiles.length === 0) { markLayerComplete; continue; }` |
| **Effect** | Layers 4b and 4c are marked complete immediately; execution proceeds to Layer 5 without running testRunner or testFixer |
| **Why** | If testWriter produced nothing, testRunner would find no tests to run and testFixer would have no failures to fix — both would waste time and produce empty reports |

**Resume safety:** Skip evaluation happens when the build loop **reaches** each layer. If a build was stopped before Layer 4b, the decision is re-evaluated on resume using the current context. A layer that hasn't been reached yet is never pre-marked as skipped.

**Disk safety (Skip 3):** The check uses `context.agentOutputs['testWriter'].files` (the list of files written in the current run), not a filesystem scan. This prevents detecting test files left on disk by a previous build run.

---

## 🗜️ Prompt Caching & Cost Tracking

### Prompt Caching (base.js)

Every API call made by `BaseAgent.run()` applies `cache_control: { type: 'ephemeral' }` at three positions:

```
Position 1 — System prompt (constant for the agent's entire run):
  params.system = [{
    type: 'text',
    text: this.systemPrompt,
    cache_control: { type: 'ephemeral' }   ← agent role definition cached here
  }]

Position 2 — First user message (project context, constant across tool-use turns):
  messages = [{ role: 'user', content: [{
    type: 'text',
    text: userMessage,
    cache_control: { type: 'ephemeral' }   ← full project context cached here
  }]}]

Position 3 — Last tool definition (tool list sent every turn):
  params.tools = tools.map((t, i) =>
    i === tools.length - 1
      ? { ...t, cache_control: { type: 'ephemeral' } }   ← last tool cached
      : t
  )
```

**Why only the last tool?** Anthropic's API requires `cache_control` to be placed on **contiguous trailing blocks**. All tool definitions must be sent on every turn, so the last one is the correct anchor point for the cache.

**Cache type `ephemeral`:** 5-minute TTL. Reused across all turns within the same agent conversation (the while-loop in `BaseAgent.run()`). Not shared across different agent instances.

**Pricing impact of cache hits vs full input:**

| Model | Full input | Cache read | Cache write | Saving on hit |
|-------|-----------|-----------|------------|---------------|
| Sonnet 4.6 | $3.00/MTok | $0.30/MTok | $3.75/MTok | 90% cheaper |
| Opus 4.7 | $5.00/MTok | $0.50/MTok | $6.25/MTok | 90% cheaper |
| Haiku 4.5 | $1.00/MTok | $0.10/MTok | $1.25/MTok | 90% cheaper |

### Cost Tracking (costTracker.js)

`costTracker` is a module-level singleton (plain array, no class). Its lifecycle per build:

```
orchestrate() / orchestrateUpdate() start
  → costTracker.reset()              clears all records from any previous run

  [agents run — each call to client.messages.create]
  → costTracker.record(agentName, model, response.usage)
       inputCost  = (input_tokens  / 1_000_000) × price.input
       outputCost = (output_tokens / 1_000_000) × price.output
       cacheRCost = (cache_read_input_tokens     / 1_000_000) × price.cacheRead
       cacheWCost = (cache_creation_input_tokens / 1_000_000) × price.cacheWrite
       totalCost  = sum of above → pushed to _records[]

build completes
  → costTracker.getSummary()         sorted by agent cost (desc), only if records exist
  → printed to console as:
       💰  Build Cost Summary:
           backendDev                       $0.8240
           frontendDev                      $0.6110
           ...
           TOTAL                            $2.1450
```

**Multi-turn accounting:** `record()` is called after **every** API response, including intermediate tool-use turns. A single agent that makes 5 tool calls generates 5 cost records. `getSummary()` groups by `agentName` and sums across all records.

**Unknown model fallback:** if the model string is not in `PRICING`, Sonnet 4.6 pricing is used.

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

### orchestrator.js

Entry point for a build run. Owns layer definitions, agent registry, plan schema, and all top-level build logic.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `createPlan` | `(requirements, projectName)` | JSON plan | Calls Sonnet to produce the PM plan. Mock-aware. |
| `getActiveAgents` | `(plan)` | `Set<string>` | Computes which agent keys are active for this build from the plan + optionalAgents. |
| `filterLayerAgents` | `(layerDef, activeAgents, plan)` | `{name, needsShell}[]` | Filters a layer's agent list down to active agents; marks shell-access agents. |
| `buildQualityFeedback` | `(layerResults)` | `string \| null` | Collects summaries from quality agents into a single feedback string for the fix loop. |
| `buildPmFeedback` | `(pmReviewResult)` | `string \| null` | Returns PM review text only if verdict is not ACCEPTED. |
| `mapFindingsToSquads` | `(feedbackText, squadPlan)` | `{squadFindings, platformAffected, platformFindings}` | Parses findings text, maps each section to the responsible squad(s) by file path. Sections without a path go to all squads. |
| `formatPlan` | `(plan)` | `string` | Human-readable plan summary shown in the approval gate. |
| `countAgentsForTier` | `(plan, tier)` | `number` | Counts how many agent runs a given tier produces, used to annotate the tier-selection prompt. |
| `selectBuildTier` | `(plan, askFn?)` | `number` | Interactive tier selection (0–3). Shows PM recommendation, accepts override. Mock-aware. |
| `runQualityLayers` | `(activeAgents, context, toolSets, plan)` | `results` | Re-runs layers 4, 4b, 4c as a group (used inside the quality fix loop). |
| `runPmReview` | `(context, toolSets)` | `result \| null` | Runs pmReviewer once and returns its result. |
| `orchestrate` | `(requirements, projectName, outputDir, checkpoint?, githubRepo?, options?)` | `void` | **Main build function.** Runs the full layer pipeline from plan creation to GitHub push. |
| `orchestrateUpdate` | `(changeRequest, checkpointData, outputDir, githubRepo?)` | `void` | **Update mode.** Runs analyzeUpdate → targeted squad updates → quality re-run → GitHub push. |

---

### squadRunner.js

Manages the 9-phase pipeline for one squad and for collections of squads.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `_retryDelay` *(private)* | `(err)` | `ms` | Returns 20 s for 529, 60 s for 429, 5 s otherwise. |
| `_runSingleAgent` *(private)* | `(agentName, contextStr, squad, context, toolSets, agentRegistry)` | `result` | Creates and runs one agent; records output in context. |
| `_qaHasIssues` *(private)* | `(context, squad)` | `boolean` | Reads the squad's QA report file and returns true if it contains FAIL. |
| `_skipOrRun` *(private)* | `(phaseName, squad, context, fn, bypassCheckpoint?)` | `result` | Checkpoint-aware phase gate: skips if already complete, otherwise runs `fn` and marks complete. |
| `_runDevAgents` *(private)* | `(squad, agents, context, toolSets, agentRegistry, contextFn, label?, bypass?)` | `results` | Runs a list of dev agents sequentially, each checkpointed individually. |
| `_runQaFixLoop` *(private)* | `(squad, fixFn, qaContextFn, context, toolSets, agentRegistry)` | `void` | QA → if issues → run fixFn → QA re-check. Max 2 rounds. |
| `_handlePmGaps` *(private)* | `(squad, verdict, fixFn, qaContextFn, context, toolSets, agentRegistry)` | `void` | If PM verdict is GAPS → run fixFn → QA re-check → PM re-review. Max 2 rounds. |
| `_runPmReview` *(private)* | `(squad, context, toolSets)` | `verdict string` | Runs Squad PM Review agent and returns the verdict (ACCEPTED / GAPS). |
| `_rebuildSquadResults` *(private)* | `(squad, context)` | `results` | Reconstructs a squad's result map from already-recorded context outputs (used on resume). |
| `runSquad` | `(squad, context, toolSets, agentRegistry, activeAgents)` | `void` | Runs the full 9-phase pipeline for one squad. |
| `runAllSquads` | `(squadPlan, context, toolSets, agentRegistry, activeAgents)` | `void` | Runs all squads in parallel, then calls `_mergeOutputsToContext`. |
| `_mergeOutputsToContext` *(private)* | `(allSquadResults, context)` | `void` | Merges per-squad agent outputs so global Layer 4 agents see all squads' work. |
| `runSquadUpdate` | `(squad, changeDescription, context, toolSets, agentRegistry, activeAgents)` | `void` | Runs update-mode pipeline for one squad (PM update spec → dev fix → QA → security → PM review). |
| `runAllSquadsUpdate` | `(updatePlan, context, toolSets, agentRegistry, activeAgents)` | `void` | Runs update on all affected squads in parallel; adds new squads via full pipeline. |

---

### platformRunner.js

Manages the 7-phase platform pipeline (spec → build → feature infra → QA loop → security → PM review → PM fix).

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `_platformQaHasIssues` *(private)* | `(outputDir)` | `boolean` | Reads platform-review.md and returns true if it contains INCOMPLETE. |
| `_platformPmHasGaps` *(private)* | `(outputDir)` | `boolean` | Reads platform-pm-review.md and returns true if it contains GAPS. |
| `_runPlatformPmReview` *(private)* | `(context, toolSets)` | `void` | Runs platformPmReview agent and saves result to context. |
| `runPlatformPipeline` | `(context, toolSets, agentRegistry, activeAgents)` | `void` | Executes all 7 phases in order. Phases 4 and 7 are loop-guarded (max 2 rounds each). |

---

### context.js — ProjectContext

Shared state for an entire build run. Every agent gets its context string from one of the `build*Context` methods.

**Private helpers (module-level):**

| Function | Signature | Purpose |
|----------|-----------|---------|
| `_truncateSummary` | `(text)` | Truncates long dependency summaries with a read_file hint. |
| `_injectUniversalRules` | `(lines)` | Appends language + output quality + file operation rules to every agent context. |
| `_injectSelfPlanningPrompt` | `(lines, agentName, squadId)` | Appends Step 0 self-planning instruction for all 37 code-writing agents. |
| `_injectLeadershipGuidelines` | `(lines, agentName, agentOutputs)` | Appends the relevant guideline doc (tech / QA / security / design) for agents that depend on a leader's output. |
| `_injectPlatformRules` | `(lines, agentOutputs)` | Appends mandatory shared/ import instructions when platform build outputs exist. |

**Instance methods:**

| Method | Signature | Returns | Purpose |
|--------|-----------|---------|---------|
| `constructor` | `(requirements, plan, outputDir)` | `ProjectContext` | Initialises all state fields. |
| `setPlatformUpdateNote` | `(agentName, note)` | `void` | Stores a note injected into platform agent context during update mode. |
| `addAgentOutput` | `(agentName, summary, files)` | `void` | Records an agent's summary and file list — used by all context builders as dependency data. |
| `setFeedbackNotes` | `(notes)` | `void` | Stores quality-loop feedback text injected into dev agents during fix rounds. |
| `setPmFeedbackNotes` | `(notes)` | `void` | Stores PM review gaps injected into dev agents during PM fix rounds. |
| `setSquadPlan` | `(squadPlan)` | `void` | Stores the squad division produced by squadPlanner. |
| `setSquadSpec` | `(squadId, content)` | `void` | Caches squad spec content so review/update contexts can include it without a file read. |
| `setSquadGaps` | `(squadId, content)` | `void` | Caches PM gap text for a squad's fix round. |
| `markLayerComplete` | `(layerId)` | `void` | Records a layer id in `completedLayers`; persisted in checkpoint. |
| `isLayerComplete` | `(layerId)` | `boolean` | Returns true if the layer was already completed (resume guard). |
| `markSquadComplete` | `(squadId)` | `void` | Marks an entire squad pipeline as done. |
| `isSquadComplete` | `(squadId)` | `boolean` | Resume guard for whole-squad checkpoint. |
| `markSquadAgentComplete` | `(squadId, agentName)` | `void` | Marks an individual agent phase within a squad as done. |
| `isSquadAgentComplete` | `(squadId, agentName)` | `boolean` | Resume guard for per-agent checkpoint within a squad. |
| `saveCheckpoint` | `()` | `void` | Serialises all state to `.build-checkpoint.json` in outputDir. |
| `static loadCheckpoint` | `(outputDir)` | `checkpoint \| null` | Reads and parses the checkpoint file; returns null if not found. |
| `static fromCheckpoint` | `(checkpoint)` | `ProjectContext` | Reconstructs a full ProjectContext from a serialised checkpoint. |
| `buildScopedContext` | `(agentName)` | `string` | Builds the context string for a **layer agent** (non-squad). Injects universal rules, leadership guidelines, platform rules, self-planning prompt, and all relevant dependency outputs. |
| `buildSquadPmSpecContext` | `(squad)` | `string` | Builds the context for **Squad PM Spec**: requirements + squad info + pm-guidelines + design docs. |
| `buildSquadPmReviewContext` | `(squad)` | `string` | Builds the context for **Squad PM Review**: squad spec + all squad files listed. |
| `buildSquadScopedContext` | `(agentName, squad)` | `string` | Builds the context for a **squad implementation agent**: universal rules + leadership guidelines + platform rules + self-planning + squad spec + design doc + relevant dependency outputs. |
| `buildSquadPmUpdateSpecContext` | `(squad, changeDescription)` | `string` | Update-mode context for Squad PM: existing spec + what to change. |
| `buildSquadUpdateContext` | `(agentName, squad, changeDescription)` | `string` | Update-mode context for squad dev agents: existing code context + change description. |

---

### layerRunner.js

Runs a set of agents either in parallel (up to `PARALLEL_AGENTS` concurrent, default 1) or sequentially. Both variants retry once on failure.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `retryDelay` *(private)* | `(err)` | `ms` | 20 s for 529, 60 s for 429, 5 s default. |
| `runAgentWithRetry` | `(agentConfig, context, toolSets, agentRegistry)` | `result \| null` | Creates and runs one agent with one automatic retry. Returns null if agent key unknown. |
| `runLayerInParallel` | `(agentConfigs, context, toolSets, agentRegistry)` | `{[name]: result}` | Runs all agents concurrently (batched by `MAX_PARALLEL_AGENTS`). |
| `runLayerSequential` | `(agentConfigs, context, toolSets, agentRegistry)` | `{[name]: result}` | Runs agents one after another in declaration order. |
| `getFailedAgents` | `(layerResults)` | `string[]` | Returns agent names whose results contain an error. |

---

### costTracker.js

Module-level singleton. Tracks API cost across the entire build run.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `record` | `(agentName, model, usage)` | `void` | Computes cost from `usage.input_tokens`, `output_tokens`, `cache_read_input_tokens`, `cache_creation_input_tokens`. Pushes record to internal array. Ignores null/undefined usage. |
| `getTotal` | `()` | `number` | Sum of `totalCost` across all records (USD). |
| `getSummary` | `()` | `string \| null` | Returns a formatted table sorted by agent cost descending, with TOTAL row. Returns null if no records. |
| `reset` | `()` | `void` | Clears all records. Called at the start of every `orchestrate()` / `orchestrateUpdate()`. |

---

### agentModels.js

Defines the three model categories and the default configs per tier.

| Function / Export | Signature | Returns | Purpose |
|-------------------|-----------|---------|---------|
| `getAgentCategory` | `(displayName)` | `'light' \| 'medium' \| 'heavy'` | Looks up an agent's display name in the pre-built `_categoryMap`. Defaults to `'heavy'` if not found. |
| `getDefaultModels` | `(tier)` | `{ light, medium, heavy }` | Returns three model config objects for a given tier. Heavy varies by tier; light and medium are always Haiku and Sonnet respectively. |
| `MODEL_OPTIONS` | constant | — | 4 model presets: `haiku`, `sonnet`, `sonnetThinking`, `opus` — each with `model`, `max_tokens`, `thinking`. |
| `LIGHT_KEYS` | constant | `Set<string>` | 14 camelCase registry keys for light agents. |
| `MEDIUM_KEYS` | constant | `Set<string>` | 29 camelCase registry keys for medium agents. |

---

### agentModelSelector.js

Interactive model selection prompt. Called once per build after tier is finalised.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `describeConfig` *(private)* | `(cfg)` | `string` | Formats a model config as a human-readable label + price string for display. |
| `selectGroupModel` *(private)* | `(groupKey, currentConfig, askFn)` | `modelConfig` | Shows a numbered preset list for one group and awaits user selection. Enter = keep current. |
| `selectAgentModels` | `(plan, askFn?)` | `{ light, medium, heavy }` | Shows defaults summary, asks "continue / customize". If customizing, calls `selectGroupModel` for each group. In mock mode returns defaults immediately. |

---

### base.js — BaseAgent

Base class for all 75 agents. Handles API calls, prompt caching, tool execution loop, and cost recording.

| Function / Method | Signature | Returns | Purpose |
|-------------------|-----------|---------|---------|
| `setModelConfigs` | `(configs)` | `void` | Sets the global `{ light, medium, heavy }` model config. Called once by orchestrator before any agent runs. |
| `getModelConfigs` | `()` | `{ light, medium, heavy }` | Returns the current model configs. |
| `constructor` | `(name, systemPrompt, tools, toolHandlers)` | `BaseAgent` | Stores agent identity, creates Anthropic client, initialises `filesCreated[]`. |
| `run` | `(userMessage)` | `{ summary, filesCreated }` | Main agent loop. Selects model by category, builds cached params, calls API with retry, executes tool calls, iterates until `stop_reason !== 'tool_use'`. In mock mode returns a mock response. |

---

### withRetry.js

Shared retry utility for all Anthropic API calls.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `sleep` | `(ms)` | `Promise` | Simple promise-based delay. Used by retry loops and layerRunner. |
| `_retryDelay` *(private)* | `(errMessage)` | `ms` | 20 s for 529 (overload), 60 s for 429 (rate limit), 5 s default. |
| `withRetry` | `(fn, label)` | `result` | Calls `fn()`. On overload/rate-limit error: logs a warning and retries after `_retryDelay`. On other errors: throws immediately. |

---

### approval.js

User-facing approval gates between layers. All gates are skipped in mock mode.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `ask` | `(question)` | `string` | Raw readline prompt. |
| `approveStep` | `(stepName, description, details?)` | `boolean` | Shows a formatted approval gate (plan / squad plan). Returns true if user approves. |
| `showAgentOutput` | `(agentName, summary, filesCreated)` | `void` | Prints a collapsible agent result summary. |
| `approveLayer` | `(layerName, layerResults)` | `boolean` | Shows all agent results for a layer and asks for approval before the fix loop. |
| `approveLayerStart` | `(layerName, agentNames)` | `boolean` | Shows which agents are about to run and asks for approval before a layer starts. |

---

### github.js

All GitHub interactions: repo validation, creation, checkpoint push, final push.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `parseGithubRepo` | `(input)` | `{owner, repo, full} \| null` | Parses `owner/repo`, HTTPS URL, or SSH URL into a normalised object. |
| `checkGithubAccess` | `(owner, repo, token)` | `{exists, canPush, authError, networkError, private}` | Uses GitHub API to verify the repo exists and the token has push rights. |
| `createGithubRepo` | `(repoName, token, isPrivate?)` | `void` | Creates a new repository under the authenticated user. |
| `pushCheckpoint` | `(outputDir, owner, repo, token, layerLabel)` | `{success, error?}` | **Non-fatal.** Commits all files in outputDir and pushes to GitHub with a checkpoint message. Errors are logged but don't stop the build. |
| `pushToGithub` | `(outputDir, owner, repo, token)` | `{success, error?}` | **Fatal.** Final push at the end of a build. Errors are propagated. |

---

### squadPlanner.js

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `createSquadPlan` | `(requirements, plan)` | `squadPlan` | Calls Sonnet 4.6 to divide the project into 2–6 squads by domain. Mock-aware. |
| `formatSquadPlan` | `(squadPlan)` | `string` | Human-readable squad summary shown in the approval gate. |

---

### updatePlanner.js

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `analyzeUpdate` | `(changeRequest, existingSquadPlan)` | `{affectedSquads, newSquads, platformUpdates}` | Calls Sonnet 4.6 to analyse a change request against the existing squad plan and identify what needs to be updated. Mock-aware. |
| `formatUpdatePlan` | `(updatePlan)` | `string` | Human-readable update plan summary for the approval gate. |

---

### tools/fileSystem.js

Creates the tool set used by all agents. All paths are scoped to `outputDir`.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `deepMerge` *(private)* | `(target, source)` | `object` | Recursively merges two objects (used for JSON file merging). |
| `mergeEnvContent` *(private)* | `(existing, incoming)` | `string` | Smart `.env` merge — adds new keys, updates existing values, preserves comments. |
| `createFileSystemTools` | `(outputDir)` | `{ tools, handlers }` | Returns three tools: `read_file`, `write_file` (with JSON/env smart merge), `list_files`. |

---

### tools/shell.js

Creates the shell tool used only by `testRunner`, `devops`, and `squadQaAgent`.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `_translateForPowerShell` *(private)* | `(command)` | `string` | Translates Unix commands to PowerShell equivalents when running on Windows. |
| `createShellTools` | `(outputDir)` | `{ tools, handlers }` | Returns one tool: `run_command` — executes shell commands in `outputDir` with a 5-minute timeout. |

---

### lang.js

UI language system. All user-facing strings go through `t()`. AI prompts receive `getLangInstruction()`.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `setLanguage` | `(code)` | `void` | Sets the active language code (e.g. `'en'`, `'he'`). |
| `getLanguage` | `()` | `string` | Returns the current language code. |
| `getLangName` | `()` | `string` | Returns the human-readable language name (e.g. `'Hebrew'`). |
| `getLangInstruction` | `()` | `string` | Returns a prompt injection string (e.g. `"Write all output in Hebrew."`). |
| `t` | `(key, ...args)` | `string` | Looks up a translation key; substitutes `%s` args. Falls back to English if key missing. |

---

### planner.js

Interactive AI planning session that produces a structured requirements document.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `runPlanningSession` | `(ask, outputDir)` | `string` | Runs a multi-turn conversation with Sonnet to clarify requirements. Saves the result to `docs/requirements-draft.md`. Returns the final requirements string. |

---

### designPicker.js

Interactive design-theme picker. Runs before the build starts; appends the chosen design spec to requirements.

| Function | Signature | Returns | Purpose |
|----------|-----------|---------|---------|
| `runDesignPicker` | `(requirements, ask)` | `string \| null` | Generates 3 design concepts, shows them to the user, and returns the formatted design spec for the chosen concept. Returns null if user skips. |

---

### agentDependencies.js

| Export | Type | Purpose |
|--------|------|---------|
| `DEPENDENCY_MAP` | `Record<string, string[]>` | Maps every agent name to the list of agent names whose outputs it reads. Used by `buildScopedContext` to inject only the relevant dependency summaries. |

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
