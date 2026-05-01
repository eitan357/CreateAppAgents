# ארכיטקטורה מלאה — App Builder Multi-Agent System

> **מקרא סוג פלט:**
> 💻 קוד — קבצי קוד מקור שמורצים/מקומפלים
> 📋 מסמך — קבצי הנחיות/spec שמכוונים agents אחרים
> 🔍 דוח — קבצי ניתוח/review שמכוונים לתיקונים
> ⚙️ קונפיג — קבצי תצורה (Docker, CI, tsconfig)

---

## שלב 0 — הכנה (index.js)

```
1. בחירת מצב דרישות: planner.js (שיחה עם Sonnet) או הזנה ידנית
2. GitHub Repository: validateGithubAccess() — או יצירת repo חדש
3. בחירת tier: חסכוני / מאוזן / מקסימלי  →  setModelConfig()
4. designPicker.js (אופציונלי): Sonnet מציע 3 עיצובים, המשתמש בוחר
5. אם קיים checkpoint: תפריט 3 אפשרויות — בנייה חדשה / המשך / עדכון
```

---

## שלב 1 — יצירת תוכנית (orchestrator.js)

```
createPlan()     — Sonnet 4.6 → JSON plan (tech stack, agents, optional agents)
                   approval gate
createSquadPlan() — Sonnet 4.6 → חלוקה לצוותים לפי דומיינים
                   approval gate
ProjectContext נוצר (requirements, plan, squadPlan, outputDir)
```

---

## LAYER 1 — Discovery (רצף, sequential)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **requirementsAnalyst** | דרישות גולמיות מהמשתמש | `docs/requirements.md` — PRD מלא: user stories, קריטריוני קבלה, edge cases, MVP | 📋 |
| **systemArchitect** | requirementsAnalyst output | `docs/system-architecture.md` — monolith/microservices, patterns, flow בין שכבות | 📋 |
| **mobileTechAdvisor** *(opt)* | requirementsAnalyst + systemArchitect | `docs/mobile-tech-decisions.md` — framework, state mgmt, קונפיגורציה | 📋 |
| **webTechAdvisor** *(opt)* | requirementsAnalyst + systemArchitect | `docs/web-tech-decisions.md` — framework, TypeScript, monorepo, ESLint | 📋 |
| **businessPlanningAgent** *(opt)* | requirementsAnalyst | `docs/business-plan.md` — עלויות, MVP scope, roadmap | 📋 |

---

## LAYER 2 — Design (מקביל, parallel)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **dataArchitect** | requirementsAnalyst + systemArchitect | `docs/data-model.md` + קבצי migration ראשוניים (schema.sql / prisma.schema) | 📋 + 💻 |
| **apiDesigner** | requirementsAnalyst + systemArchitect | `docs/api-design.md` — כל endpoints עם request/response schemas מלאים | 📋 |
| **frontendArchitect** | requirementsAnalyst + systemArchitect | `docs/frontend-architecture.md` — routing, state mgmt, folder structure | 📋 |
| **renderingStrategyAgent** *(opt)* | systemArchitect + frontendArchitect | `docs/rendering-strategy.md` — CSR/SSR/SSG/ISR לכל route, App Router | 📋 |
| **uxDesignerAgent** *(opt)* | requirementsAnalyst + systemArchitect | `docs/ux-flows.md` — user flows, ASCII wireframes לכל מסך, states, microcopy | 📋 |
| **designSystemAgent** *(opt)* | frontendArchitect + uxDesignerAgent | `docs/design-system.md` — design tokens, component variants, dark mode spec | 📋 |
| **localizationAgent** *(opt)* | requirementsAnalyst + frontendArchitect | `frontend/src/i18n/` — קונפיג + קבצי תרגום (en/he/ar) | 💻 |

---

## LAYER 2b — Platform Build (רצף, sequential — תמיד רץ אם יש frontend)

> רץ **לפני** כל squad. הsquads מייבאים מהקבצים האלה — לא יוצרים כפילויות.

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **uiPrimitivesAgent** | designSystemAgent + uxDesignerAgent + frontendArchitect | `shared/components/primitives/` — Button, Input, Select, Checkbox, Radio, TextArea, Typography, Icon, Badge, Avatar, Spinner, Tooltip + index.ts | 💻 |
| **uiCompositeAgent** | uiPrimitivesAgent + uxDesignerAgent + frontendArchitect | `shared/components/composite/` — Card, Modal, Drawer, Toast, Table, List, Carousel, Tabs, Accordion, Form, Pagination, **EmptyState, ErrorState, LoadingState**, NavBar, Sidebar, BottomTabBar + index.ts | 💻 |
| **apiClientAgent** | apiDesigner + systemArchitect | `shared/api/types.ts` — כל interfaces של request/response<br>`shared/api/client.ts` — HTTP wrapper עם auth injection, retry, timeout<br>`shared/api/endpoints.ts` — typed methods לכל endpoint<br>`shared/api/index.ts` | 💻 |

**כל squad מקבל בcontext:**
```
⚠️ MANDATORY — import from platform, do NOT duplicate:
  import { Button, Input }  from '../../shared/components/primitives';
  import { Card, EmptyState } from '../../shared/components/composite';
  import { api }            from '../../shared/api';
  import type { User, ... } from '../../shared/api/types';
```

---

## LAYER 3 — Implementation — Squad Mode

כשקיים squadPlan, Layer 3 רץ כ-Squads במקביל (כל squad sequential פנימית).

### Squad PM Cycle (per squad)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **SquadPmSpec** | דרישות + tech stack + systemArchitect + dataArchitect + apiDesigner | `docs/squads/{id}-spec.md` — endpoints, data models, screens, acceptance criteria | 📋 |
| **backendDev** | systemArchitect + dataArchitect + apiDesigner + apiClientAgent + squad spec | `backend/src/modules/{squad}/` — routes, controllers, services, middleware, DB queries | 💻 |
| **frontendDev** | platform agents + frontendArchitect + uxDesignerAgent + squad spec | `frontend/src/{squad}/` (או `mobile/src/{squad}/`) — screens, components, hooks, forms | 💻 |
| **authAgent** *(בsquad שאחראי על auth)* | systemArchitect + apiDesigner + dataArchitect + apiClientAgent + squad spec | JWT/session middleware, login/register/logout routes, route protection | 💻 |
| **integrationAgent** *(opt)* | systemArchitect + apiDesigner + apiClientAgent + squad spec | Stripe, Firebase, webhooks, third-party API wrappers | 💻 |
| **SquadPmReview** | squad spec + כל קבצי הsquad (קורא read_file) | `docs/squads/{id}-review.md` — VERDICT: ACCEPTED / GAPS + רשימת פערים | 🔍 |

**אם GAPS:** סבב תיקון אחד → dev agents קוראים קוד קיים ומתקנים → PM Re-review.

לאחר כל הsquads, `_mergeOutputsToContext()` ממזג פלטים:
`auth:backendDev` + `listings:backendDev` → `agentOutputs['backendDev']` (Layer 4 עובד ללא שינוי)

ללא squadPlan: Layer 3 רץ parallel רגיל.

---

## LAYER 3b — Mobile Features (מקביל, אופציונלי)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **notificationsAgent** | frontendDev + backendDev + integrationAgent | FCM/APNs setup, notification service, local reminders | 💻 |
| **deepLinksAgent** | frontendDev + backendDev | Universal Links config, deep link handlers, QR utils | 💻 |
| **offlineFirstAgent** | frontendDev + dataArchitect + apiDesigner | WatermelonDB/TanStack sync, offline queue, persistence layer | 💻 |
| **realtimeAgent** | backendDev + frontendDev + integrationAgent | Socket.io server + client, live update hooks, chat | 💻 |
| **animationsAgent** | frontendDev + frontendArchitect | Lottie files, shared transitions, micro-interaction components | 💻 |
| **onboardingAgent** | frontendDev + frontendArchitect | Splash screen, onboarding flow, permission rationale screens | 💻 |
| **monetizationAgent** | frontendDev + backendDev + integrationAgent | RevenueCat integration, IAP flows, subscription screens | 💻 |
| **mlMobileAgent** | frontendDev + systemArchitect | ML Kit / TFLite setup, OCR/face detection/translation utilities | 💻 |
| **arVrAgent** | frontendDev + systemArchitect | ARKit/ARCore setup, 3D placement components | 💻 |
| **widgetsExtensionsAgent** | frontendDev | Home screen widgets, Apple Watch extension, Share extension | 💻 |
| **otaUpdatesAgent** | frontendDev + devops | Expo EAS Update / CodePush config, update check logic | 💻 + ⚙️ |

---

## LAYER 3c — Web Features (מקביל, אופציונלי)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **responsiveDesignAgent** | frontendArchitect + frontendDev | CSS breakpoints, fluid typography, responsive image components, container queries | 💻 |
| **pwaAgent** | frontendDev + frontendArchitect | Service Worker, Web App Manifest, offline cache strategy, install prompt | 💻 + ⚙️ |
| **webMonetizationAgent** | backendDev + frontendDev + dataArchitect + apiDesigner | Stripe Billing, checkout flow, customer portal, webhook handler, feature gating | 💻 |
| **cmsAgent** | frontendDev + backendDev + systemArchitect | CMS setup (Payload/Strapi), contentService, useContent() hook, seed data + **`docs/cms-migration.md`** — רשימת כל הטקסטים להחלפה | 💻 + 📋 |

---

## LAYER 3d — CMS Integration (רצף, אופציונלי)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **cmsIntegratorAgent** | cmsAgent output + frontendDev output | **קורא כל קבצי הcomponents** + `docs/cms-migration.md`, מחשב relative import path לפי עומק הקובץ, מחליף hardcoded strings ב-`t('key','fallback')` בקבצים קיימים | 💻 (משנה קבצים קיימים) |

---

## LAYER 3e — Error Handling (רצף, תמיד רץ)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **errorHandlingAgent** | backendDev + frontendDev + authAgent | **קורא כל route files + package.json לפני כתיבה.** מוסיף: Express global error middleware, asyncHandler, httpErrors, React ErrorBoundary, globalErrorHandlers, apiClient interceptors. תיקון surgical — לא מחליף קבצים שלמים. | 💻 (משנה קבצים קיימים + יוצר חדשים) |

---

## LAYER 3f — Code Refinement (רצף, תמיד רץ)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **codeDeduplicationAgent** | backendDev + frontendDev + authAgent + errorHandlingAgent | **קורא כל הקבצים כולל tests + tsconfig.** מחלץ לוגיקה/קומפוננטות/hooks כפולים ל-`shared/utils/`, מעדכן את כל ה-importers (כולל test files) | 💻 (יוצר shared modules + משנה קבצים קיימים) |
| **codeCleanupAgent** | codeDeduplicationAgent | **קורא את כל הקבצים לפני החלטה.** מסיר: unused imports, dead code, console.log, commented-out blocks, debugger statements | 💻 (משנה קבצים קיימים בלבד) |

---

## LAYER 4 — Quality (מקביל, parallel)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **testWriter** | backendDev + frontendDev + authAgent + dataArchitect | `*.test.ts` / `*.spec.ts` — unit + integration tests לכל module | 💻 |
| **security** | backendDev + authAgent + apiDesigner | `docs/security-report.md` — XSS, SQLi, CSRF, IDOR findings + המלצות תיקון | 🔍 |
| **reviewer** | backendDev + frontendDev + authAgent + integrationAgent | `docs/code-review.md` — bugs, anti-patterns, missing files, quality issues | 🔍 |
| **performanceAgent** *(opt)* | frontendDev + frontendArchitect | `docs/performance-report.md` — startup time, memory leaks, 60fps issues | 🔍 |
| **webPerformanceAgent** *(opt)* | frontendDev + frontendArchitect + renderingStrategyAgent | `docs/web-performance-report.md` — Core Web Vitals, bundle analysis, Lighthouse | 🔍 |
| **accessibilityAgent** *(opt)* | frontendDev | `docs/accessibility-report.md` — WCAG 2.1 violations, ARIA issues, color contrast | 🔍 |
| **loadTestingAgent** *(opt)* | backendDev + apiDesigner + devops | `k6/` — load/stress/soak test scripts | 💻 |
| **dependencyManagementAgent** *(opt)* | frontendDev + backendDev | `docs/dependency-report.md` — CVEs, licenses, bundle size | 🔍 |
| **userTestingAgent** *(opt)* | frontendDev + backendDev | `docs/user-testing-plan.md` — TestFlight/Firebase Distribution setup, A/B scripts | 📋 |
| **privacyEthicsAgent** *(opt)* | backendDev + frontendDev + analyticsMonitoring | `docs/privacy-report.md` — GDPR/CCPA gaps + data deletion endpoints to add | 🔍 |

---

## LAYER 4b — Test Run (רצף)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **testRunner** | testWriter + קבצי קוד קיימים | מריץ `npm install` + jest/vitest/playwright עם `\|\| true`.<br>**`docs/test-results.md`** — output מלא + כיסוי לפי קובץ. גישת shell בלעדית. | 🔍 |

---

## LAYER 4c — Test Fix (רצף)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **testFixer** | test-results.md | קורא קובץ טסט + קובץ מקור לכל כישלון.<br>**Case A** — טסט שגוי: מתקן קובץ טסט (💻)<br>**Case B** — קוד שגוי: מתקן קוד מקור (💻) | 💻 (משנה קבצים קיימים) |

---

## 🔄 Quality Fix Loop (עד 2 סבבים)

```
אם דוחות Quality מכילים בעיות → approval gate

  backendDev + frontendDev + authAgent
    קוראים דוחות (feedbackNotes) — dependencies מדולגות, חוסך 5-15K tokens
    מתקנים קוד קיים (read_file → fix → write_file)

  Quality Re-run: Layer 4 → 4b → 4c
  approval gate → הצגת תוצאות → סבב נוסף אם נדרש (עד max 2)
```

---

## LAYER 5 — Operations (מקביל, parallel — ללא approval gate)

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **devops** | systemArchitect + backendDev + frontendDev | `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `nginx.conf`, deployment scripts | ⚙️ |
| **documentation** | requirementsAnalyst + apiDesigner + backendDev + frontendDev + devops | `README.md`, `docs/api-reference.md`, `docs/setup-guide.md`, `CONTRIBUTING.md` | 📋 |
| **analyticsMonitoring** *(opt)* | frontendDev + backendDev | Sentry config, GA4/Plausible setup, RUM, feature flag utils | 💻 + ⚙️ |
| **seoAgent** *(opt)* | frontendDev + renderingStrategyAgent + frontendArchitect | meta tags, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt` | 💻 |
| **appStorePublisher** *(opt)* | systemArchitect + frontendDev + devops | Fastlane config, signing scripts, release checklist | ⚙️ + 📋 |
| **asoMarketingAgent** *(opt)* | requirementsAnalyst | `docs/store-listing.md` — keywords, description, screenshot strategy | 📋 |

---

## PM Acceptance Review

| Agent | קלט | פלט | סוג |
|-------|-----|-----|-----|
| **pmReviewer** | כל agent outputs (קורא קבצים שנוצרו) | `docs/pm-review.md` — ✅/⚠️/❌ לכל דרישה + **VERDICT: ACCEPTED / NEEDS_FIXES** | 🔍 |

**PM Fix Loop (עד 2 סבבים):** אם NEEDS_FIXES → backendDev + frontendDev + authAgent קוראים pm-review.md ומשלימים → Quality Re-run → PM Re-review.

---

## 🏢 Squad System — 3 שלבים

### שלב 1 — Squad Planner (squadPlanner.js)
Sonnet 4.6 מחלק את האפליקציה לצוותים: 2-3 לאפליקציות קטנות, 3-5 בינוני, 5-6 גדול.
כל squad: `id`, `name`, `userFacingArea`, `backendModule`, `frontendModule`, `keyFeatures`, `agents`

### שלב 2 — Squad Runner (squadRunner.js)
```
runAllSquads() — כל squads במקביל
  runSquad(squad):
    Phase 1: SquadPmSpec    → docs/squads/{id}-spec.md          📋
    Phase 2: dev agents      → backend/src/modules/{squad}/      💻
                               frontend/src/{squad}/             💻
    Phase 3: SquadPmReview  → docs/squads/{id}-review.md        🔍
    Phase 4: if GAPS → fix round → re-review

_mergeOutputsToContext(): auth:backendDev + listings:backendDev → agentOutputs['backendDev']
```

### שלב 3 — Update Mode (updatePlanner.js + orchestrateUpdate)
```
analyzeUpdate(changeRequest, existingSquadPlan) → {
  affectedSquads: [{ id, changeDescription }],
  newSquads:      [{ ...squad schema }],
  platformUpdates: {
    uiPrimitives: "..." | null,   ← רץ uiPrimitivesAgent בUpdate mode
    uiComposite:  "..." | null,   ← רץ uiCompositeAgent בUpdate mode
    apiClient:    "..." | null    ← רץ apiClientAgent בUpdate mode
  }
}

סדר ריצה בUpdate Mode:
  Platform agents שמושפעים (קוראים קוד קיים → מוסיפים בלבד)
           ↓
  Squads קיימים (SquadPmUpdateSpec → dev update → PM review)
  Squads חדשים  (תהליך רגיל)
           ↓
  Quality Re-run + PM Review + GitHub push
```

---

## 🐙 GitHub Integration (github.js)

| פונקציה | תפקיד |
|---------|--------|
| `parseGithubRepo(input)` | מנתח owner/repo / URL / SSH |
| `checkGithubAccess(owner, repo, token)` | בודק קיום + הרשאות push |
| `createGithubRepo(repoName, token, isPrivate)` | יוצר repo חדש |
| `pushCheckpoint(outputDir, ...)` | **non-fatal** — push אחרי כל layer, לא מפיל build |
| `pushToGithub(outputDir, ...)` | **fatal** — push סופי בסוף build |

---

## 💾 Checkpoint System

```
saveCheckpoint(layerLabel) — נקרא אחרי כל layer:
  context.saveCheckpoint() → .build-checkpoint.json (local)
  pushCheckpoint()         → GitHub push (non-fatal)

checkpoint כולל: requirements, plan, squadPlan,
                 agentOutputs, allFilesCreated, completedLayers

index.js — כשנמצא checkpoint:
  1️⃣  בנייה חדשה מאפס
  2️⃣  המשך מנקודת עצירה (layers שהושלמו → מדולגים)
  3️⃣  עדכון / הוספת פיצ'ר  ← דורש squadPlan בcheckpoint
```

---

## תשתית משותפת

| מודול | תפקיד |
|-------|--------|
| **base.js** | `BaseAgent` — Opus 4.7, thinking + max_tokens לפי tier. timeout: 20 דקות לכל call. |
| **context.js** | `ProjectContext` — state משותף. `buildScopedContext()` מזריק dependencies. `_injectPlatformRules()` מזריק הנחיות שימוש בshared code לכל squad. `platformUpdateNotes` לUpdate Mode. |
| **agentDependencies.js** | DEPENDENCY_MAP — מה כל agent "רואה" מהagents שרצו לפניו. |
| **layerRunner.js** | `runLayerInParallel` / `runLayerSequential` — retry x2 לכל agent. |
| **squadRunner.js** | `runAllSquads`, `runSquadUpdate`, `runAllSquadsUpdate` — Squad PM cycle. |
| **squadPlanner.js** | `createSquadPlan` — Sonnet 4.6 מחלק לצוותים. |
| **updatePlanner.js** | `analyzeUpdate` — Sonnet 4.6 מנתח בקשת שינוי → affectedSquads + newSquads + platformUpdates. |
| **tools/fileSystem.js** | `read_file` / `write_file` / `list_files` — לכל ה-agents. |
| **tools/shell.js** | `run_command` — לtestRunner ו-devops בלבד. |
| **approval.js** | approval gates בין layers. |
| **github.js** | חיבור ל-GitHub: validation, repo creation, checkpoint push, final push. |

---

## סיכום מספרים

| | |
|-|-|
| סה"כ agents | ~58 |
| agents שמייצרים קוד (💻) | ~40 |
| agents שמייצרים מסמכי הנחיות (📋) | ~10 |
| agents שמייצרים דוחות/ניתוח (🔍) | ~10 |
| agents שמייצרים קונפיג (⚙️) | ~5 |
| agents שמשנים קבצים קיימים | cmsIntegratorAgent, errorHandlingAgent, codeDeduplicationAgent, codeCleanupAgent, testFixer |
| מודל לפיתוח | Claude Opus 4.7 (timeout: 20 דקות) |
| מודל לתכנון | Claude Sonnet 4.6 (timeout: 10 דקות) |
| מקסימום סבבי Quality Fix | 2 |
| מקסימום סבבי PM Fix | 2 |
| agents עם גישת shell | testRunner, devops |
| checkpoint | אחרי כל layer — local + GitHub push |



