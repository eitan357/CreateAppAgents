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
| **requirementsAnalyst** | קורא את הדרישות הגולמיות של המשתמש ומייצר PRD מובנה: user stories, קריטריוני קבלה, edge cases, ו-MVP scope. זהו הבסיס שממנו כל agent אחר פועל. | דרישות גולמיות מהמשתמש | `docs/requirements-spec.md`, `docs/domain-glossary.md` | 📋 |
| **systemArchitect** | קורא את ה-PRD ומגדיר את ארכיטקטורת המערכת: monolith/microservices, backend patterns, flow בין שכבות, tech stack בסיסי. | requirementsAnalyst | `docs/system-architecture.md`, `docs/architecture.md` | 📋 |
| **mobileTechAdvisor** *(opt)* | בוחר framework למובייל (React Native/Expo/Flutter), ספריות state management, ניווט, ו-build configuration. | requirementsAnalyst + systemArchitect | `docs/mobile-tech-decisions.md` | 📋 |
| **webTechAdvisor** *(opt)* | בוחר framework לווב (Next.js/Nuxt/Remix/Vite), מגדיר TypeScript setup, monorepo, ESLint/Prettier/Husky. | requirementsAnalyst + systemArchitect | `docs/web-tech-decisions.md` | 📋 |
| **businessPlanningAgent** *(opt)* | מעריך עלויות פיתוח ותפעול, מגדיר MVP scope, ומייצר roadmap עסקי עם milestones. | requirementsAnalyst | `docs/business-plan.md` | 📋 |

---

## LAYER 2 — Design (מקביל, parallel)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **dataArchitect** | מתכנן את מודל הנתונים המלא: entities, שדות, types, relations (1:1, 1:N, M:N), indexes, ו-constraints. זהו ה-blueprint שממנו dbSchemaAgent יממש את הקוד. | requirementsAnalyst + systemArchitect | `docs/data-model.md` | 📋 |
| **apiDesigner** | מגדיר כל endpoint ב-REST/GraphQL: method, path, request body, response schema, קודי שגיאה, ו-auth requirements. זהו ה-contract בין backend לfrontend. | requirementsAnalyst + systemArchitect | `docs/api-design.md` | 📋 |
| **frontendArchitect** | מגדיר folder structure, routing strategy, state management, ו-data fetching patterns לצד הלקוח. | requirementsAnalyst + systemArchitect | `docs/frontend-architecture.md` | 📋 |
| **renderingStrategyAgent** *(opt)* | מחליט per-page איזו strategy להשתמש (CSR/SSR/SSG/ISR) ב-Next.js/Nuxt, מגדיר App Router structure ו-protected routes. | systemArchitect + frontendArchitect | `docs/rendering-strategy.md` | 📋 |
| **uxDesignerAgent** *(opt)* | מצייר wireframes טקסטואליים לכל מסך, מגדיר user flows, empty/error/loading states, ו-microcopy. מונע מה-frontendDev לקבל החלטות UX. | requirementsAnalyst + systemArchitect | `docs/ux-flows.md`, `docs/wireframes.md` | 📋 |
| **designSystemAgent** *(opt)* | מגדיר design tokens (צבעים, טיפוגרפיה, spacing, shadows), variants לכל קומפוננט, ו-dark mode spec. זהו ה-source of truth לעיצוב. | frontendArchitect + uxDesignerAgent | `docs/design-system.md` | 📋 |
| **localizationAgent** *(opt)* | מגדיר i18n setup ומייצר קבצי תרגום ראשוניים לכל שפה נדרשת (עברית/ערבית/אנגלית כולל RTL). | requirementsAnalyst + frontendArchitect | `frontend/src/i18n/` — קונפיג + קבצי תרגום | 💻 |
| **inputPolicyAgent** *(opt)* | קורא כל form בדרישות ומייצר מדיניות ולידציה מלאה: max length לכל שדה, תבניות regex, סוגי קבצים מותרים, גודל מקסימלי, כמות מקסימלית, והודעות שגיאה. frontendDev ו-authAgent מממשים לפי מסמך זה. | requirementsAnalyst + uxDesignerAgent | `docs/input-policy.md` | 📋 |

---

## LAYER 2b — Platform Build (רצף, sequential — תמיד רץ אם יש frontend)

> רץ **לפני** כל squad. הsquads מייבאים מהקבצים האלה — לא יוצרים כפילויות.

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **uiPrimitivesAgent** | מממש את כל קומפוננטות הבסיס שכל צוות ישתמש בהן: Button (variants, sizes, loading), Input (types, error state), Select, Checkbox, Radio, TextArea, Typography, Icon, Badge, Avatar, Spinner, Tooltip. כולל index.ts לimport נוח. | designSystemAgent + uxDesignerAgent + inputPolicyAgent + frontendArchitect | `shared/components/primitives/` | 💻 |
| **uiCompositeAgent** | מממש קומפוננטות מורכבות שבנויות מ-primitives: Card, Modal, Drawer, Toast, Table, List, Carousel, Tabs, Accordion, Form, Pagination. כולל **EmptyState, ErrorState, LoadingState** (חובה לכל צוות). | uiPrimitivesAgent + uxDesignerAgent + frontendArchitect | `shared/components/composite/` | 💻 |
| **apiClientAgent** | מממש את שכבת ה-HTTP: wrapper עם auth header injection, retry logic, ו-timeout. מייצר typed methods לכל endpoint מה-API design. כל בקשת רשת עוברת דרכו — אין fetch/axios ישיר. | apiDesigner + systemArchitect | `shared/api/types.ts`, `shared/api/client.ts`, `shared/api/endpoints.ts`, `shared/api/index.ts` | 💻 |
| **dbSchemaAgent** | מממש את כל שכבת הנתונים: DB connection, model/entity files (אחד לכל entity מdataArchitect), ו-migrations ראשוניים. תומך ב-Mongoose, Prisma, TypeORM, Sequelize, Drizzle. | dataArchitect + systemArchitect | `shared/db/connection.ts`, `shared/db/models/` או `shared/db/entities/` או `prisma/schema.prisma`, `shared/db/index.ts` | 💻 |

**כל squad מקבל בcontext:**
```
⚠️ MANDATORY — import from platform, do NOT duplicate:
  import { Button, Input }      from '../../shared/components/primitives';
  import { Card, EmptyState }   from '../../shared/components/composite';
  import { api }                from '../../shared/api';
  import type { User, ... }     from '../../shared/api/types';
  import { User, connect }      from '../../shared/db';
```

---

## LAYER 3 — Implementation — Squad Mode

כשקיים squadPlan, Layer 3 רץ כ-Squads במקביל (כל squad sequential פנימית).

### Squad PM Cycle (per squad)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **SquadPmSpec** | קורא את הדרישות הכלליות ואת פלטי שכבת ה-Design, ומתרגם אותם למשימות טכניות קונקרטיות עבור הצוות הספציפי: אילו endpoints לבנות, אילו מסכים, אילו models לשמש, ו-acceptance criteria לכל פיצ'ר. | דרישות + systemArchitect + dataArchitect + apiDesigner | `docs/squads/{id}-spec.md` | 📋 |
| **backendDev** | קורא את ה-spec של הצוות ומממש את הצד האחורי של הדומיין: routes, controllers, services, middleware, ו-DB queries. מייבא models מ-shared/db ו-client מ-shared/api. | systemArchitect + dataArchitect + apiDesigner + apiClientAgent + dbSchemaAgent + squad spec | `backend/src/modules/{squad}/` | 💻 |
| **frontendDev** | קורא את ה-spec של הצוות ומממש את הצד הקדמי: screens, components, hooks, ו-forms. מייבא אך ורק מ-shared/components ו-shared/api — לא יוצר קומפוננטות בסיס עצמאיות. | platform agents + frontendArchitect + uxDesignerAgent + inputPolicyAgent + squad spec | `frontend/src/{squad}/` או `mobile/src/{squad}/` | 💻 |
| **authAgent** | מממש authentication ו-authorization: JWT/session handling, login/register/logout routes, password hashing, ו-route protection middleware. | systemArchitect + apiDesigner + dataArchitect + apiClientAgent + dbSchemaAgent + inputPolicyAgent + squad spec | auth routes, middleware, guard utils | 💻 |
| **integrationAgent** *(opt)* | מממש חיבורים ל-APIs חיצוניים שצוין ה-spec: Stripe payments, Firebase, webhooks, SMS, email providers. | systemArchitect + apiDesigner + apiClientAgent + squad spec | integration services, webhook handlers | 💻 |
| **SquadPmReview** | קורא את ה-spec של הצוות ואז קורא את כל הקבצים שנכתבו. בודק: האם כל endpoint קיים? האם כל מסך מומש? האם acceptance criteria מולאו? מוציא verdict: ACCEPTED או GAPS. | squad spec + כל קבצי הsquad | `docs/squads/{id}-review.md` — VERDICT + רשימת פערים | 🔍 |

**אם GAPS:** סבב תיקון אחד → dev agents קוראים קוד קיים ומתקנים → PM Re-review.

לאחר כל הsquads, `_mergeOutputsToContext()` ממזג פלטים:
`auth:backendDev` + `listings:backendDev` → `agentOutputs['backendDev']` (Layer 4 עובד ללא שינוי)

ללא squadPlan: Layer 3 רץ parallel רגיל.

---

## LAYER 3b — Mobile Features (מקביל, אופציונלי)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **notificationsAgent** | מגדיר FCM/APNs, מממש notification service לשליחה מה-backend, ו-local reminder scheduling בצד הלקוח. | frontendDev + backendDev + integrationAgent | push notification service, local reminder utils | 💻 |
| **deepLinksAgent** | מגדיר Universal Links ו-App Links, מממש deep link handlers לכל מסך, ו-QR code utils. | frontendDev + backendDev | link config, handler router | 💻 |
| **offlineFirstAgent** | מממש persistence layer (WatermelonDB/TanStack), offline queue לבקשות שלא נשלחו, ו-sync logic כשהחיבור חוזר. | frontendDev + dataArchitect + apiDesigner | offline db config, sync service | 💻 |
| **realtimeAgent** | מוסיף Socket.io server ב-backend ו-client hooks בfrontend לעדכונים חיים: chat, live feed, real-time notifications. | backendDev + frontendDev + integrationAgent | socket server, real-time hooks | 💻 |
| **animationsAgent** | מוסיף Lottie animations, shared element transitions, ו-micro-interaction components שאין בספריית הprimitives. | frontendDev + frontendArchitect | animation components, Lottie assets | 💻 |
| **onboardingAgent** | מממש first-run experience: splash screen, onboarding flow עם slides, permission rationale dialogs, ו-empty states לראשונה. | frontendDev + frontendArchitect | onboarding screens, permission handlers | 💻 |
| **monetizationAgent** | מממש RevenueCat integration, IAP flows (subscriptions + one-time), ו-paywall screens. | frontendDev + backendDev + integrationAgent | IAP service, subscription screens | 💻 |
| **mlMobileAgent** | מגדיר ML Kit / TFLite, מממש utilities ל-OCR, face detection, image classification, ו-on-device translation. | frontendDev + systemArchitect | ML utilities, model files | 💻 |
| **arVrAgent** | מגדיר ARKit/ARCore, מממש 3D object placement components ו-AR session management. | frontendDev + systemArchitect | AR components, 3D utils | 💻 |
| **widgetsExtensionsAgent** | מממש home screen widgets (iOS/Android), Apple Watch extension, ו-Share extension. | frontendDev | widget targets, extension code | 💻 |
| **otaUpdatesAgent** | מגדיר Expo EAS Update או CodePush, מממש update check logic ו-rollback handling. | frontendDev + devops | OTA config, update service | 💻 + ⚙️ |

---

## LAYER 3c — Web Features (מקביל, אופציונלי)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **responsiveDesignAgent** | מוסיף mobile-first CSS breakpoints, fluid typography, responsive image components, ו-container queries לכל מסך קיים. | frontendArchitect + frontendDev | responsive styles, layout components | 💻 |
| **pwaAgent** | מגדיר Service Worker עם offline cache strategy, Web App Manifest, ו-install prompt component. | frontendDev + frontendArchitect | SW config, manifest, install prompt | 💻 + ⚙️ |
| **webMonetizationAgent** | מממש Stripe Billing: checkout session, customer portal, webhook handler לacronyms subscription events, ו-feature gating per plan. | backendDev + frontendDev + dataArchitect + apiDesigner | Stripe integration, billing screens | 💻 |
| **cmsAgent** | מזהה כל hardcoded text בקוד, מגדיר CMS (Payload CMS לNext.js / Strapi לאחרים), מייצר contentService ו-useContent() hook, seed data, ו-**`docs/cms-migration.md`** — מפת החלפה. | frontendDev + backendDev + systemArchitect | CMS config, content service, migration plan | 💻 + 📋 |

---

## LAYER 3d — CMS Integration (רצף, אופציונלי)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **cmsIntegratorAgent** | קורא את `docs/cms-migration.md` ואז עובר על כל קובץ component בפרויקט. מחשב את ה-relative import path לפי עומק הקובץ ומחליף כל hardcoded string ב-`t('key', 'fallback')`. משנה קבצים קיימים בלבד — לא יוצר קבצים חדשים. | cmsAgent output + כל קבצי הcomponents | עדכון in-place לכל קובץ component | 💻 (משנה קיים) |

---

## LAYER 3e — Error Handling (רצף, תמיד רץ)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **errorHandlingAgent** | קורא את כל route files ו-package.json, ואז מוסיף שכבת error handling אחידה לכל הפרויקט: Express global error middleware, asyncHandler wrapper, httpErrors, React ErrorBoundary, ו-API client error interceptors. עושה תיקון surgical — לא מחליף קבצים שלמים. | backendDev + frontendDev + authAgent | עדכון in-place לroutes קיימים + קבצי error חדשים | 💻 (מעדכן קיים + יוצר חדש) |

---

## LAYER 3f — Code Refinement (רצף, תמיד רץ)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **codeDeduplicationAgent** | קורא את כל קבצי הפרויקט, מזהה לוגיקה/קומפוננטות/hooks כפולים בין squads, מחלץ אותם ל-`shared/utils/`, ומעדכן את כל ה-importers כולל test files. חייב לראות את כל הקוד — לכן גלובלי ולא per-squad. | backendDev + frontendDev + authAgent + errorHandlingAgent | `shared/utils/` + עדכון imports בכל קבצים קיימים | 💻 (מעדכן קיים + יוצר חדש) |
| **codeCleanupAgent** | קורא את כל הקבצים אחרי ה-deduplication ומסיר: unused imports, dead code, console.log, commented-out blocks, debugger statements. לא מוסיף פונקציונליות — רק מנקה. | codeDeduplicationAgent | עדכון in-place לכל קבצים קיימים | 💻 (מעדכן קיים) |

---

## LAYER 4 — Quality (מקביל, parallel)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **testWriter** | כותב unit tests ו-integration tests לכל module: בודק happy path, edge cases, ו-error cases. משתמש ב-Jest/Vitest/Playwright לפי ה-tech stack. | backendDev + frontendDev + authAgent + dataArchitect | `*.test.ts` / `*.spec.ts` לצד כל module | 💻 |
| **security** | סורק את הקוד לחולשות: XSS, SQL injection, CSRF, IDOR, exposed secrets, insecure JWT, ו-missing rate limiting. מוציא דוח ממוקד עם המלצות תיקון. | backendDev + authAgent + apiDesigner | `docs/security-report.md` | 🔍 |
| **reviewer** | בודק איכות קוד כוללת: bugs פוטנציאליים, anti-patterns, קבצים חסרים, error handling שגוי, ו-missing validation. | backendDev + frontendDev + authAgent + integrationAgent | `docs/code-review.md` | 🔍 |
| **performanceAgent** *(opt)* | מנתח startup time, memory leaks, ו-60fps bottlenecks באפליקציית מובייל. | frontendDev + frontendArchitect | `docs/performance-report.md` | 🔍 |
| **webPerformanceAgent** *(opt)* | מנתח Core Web Vitals (LCP/CLS/INP), bundle size, ו-code splitting opportunities באפליקציית ווב. | frontendDev + frontendArchitect + renderingStrategyAgent | `docs/web-performance-report.md` | 🔍 |
| **accessibilityAgent** *(opt)* | בודק WCAG 2.1: VoiceOver/TalkBack labels, keyboard navigation, ARIA attributes, ו-color contrast ratios. | frontendDev | `docs/accessibility-report.md` | 🔍 |
| **loadTestingAgent** *(opt)* | כותב k6 scripts לload/stress/soak testing של ה-backend endpoints. | backendDev + apiDesigner + devops | `k6/` — test scripts | 💻 |
| **dependencyManagementAgent** *(opt)* | מריץ npm audit, בודק licenses, ו-מדווח על packages מיושנים עם CVEs. | frontendDev + backendDev | `docs/dependency-report.md` | 🔍 |
| **userTestingAgent** *(opt)* | מגדיר TestFlight / Firebase App Distribution, כותב usability test scripts, ו-A/B test setup. | frontendDev + backendDev | `docs/user-testing-plan.md` | 📋 |
| **privacyEthicsAgent** *(opt)* | בודק GDPR/CCPA compliance: cookie consent, data retention policies, ו-data export/deletion endpoints. | backendDev + frontendDev + analyticsMonitoring | `docs/privacy-report.md` | 🔍 |

---

## LAYER 4b — Test Run (רצף)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **testRunner** | מריץ `npm install` ואז את כל ה-test suite (jest/vitest/playwright) עם `\|\| true` כדי שלא ייפול. אוסף output מלא וכיסוי per-file. גישה בלעדית ל-shell. | testWriter + קבצי קוד | `docs/test-results.md` — output מלא + coverage | 🔍 |

---

## LAYER 4c — Test Fix (רצף)

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **testFixer** | קורא את `test-results.md` ולכל כישלון קורא את קובץ ה-test וקובץ ה-source. אם הטסט שגוי — מתקן את הטסט. אם הקוד שגוי — מתקן את הקוד. לא כותב טסטים חדשים. | test-results.md | תיקונים in-place לקבצי test או source | 💻 (מעדכן קיים) |

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

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **devops** | מגדיר את תשתית ה-deployment: Dockerfile, docker-compose, GitHub Actions CI/CD pipeline, nginx config, ו-environment variables setup. | systemArchitect + backendDev + frontendDev | `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `nginx.conf` | ⚙️ |
| **documentation** | כותב תיעוד מלא לפרויקט: README עם setup guide, API reference לכל endpoint, CONTRIBUTING guide, ו-environment variables table. | requirementsAnalyst + apiDesigner + backendDev + frontendDev + devops | `README.md`, `docs/api-reference.md`, `docs/setup-guide.md`, `CONTRIBUTING.md` | 📋 |
| **analyticsMonitoring** *(opt)* | מגדיר Sentry לcrash reporting, GA4/Plausible לanalytics, RUM, ו-feature flag utils. | frontendDev + backendDev | Sentry config, analytics setup, feature flag utils | 💻 + ⚙️ |
| **seoAgent** *(opt)* | מוסיף meta tags, Open Graph, JSON-LD structured data, `sitemap.xml`, `robots.txt`, ו-canonical URLs לכל page. | frontendDev + renderingStrategyAgent + frontendArchitect | SEO components, sitemap, robots | 💻 |
| **appStorePublisher** *(opt)* | מגדיר Fastlane לautomated builds, code signing, App Store Connect + Google Play setup, ו-release checklist. | systemArchitect + frontendDev + devops | Fastlane config, signing scripts, `docs/release-checklist.md` | ⚙️ + 📋 |
| **asoMarketingAgent** *(opt)* | כותב App Store Optimization: keywords research, store listing copy, ו-screenshot strategy. | requirementsAnalyst | `docs/store-listing.md` | 📋 |

---

## PM Acceptance Review

| Agent | משימה | קלט | פלט | סוג |
|-------|-------|-----|-----|-----|
| **pmReviewer** | קורא את כל קבצי הפרויקט ובודק coverage מלא מול הדרישות המקוריות: האם כל user story מומש? האם כל קריטריון קבלה מולא? מוציא verdict כולל עם רשימת פערים אם קיימים. | כל agent outputs (קורא קבצים ישירות) | `docs/pm-review.md` — ✅/⚠️/❌ לכל דרישה + **VERDICT: ACCEPTED / NEEDS_FIXES** | 🔍 |

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
    Phase 1: SquadPmSpec   → docs/squads/{id}-spec.md          📋
    Phase 2: dev agents    → backend/src/modules/{squad}/       💻
                             frontend/src/{squad}/              💻
    Phase 3: SquadPmReview → docs/squads/{id}-review.md        🔍
    Phase 4: if GAPS → fix round → re-review

_mergeOutputsToContext(): auth:backendDev + listings:backendDev → agentOutputs['backendDev']
```

### שלב 3 — Update Mode (updatePlanner.js + orchestrateUpdate)
```
analyzeUpdate(changeRequest, existingSquadPlan) → {
  affectedSquads:  [{ id, changeDescription }],
  newSquads:       [{ ...squad schema }],
  platformUpdates: {
    uiPrimitives: "..." | null,   ← רץ uiPrimitivesAgent בUpdate mode
    uiComposite:  "..." | null,   ← רץ uiCompositeAgent בUpdate mode
    apiClient:    "..." | null,   ← רץ apiClientAgent בUpdate mode
    dbSchema:     "..." | null    ← רץ dbSchemaAgent בUpdate mode
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
| סה"כ agents | ~60 |
| agents שמייצרים קוד (💻) | ~40 |
| agents שמייצרים מסמכי הנחיות (📋) | ~12 |
| agents שמייצרים דוחות/ניתוח (🔍) | ~10 |
| agents שמייצרים קונפיג (⚙️) | ~5 |
| agents שמשנים קבצים קיימים | cmsIntegratorAgent, errorHandlingAgent, codeDeduplicationAgent, codeCleanupAgent, testFixer |
| מודל לפיתוח | Claude Opus 4.7 (timeout: 20 דקות) |
| מודל לתכנון | Claude Sonnet 4.6 (timeout: 10 דקות) |
| מקסימום סבבי Quality Fix | 2 |
| מקסימום סבבי PM Fix | 2 |
| agents עם גישת shell | testRunner, devops |
| checkpoint | אחרי כל layer — local + GitHub push |
