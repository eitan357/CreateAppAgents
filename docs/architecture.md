# ארכיטקטורה מלאה — App Builder Multi-Agent System

> **מקרא סוג פלט:**
> 💻 קוד — קבצי קוד מקור שמורצים/מקומפלים
> 📋 מסמך — קבצי הנחיות/spec שמכוונים agents אחרים
> 🔍 דוח — קבצי ניתוח/review שמכוונים לתיקונים
> ⚙️ קונפיג — קבצי תצורה (Docker, CI, tsconfig)

---

## מבנה החברה — 3 רמות

```
┌─────────────────────────────────────────────────────────┐
│  צוות Leaders (Layer 2b)                                │
│  VP PM · Tech Lead · QA Lead · Security Lead            │
│  מוציאים מסמכי הנחיות לכל שאר הצוותים                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  צוות Platform (Layer 2c)                               │
│  Platform PM → UI Devs → API Dev → DB Dev → Platform QA │
│  בונה shared/components · shared/api · shared/db        │
└─────────────────────────────────────────────────────────┘
                          ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Squad A     │  │  Squad B     │  │  Squad C     │  ← במקביל
│  PM→Design   │  │  PM→Design   │  │  PM→Design   │
│  →Dev→Clean  │  │  →Dev→Clean  │  │  →Dev→Clean  │
│  →QA→Sec→PM  │  │  →QA→Sec→PM  │  │  →QA→Sec→PM  │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## שלב 0 — הכנה (index.js)

```
1. בחירת מצב דרישות: planner.js (שיחה עם Sonnet) או הזנה ידנית
2. GitHub Repository: validateGithubAccess() — או יצירת repo חדש
3. בחירת tier: חסכוני / מאוזן / מקסימלי → setModelConfig()
4. designPicker.js (אופציונלי): Sonnet מציע 3 עיצובים, המשתמש בוחר
5. אם קיים checkpoint: תפריט 3 אפשרויות — בנייה חדשה / המשך / עדכון
```

---

## שלב 1 — יצירת תוכנית (orchestrator.js)

```
createPlan()      — Sonnet 4.6 → JSON plan (tech stack, agents, optional agents)
                    approval gate
createSquadPlan() — Sonnet 4.6 → חלוקה לצוותים לפי דומיינים
                    approval gate
ProjectContext נוצר (requirements, plan, squadPlan, outputDir)
```

---

## LAYER 1 — Discovery (רצף, sequential)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **requirementsAnalyst** | ממיר דרישות גולמיות ל-PRD מובנה: user stories, קריטריוני קבלה, edge cases, MVP scope | דרישות גולמיות | `docs/requirements-spec.md`, `docs/domain-glossary.md` | 📋 |
| **systemArchitect** | מגדיר ארכיטקטורת מערכת: monolith/microservices, patterns, tech stack | requirementsAnalyst | `docs/system-architecture.md`, `docs/architecture.md` | 📋 |
| **mobileTechAdvisor** *(opt)* | בוחר framework למובייל, state management, ניווט, build config | requirementsAnalyst + systemArchitect | `docs/mobile-tech-decisions.md` | 📋 |
| **webTechAdvisor** *(opt)* | בוחר framework לווב, TypeScript setup, monorepo, ESLint/Prettier | requirementsAnalyst + systemArchitect | `docs/web-tech-decisions.md` | 📋 |
| **businessPlanningAgent** *(opt)* | מעריך עלויות, מגדיר MVP scope ו-roadmap עסקי | requirementsAnalyst | `docs/business-plan.md` | 📋 |

---

## LAYER 2 — Design (מקביל, parallel)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **dataArchitect** | מתכנן מודל נתונים מלא: entities, relations, indexes, constraints. Blueprint לdbSchemaAgent | requirementsAnalyst + systemArchitect | `docs/data-model.md` | 📋 |
| **apiDesigner** | מגדיר כל endpoint: method, path, request/response schema, auth. Contract בין backend לfrontend | requirementsAnalyst + systemArchitect | `docs/api-design.md` | 📋 |
| **frontendArchitect** | מגדיר folder structure, routing, state management, data fetching לצד הלקוח | requirementsAnalyst + systemArchitect | `docs/frontend-architecture.md` | 📋 |
| **renderingStrategyAgent** *(opt)* | מחליט CSR/SSR/SSG/ISR per-page ב-Next.js/Nuxt, מגדיר App Router ו-protected routes | systemArchitect + frontendArchitect | `docs/rendering-strategy.md` | 📋 |
| **uxDesignerAgent** *(opt)* | מצייר wireframes טקסטואליים לכל מסך, מגדיר user flows, empty/error/loading states | requirementsAnalyst + systemArchitect | `docs/ux-flows.md`, `docs/wireframes.md` | 📋 |
| **designLeadAgent** | כותב שני מסמכים: (1) design system — tokens, variants, dark mode. (2) הנחיות עיצוב לכל Squad Designer | frontendArchitect + uxDesignerAgent | `docs/design-system.md`, `docs/guidelines/design-guidelines.md` | 📋 |
| **localizationAgent** *(opt)* | מגדיר i18n setup ומייצר קבצי תרגום (עברית/ערבית/אנגלית כולל RTL) | requirementsAnalyst + frontendArchitect | `frontend/src/i18n/` | 💻 |
| **inputPolicyAgent** | מייצר מדיניות ולידציה מלאה: max length, regex, file types/sizes, timing, error messages לכל שדה | requirementsAnalyst + uxDesignerAgent | `docs/input-policy.md` | 📋 |

---

## LAYER 2b — Leaders Team (רצף, sequential)

> ראשי המקצועות. **כל agent כאן מוציא מסמך הנחיות** שצוותי הfeature קוראים לפני שמתחילים לעבוד.
> רצים אחרי Design כדי שיוכלו לקרוא את כל המסמכים הארכיטקטוניים.

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **vpPmAgent** | קורא דרישות + חלוקת צוותים → מגדיר לכל Squad PM: אילו user stories שלו, acceptance criteria, תלויות בין צוותים, priority (P0/P1/P2) | requirementsAnalyst + systemArchitect + dataArchitect + apiDesigner | `docs/guidelines/pm-guidelines.md` | 📋 |
| **techLeadAgent** | מגדיר coding standards: module structure, naming conventions, שימוש חובה ב-shared/, error handling patterns, testing requirements | systemArchitect + apiDesigner + dataArchitect + frontendArchitect | `docs/guidelines/tech-guidelines.md` | 📋 |
| **qaLeadAgent** | מגדיר testing strategy: unit vs integration, coverage requirements, test data, forbidden patterns, accessibility requirements | requirementsAnalyst + apiDesigner + systemArchitect | `docs/guidelines/qa-guidelines.md` | 📋 |
| **securityLeadAgent** | מנתח threat model לפרויקט הספציפי → מייצר OWASP checklist מותאם + הנחיות per-squad לפי מה שכל צוות מטפל בו | systemArchitect + apiDesigner + dataArchitect | `docs/guidelines/security-guidelines.md` | 📋 |

---

## LAYER 2c — Platform Team (רצף, sequential — צוות עם PM + Devs + QA)

> בונה את כל הקוד המשותף. כל squad מייבא מכאן — לא יוצר כפילויות.
> ה-PM קורא את הנחיות ה-VP PM ומגדיר spec לצוות. ה-QA בודק completeness.

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **platformPmAgent** | קורא pm-guidelines + design + API + data model → כותב spec מפורט לכל 4 dev agents: אילו components, endpoints, entities לממש | vpPmAgent + designLeadAgent + apiDesigner + dataArchitect | `docs/squads/platform-spec.md` | 📋 |
| **uiPrimitivesAgent** | מממש כל קומפוננטות הבסיס: Button, Input, Select, Checkbox, Radio, TextArea, Typography, Icon, Badge, Avatar, Spinner, Tooltip + index.ts | designLeadAgent + uxDesignerAgent + inputPolicyAgent | `shared/components/primitives/` | 💻 |
| **uiCompositeAgent** | מממש קומפוננטות מורכבות: Card, Modal, Drawer, Toast, Table, Carousel, **EmptyState, ErrorState, LoadingState** (חובה), NavBar, Sidebar + index.ts | uiPrimitivesAgent + uxDesignerAgent + frontendArchitect | `shared/components/composite/` | 💻 |
| **apiClientAgent** | מממש HTTP wrapper עם auth injection, retry, timeout. Typed methods לכל endpoint. כל HTTP call עובר דרכו | apiDesigner + systemArchitect | `shared/api/types.ts`, `shared/api/client.ts`, `shared/api/endpoints.ts`, `shared/api/index.ts` | 💻 |
| **dbSchemaAgent** | מממש DB connection, model/entity files (אחד לכל entity), migrations. תומך Mongoose/Prisma/TypeORM/Sequelize/Drizzle | dataArchitect + systemArchitect | `shared/db/connection.ts`, `shared/db/models/` או `prisma/schema.prisma`, `shared/db/index.ts` | 💻 |
| **platformQaAgent** | קורא platform-spec ובודק: האם כל component/endpoint/entity קיים ומיוצא מה-index? | platformPmAgent + uiPrimitivesAgent + uiCompositeAgent + apiClientAgent + dbSchemaAgent | `docs/squads/platform-review.md` — READY / INCOMPLETE | 🔍 |

**כל squad מקבל בcontext:**
```
⚠️ MANDATORY — import from platform, do NOT duplicate:
  import { Button, Input }    from '../../shared/components/primitives';
  import { Card, EmptyState } from '../../shared/components/composite';
  import { api }              from '../../shared/api';
  import type { User, ... }   from '../../shared/api/types';
  import { User, connect }    from '../../shared/db';
```

---

## LAYER 3 — Implementation — Squad Mode (מקביל בין squads)

כל squad רץ **sequential פנימית** עם 8 שלבים. הsquads עצמם רצים **במקביל** אחד לשני.

### Self-Planning Pattern (כל agent שכותב קוד)
לפני שכותב **כל** קובץ, כל code-writing agent כותב תוכנית לעצמו:
```
docs/agent-plans/{agentName}-{squadId}.md:
  ## Files to create
  - path/to/file.ts — תוכן
  ## Files to modify
  - path/to/existing.ts — מה משתנה
  ## Execution order
  1. First: ...
```

### שמונת השלבים של כל Squad

| שלב | Agent | משימה | קלט | פלט | סוג |
|-----|-------|-------|-----|-----|-----|
| 1 | **Squad PM (Spec)** | קורא pm-guidelines + דרישות → מתרגם למשימות טכניות קונקרטיות לצוות זה בלבד: endpoints, screens, acceptance criteria | vpPmAgent guidelines + design docs + squad info | `docs/squads/{id}-spec.md` | 📋 |
| 2 | **squadDesignerAgent** | קורא design-guidelines + squad spec → כותב עיצוב מפורט screen-by-screen: components, layout, states, forms, navigation | designLeadAgent guidelines + spec + ux-flows | `docs/squads/{id}-design.md` | 📋 |
| 3 | **backendDev** | מממש backend לדומיין הצוות לפי tech-guidelines + spec: routes, controllers, services, DB queries | tech-guidelines + spec + shared/db + shared/api | `backend/src/modules/{squad}/` | 💻 |
| 3 | **frontendDev** | מממש frontend לדומיין הצוות לפי tech-guidelines + squad design: screens, hooks, forms | tech-guidelines + squad design + shared/components + shared/api | `frontend/src/{squad}/` | 💻 |
| 3 | **authAgent** *(squad auth בלבד)* | מממש JWT/session, login/register/logout, route protection | tech-guidelines + spec + shared/db + inputPolicyAgent | auth routes + middleware | 💻 |
| 3 | **integrationAgent** *(opt)* | מממש third-party APIs, webhooks, external services | tech-guidelines + spec | integration services | 💻 |
| 4 | **squadCleanupAgent** | קורא כל קבצי הצוות → מוסיף error handling + מנקה קוד (unused imports, console.log, dead code, dedup בתוך הצוות) | tech-guidelines + כל קבצי הצוות | עדכון in-place + `docs/squads/{id}-cleanup-report.md` | 💻 (משנה קיים) |
| 5 | **squadQaAgent** | כותב unit + integration tests, מריץ אותם, מתקן כישלונות, בודק accessibility | qa-guidelines + spec + כל קבצי הצוות | `*.test.ts`, `docs/squads/{id}-qa-report.md` | 💻 + 🔍 |
| 6 | **squadSecurityAgent** | מיישם OWASP checklist מsecurity-guidelines על קוד הצוות הספציפי. מתקן HIGH findings ישירות | security-guidelines + כל קבצי הצוות | `docs/squads/{id}-security-report.md` + תיקונים | 🔍 + 💻 |
| 7 | **Squad PM (Review)** | קורא spec + כל קבצי הצוות → האם כל acceptance criteria מולאו? | spec + כל קבצי הצוות | `docs/squads/{id}-review.md` — VERDICT: ACCEPTED / GAPS | 🔍 |
| 8 | **Fix Round** *(אם GAPS)* | dev agents קוראים gaps → מתקנים → PM re-review | squad gaps doc | תיקונים in-place | 💻 |

לאחר כל הsquads, `_mergeOutputsToContext()` ממזג פלטים:
`auth:backendDev` + `listings:backendDev` → `agentOutputs['backendDev']`

---

## LAYER 3b — Mobile Features (מקביל, אופציונלי)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **notificationsAgent** | FCM/APNs setup, notification service, local reminders | frontendDev + backendDev + integrationAgent | push service, reminder utils | 💻 |
| **deepLinksAgent** | Universal Links, App Links, deep link handlers, QR utils | frontendDev + backendDev | link config, handler router | 💻 |
| **offlineFirstAgent** | WatermelonDB/TanStack persistence, offline queue, sync logic | frontendDev + dataArchitect + apiDesigner | offline db, sync service | 💻 |
| **realtimeAgent** | Socket.io server + client hooks, live updates, chat | backendDev + frontendDev + integrationAgent | socket server, real-time hooks | 💻 |
| **animationsAgent** | Lottie animations, shared transitions, micro-interactions | frontendDev + frontendArchitect | animation components | 💻 |
| **onboardingAgent** | First-run experience, splash, permission rationale, empty states | frontendDev + frontendArchitect | onboarding screens | 💻 |
| **monetizationAgent** | RevenueCat, IAP flows, subscription screens | frontendDev + backendDev + integrationAgent | IAP service, subscription screens | 💻 |
| **mlMobileAgent** | ML Kit/TFLite, OCR, face detection, on-device ML | frontendDev + systemArchitect | ML utilities | 💻 |
| **arVrAgent** | ARKit/ARCore, 3D placement components | frontendDev + systemArchitect | AR components | 💻 |
| **widgetsExtensionsAgent** | Home screen widgets, Apple Watch, Share extension | frontendDev | widget targets | 💻 |
| **otaUpdatesAgent** | Expo EAS Update / CodePush config, update check logic | frontendDev + devops | OTA config, update service | 💻 + ⚙️ |

---

## LAYER 3c — Web Features (מקביל, אופציונלי)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **responsiveDesignAgent** | Mobile-first CSS breakpoints, fluid typography, responsive images | frontendArchitect + frontendDev | responsive styles | 💻 |
| **pwaAgent** | Service Worker, Web App Manifest, offline cache, install prompt | frontendDev + frontendArchitect | SW config, manifest | 💻 + ⚙️ |
| **webMonetizationAgent** | Stripe Billing, checkout, customer portal, webhook handler, feature gating | backendDev + frontendDev + dataArchitect + apiDesigner | Stripe integration, billing screens | 💻 |
| **cmsAgent** | מזהה hardcoded text, מגדיר CMS, contentService, useContent() hook, cms-migration.md | frontendDev + backendDev + systemArchitect | CMS config + `docs/cms-migration.md` | 💻 + 📋 |

---

## LAYER 3d — CMS Integration (רצף, אופציונלי)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **cmsIntegratorAgent** | קורא cms-migration.md ועובר על כל component files → מחליף hardcoded strings ב-`t('key','fallback')` | cmsAgent + כל component files | עדכון in-place לכל קבצים | 💻 (משנה קיים) |

---

## LAYER 3e — Error Handling גלובלי (רצף, global pass)

> ה-squadCleanupAgent מטפל בשגיאות **בתוך כל squad**. Layer זה עושה pass גלובלי נוסף.

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **errorHandlingAgent** | קורא כל route files → מוסיף Express global error middleware, asyncHandler, ErrorBoundary, API interceptors. Surgical — לא מחליף קבצים | backendDev + frontendDev + authAgent | עדכון in-place + קבצי error חדשים | 💻 (משנה קיים) |

---

## LAYER 3f — Code Refinement גלובלי (רצף)

> ה-squadCleanupAgent מנקה **בתוך כל squad**. Layer זה עושה deduplication **בין squads**.

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **codeDeduplicationAgent** | קורא **את כל הקוד מכל הsquads** → מזהה כפילויות cross-squad → מחלץ ל-shared/utils/ | backendDev + frontendDev + authAgent + errorHandlingAgent | `shared/utils/` + עדכון imports | 💻 (משנה קיים) |
| **codeCleanupAgent** | מנקה לאחר deduplication: unused imports, dead code, console.log | codeDeduplicationAgent | עדכון in-place | 💻 (משנה קיים) |

---

## LAYER 4 — Quality גלובלי (מקביל, global pass)

> ה-squadQaAgent ו-squadSecurityAgent עובדים **על קוד כל squad בנפרד**.
> Layer זה עושה quality pass **על כל האפליקציה המאוחדת**.

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **testWriter** | כותב tests נוספים cross-squad: integration בין squads, E2E flows | backendDev + frontendDev + authAgent + dataArchitect | `*.test.ts` נוספים | 💻 |
| **security** | security review גלובלי על האפליקציה כולה — חוצה צוותים | backendDev + authAgent + apiDesigner | `docs/security-report.md` | 🔍 |
| **reviewer** | code review גלובלי: patterns, consistency בין squads | backendDev + frontendDev + authAgent + integrationAgent | `docs/code-review.md` | 🔍 |
| **performanceAgent** *(opt)* | profiling מלא של האפליקציה: startup, memory, 60fps | frontendDev + frontendArchitect | `docs/performance-report.md` | 🔍 |
| **webPerformanceAgent** *(opt)* | Core Web Vitals, bundle analysis, code splitting | frontendDev + frontendArchitect + renderingStrategyAgent | `docs/web-performance-report.md` | 🔍 |
| **accessibilityAgent** *(opt)* | WCAG 2.1 review גלובלי | frontendDev | `docs/accessibility-report.md` | 🔍 |
| **loadTestingAgent** *(opt)* | k6 load/stress/soak scripts לbackend המלא | backendDev + apiDesigner + devops | `k6/` | 💻 |
| **dependencyManagementAgent** *(opt)* | npm audit, licenses, outdated packages | frontendDev + backendDev | `docs/dependency-report.md` | 🔍 |
| **userTestingAgent** *(opt)* | TestFlight/Firebase Distribution setup, A/B scripts | frontendDev + backendDev | `docs/user-testing-plan.md` | 📋 |
| **privacyEthicsAgent** *(opt)* | GDPR/CCPA: cookie consent, data retention, data deletion endpoints | backendDev + frontendDev + analyticsMonitoring | `docs/privacy-report.md` | 🔍 |

---

## LAYER 4b — Test Run (רצף, גלובלי)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **testRunner** | מריץ `npm install` + כל ה-test suite (jest/vitest/playwright) עם `\|\| true`. צריך אפליקציה שלמה רצה — לכן גלובלי. גישת shell בלעדית. | testWriter + קבצי קוד | `docs/test-results.md` | 🔍 |

---

## LAYER 4c — Test Fix (רצף, גלובלי)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **testFixer** | קורא test-results.md ולכל כישלון קורא test + source. אם test שגוי → מתקן test. אם קוד שגוי → מתקן קוד. | test-results.md | תיקונים in-place | 💻 (משנה קיים) |

---

## 🔄 Quality Fix Loop (עד 2 סבבים, גלובלי)

```
אם דוחות Quality מכילים בעיות → approval gate

  backendDev + frontendDev + authAgent
    קוראים דוחות (feedbackNotes) — dependencies מדולגות
    מתקנים קוד קיים (read_file → fix → write_file)

  Quality Re-run: Layer 4 → 4b → 4c
  approval gate → סבב נוסף אם נדרש (עד max 2)
```

---

## LAYER 5 — Operations (מקביל, ללא approval gate)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **devops** | Dockerfile, docker-compose, GitHub Actions CI/CD, nginx, env vars | systemArchitect + backendDev + frontendDev | `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `nginx.conf` | ⚙️ |
| **documentation** | README, API reference, setup guide, CONTRIBUTING | requirementsAnalyst + apiDesigner + backendDev + frontendDev + devops | `README.md`, `docs/api-reference.md`, `CONTRIBUTING.md` | 📋 |
| **analyticsMonitoring** *(opt)* | Sentry, GA4/Plausible, RUM, feature flags | frontendDev + backendDev | Sentry config, analytics setup | 💻 + ⚙️ |
| **seoAgent** *(opt)* | meta tags, Open Graph, JSON-LD, sitemap.xml, robots.txt | frontendDev + renderingStrategyAgent + frontendArchitect | SEO components, sitemap | 💻 |
| **appStorePublisher** *(opt)* | Fastlane, code signing, App Store Connect + Google Play | systemArchitect + frontendDev + devops | Fastlane config, `docs/release-checklist.md` | ⚙️ + 📋 |
| **asoMarketingAgent** *(opt)* | App Store Optimization: keywords, store listing copy, screenshot strategy | requirementsAnalyst | `docs/store-listing.md` | 📋 |

---

## PM Acceptance Review (גלובלי, VP-level)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **pmReviewer** | קורא את כל הפרויקט ובודק coverage מלא מול הדרישות המקוריות. מחזיר verdict עם רשימת פערים | vpPmAgent + requirementsAnalyst + כל agent outputs | `docs/pm-review.md` — ✅/⚠️/❌ לכל דרישה + **VERDICT: ACCEPTED / NEEDS_FIXES** | 🔍 |

**PM Fix Loop (עד 2 סבבים):** אם NEEDS_FIXES → backendDev + frontendDev + authAgent מתקנים → Quality Re-run → PM Re-review.

---

## 🏢 Squad System — מנגנון הריצה

### Squad Planner (squadPlanner.js)
Sonnet 4.6 מחלק לצוותים: 2-3 קטן, 3-5 בינוני, 5-6 גדול.
כל squad: `id`, `name`, `userFacingArea`, `backendModule`, `frontendModule`, `keyFeatures`, `agents`

### Squad Runner (squadRunner.js)
```
runAllSquads() — כל squads במקביל
  runSquad(squad):
    Phase 1: Squad PM Spec   → docs/squads/{id}-spec.md          📋
    Phase 2: squadDesigner   → docs/squads/{id}-design.md        📋
    Phase 3: dev agents      → backend + frontend code           💻
    Phase 4: squadCleanup    → error handling + code cleanup      💻
    Phase 5: squadQa         → tests + accessibility              💻 + 🔍
    Phase 6: squadSecurity   → security review                    🔍 + 💻
    Phase 7: Squad PM Review → VERDICT: ACCEPTED / GAPS           🔍
    Phase 8: fix round if GAPS → re-review

_mergeOutputsToContext(): merges per-squad outputs for global Layer 4
```

### Leadership Context Flow
```
Leaders Team writes → docs/guidelines/
                              ↓
                     injected via GUIDELINE_MAP in context.js:
  vpPmAgent       → Squad PM + platformPmAgent
  techLeadAgent   → backendDev + frontendDev + authAgent + squadCleanupAgent
  designLeadAgent → squadDesignerAgent + uiPrimitivesAgent + uiCompositeAgent
  qaLeadAgent     → squadQaAgent + platformQaAgent
  securityLeadAgent → squadSecurityAgent
```

### Self-Planning Flow
```
Every code-writing agent (backendDev, frontendDev, authAgent, integrationAgent,
uiPrimitivesAgent, uiCompositeAgent, apiClientAgent, dbSchemaAgent,
squadCleanupAgent, squadQaAgent):

  Step 0: write docs/agent-plans/{agentName}-{squadId}.md
          → list every file to create/modify + execution order
  Step 1+: execute the plan file by file
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

סדר ריצה בUpdate Mode:
  Platform agents שמושפעים (קוראים קוד קיים → מוסיפים בלבד)
           ↓
  Squads קיימים: SquadPmUpdateSpec → dev update → cleanup → QA → security → PM review
  Squads חדשים:  תהליך רגיל (8 שלבים)
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
| `pushCheckpoint(outputDir, ...)` | **non-fatal** — push אחרי כל layer |
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
  2️⃣  המשך מנקודת עצירה
  3️⃣  עדכון / הוספת פיצ'ר  ← דורש squadPlan בcheckpoint
```

---

## תשתית משותפת

| מודול | תפקיד |
|-------|--------|
| **base.js** | `BaseAgent` — Opus 4.7, thinking + max_tokens לפי tier. timeout: 20 דקות. |
| **context.js** | `ProjectContext` — state משותף. `buildScopedContext()` + `buildSquadScopedContext()`. `_injectPlatformRules()`, `_injectLeadershipGuidelines()`, `_injectSelfPlanningPrompt()` מוזרקים אוטומטית לפי agent role. |
| **agentDependencies.js** | DEPENDENCY_MAP — מה כל agent "רואה" מהagents שרצו לפניו. |
| **layerRunner.js** | `runLayerInParallel` / `runLayerSequential` — retry x2 לכל agent. |
| **squadRunner.js** | `runAllSquads`, `runSquadUpdate`, `runAllSquadsUpdate` — 8-phase squad cycle. |
| **squadPlanner.js** | `createSquadPlan` — Sonnet 4.6 מחלק לצוותים. |
| **updatePlanner.js** | `analyzeUpdate` — Sonnet 4.6 מנתח בקשת שינוי → affectedSquads + newSquads + platformUpdates. |
| **tools/fileSystem.js** | `read_file` / `write_file` / `list_files` — לכל ה-agents. |
| **tools/shell.js** | `run_command` — לtestRunner, devops, ו-squadQaAgent בלבד. |
| **approval.js** | approval gates בין layers. |
| **github.js** | GitHub: validation, repo creation, checkpoint push, final push. |

---

## סיכום מספרים

| | |
|-|-|
| סה"כ agents | ~68 |
| agents שמייצרים קוד (💻) | ~42 |
| agents שמייצרים מסמכי הנחיות (📋) | ~15 |
| agents שמייצרים דוחות (🔍) | ~12 |
| agents שמייצרים קונפיג (⚙️) | ~5 |
| agents שמשנים קבצים קיימים | cmsIntegratorAgent, errorHandlingAgent, codeDeduplicationAgent, codeCleanupAgent, testFixer, squadCleanupAgent, squadSecurityAgent (HIGH findings) |
| **Leaders Team agents** | vpPmAgent, techLeadAgent, qaLeadAgent, securityLeadAgent |
| **Platform Team agents** | platformPmAgent, uiPrimitivesAgent, uiCompositeAgent, apiClientAgent, dbSchemaAgent, platformQaAgent |
| **Per-squad agents** | squadDesignerAgent, squadCleanupAgent, squadQaAgent, squadSecurityAgent |
| שלבים per-squad | 8 (PM spec → designer → devs → cleanup → QA → security → PM review → fix) |
| מודל לפיתוח | Claude Opus 4.7 (timeout: 20 דקות) |
| מודל לתכנון | Claude Sonnet 4.6 (timeout: 10 דקות) |
| agents עם גישת shell | testRunner, devops, squadQaAgent |
| checkpoint | אחרי כל layer — local + GitHub push |
