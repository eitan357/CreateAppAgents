# ארכיטקטורה מלאה — App Builder Multi-Agent System

---

## שלב 0 — הכנה (index.js)

```
┌─────────────────────────────────────────────────────────────┐
│  1. בחירת מצב הזנת דרישות                                   │
│     [מצב 1] planner.js — שיחה אינטראקטיבית עם Sonnet 4.6   │
│     [מצב 2] הזנה ידנית — המשתמש מקליד את הדרישות בעצמו     │
├─────────────────────────────────────────────────────────────┤
│  2. הגדרת GitHub Repository                                  │
│     • המשתמש מזין owner/repo (או URL מלא / SSH)             │
│     • GITHUB_TOKEN נקרא מ-env                               │
│     • checkGithubAccess() — בדיקת קיום + הרשאות push        │
│     • אם לא קיים — הצעה ליצור repo חדש (ציבורי/פרטי)       │
├─────────────────────────────────────────────────────────────┤
│  3. המשתמש מאשר את מסמך הדרישות                            │
├─────────────────────────────────────────────────────────────┤
│  4. בחירת רמת איכות / עלות        setModelConfig() → base.js│
│     1️⃣  חסכוני  — ללא thinking, max 4K tokens               │
│     2️⃣  מאוזן   — adaptive thinking, max 6K tokens          │
│     3️⃣  מקסימלי — adaptive thinking, max 8K tokens          │
├─────────────────────────────────────────────────────────────┤
│  5. designPicker.js (אופציונלי)                             │
│     Sonnet מייצר 3 עיצובים (צבעים, טיפוגרפיה, סגנון)       │
│     המשתמש בוחר ומשכלל בשיחה — העיצוב נוסף למסמך הדרישות  │
└─────────────────────────────────────────────────────────────┘
```

---

## שלב 1 — יצירת תוכנית (orchestrator.js)

```
createPlan() — Sonnet 4.6, max 2.5K tokens
  קורא דרישות → JSON plan: tech stack, agents per layer, optional agents, file estimate
               ↓  approval gate
createSquadPlan() — Sonnet 4.6
  מחלק את האפליקציה לצוותים עצמאיים לפי דומיינים
               ↓  approval gate
ProjectContext נוצר
  (requirements, plan, squadPlan, outputDir, agentOutputs, feedbackNotes)
```

---

## LAYER 1 — Discovery (רצף, sequential)

| Agent | תפקיד |
|-------|--------|
| **requirementsAnalyst** | PRD מפורט: user stories, קריטריוני קבלה, edge cases, הגדרת MVP |
| **systemArchitect** | ארכיטקטורת מערכת: monolith/microservices, MVC/Repository, flow בין שכבות |
| **mobileTechAdvisor** *(אופציונלי)* | framework למובייל (RN/Expo/Flutter), קונפיגורציה, ניהול state |
| **webTechAdvisor** *(אופציונלי)* | framework לweb (Next.js/Nuxt/Vite), TypeScript, monorepo, ESLint/Prettier |
| **businessPlanningAgent** *(אופציונלי)* | עלויות, MVP scope, מודל עסקי, roadmap שחרור |

---

## LAYER 2 — Design (מקביל, parallel)

| Agent | תפקיד |
|-------|--------|
| **dataArchitect** | סכמות DB, relations, indexes, migrations |
| **apiDesigner** | RESTful API endpoints, request/response shapes, auth flows |
| **frontendArchitect** | routing, state mgmt, folder structure |
| **renderingStrategyAgent** *(אופציונלי, web)* | CSR/SSR/SSG/ISR לכל route, App Router, middleware.ts |
| **uxDesignerAgent** *(אופציונלי)* | user flows, ASCII wireframes, empty/error/loading states, UX copy |
| **designSystemAgent** *(אופציונלי)* | design tokens, Button/Input/Modal/Toast, dark mode, Storybook |
| **localizationAgent** *(אופציונלי)* | i18n תשתית, קבצי תרגום (en/he/ar), RTL support, date/currency |

> `frontendDev` תלוי ב-`localizationAgent` — בונה קומפוננטות עם i18n hooks מהיום הראשון.

---

## LAYER 3 — Implementation (Squad Mode)

כאשר squadPlan קיים, Layer 3 רץ ב-**Squad Mode** במקום parallel רגיל:

```
runAllSquads() — כל squad רץ במקביל לשאר הsquads
  └─ runSquad(squad):
       Phase 1: SquadPmSpec → כותב docs/squads/{id}-spec.md
                (endpoints, data models, screens, acceptance criteria)
       Phase 2: dev agents (backendDev → frontendDev → authAgent?)
                כל agent כותב רק תחת backend/src/modules/{squad}/
                                          frontend/src/{squad}/
       Phase 3: SquadPmReview → קורא spec + כל קבצי הsquad
                → VERDICT: ACCEPTED / GAPS
       Phase 4: אם GAPS → סבב תיקון אחד (Phase 2 מחדש) → PM Re-review
```

**Squad Eligible Agents:** `backendDev`, `frontendDev`, `authAgent`, `integrationAgent`

לאחר כל הsquads, `_mergeOutputsToContext()` ממזג את הפלטים:
- `auth:backendDev` + `listings:backendDev` → `backendDev` (key אחד)
- Layer 4 agents משתמשים ב-DEPENDENCY_MAP הרגיל — ללא שינוי

ללא squadPlan: Layer 3 רץ parallel רגיל (`backendDev`, `frontendDev`, `authAgent`, `integrationAgent`).

---

## LAYER 3b — Mobile Features (מקביל, אופציונלי)

| Agent | תפקיד |
|-------|--------|
| **notificationsAgent** | push notifications, FCM/APNs, local reminders |
| **deepLinksAgent** | Universal Links, QR codes, sharing URLs |
| **offlineFirstAgent** | sync ללא אינטרנט, WatermelonDB, persistence |
| **realtimeAgent** | WebSockets, Socket.io, live updates, chat |
| **animationsAgent** | Lottie, shared transitions, micro-interactions |
| **onboardingAgent** | splash, first-run, permission rationale, empty states |
| **monetizationAgent** | in-app purchases, subscriptions (RevenueCat), ads |
| **mlMobileAgent** | OCR, face detection, translation (ML Kit / TFLite) |
| **arVrAgent** | ARKit/ARCore, 3D object placement |
| **widgetsExtensionsAgent** | home screen widgets, Apple Watch, Share extensions |
| **otaUpdatesAgent** | Expo EAS Update / CodePush, ללא App Store review |
| **cmsAgent** *(mobile)* | Strapi + AsyncStorage cache, contentService, useContent() hook |

---

## LAYER 3c — Web Features (מקביל, אופציונלי)

| Agent | תפקיד |
|-------|--------|
| **responsiveDesignAgent** | mobile-first CSS, breakpoints, fluid typography, container queries |
| **pwaAgent** | Service Worker, manifest, offline support, install prompt |
| **webMonetizationAgent** | Stripe Billing, checkout, customer portal, webhooks, feature gating |
| **cmsAgent** *(web)* | Payload CMS / Strapi, contentService, useContent() hook, seed data, cms-migration.md |

---

## LAYER 3d — CMS Integration (רצף, אופציונלי)

| Agent | תפקיד |
|-------|--------|
| **cmsIntegratorAgent** | קורא cms-migration.md + כל קבצי הcomponents, מחשב relative import path לפי עומק הקובץ (או path alias מtsconfig), מחליף כל hardcoded string ב-`t('key', 'fallback')` |

> **תנאי:** דורש `cmsAgent` שרץ לפניו.

---

## LAYER 3e — Error Handling (רצף, תמיד רץ)

| Agent | תפקיד |
|-------|--------|
| **errorHandlingAgent** | קורא את כל route files + package.json לפני כתיבה. מוסיף: Express global error middleware, asyncHandler wrapper, httpErrors, React ErrorBoundary, globalErrorHandlers, apiClient עם interceptors. תיקון surgical — לא מחליף קבצים שלמים. |

---

## LAYER 3f — Code Refinement (רצף, תמיד רץ)

| Agent | תפקיד |
|-------|--------|
| **codeDeduplicationAgent** | קורא את כל קבצי הקוד + tests + tsconfig. מזהה לוגיקה/קומפוננטות/hooks כפולים, מחלץ ל-shared modules, מעדכן את כל ה-importers (כולל test files). |
| **codeCleanupAgent** | קורא את כל הקבצים (כולל config + tests) לפני החלטה. מסיר: unused imports, dead code, console.log, commented-out blocks, debugger statements. |

---

## LAYER 4 — Quality (מקביל, parallel)

| Agent | תפקיד |
|-------|--------|
| **testWriter** | קורא קוד מקור, מזהה אזורים לא מכוסים, כותב טסטים (jest/vitest/playwright/cypress) |
| **security** | מוצא חורי אבטחה (XSS, SQLi, CSRF, IDOR), כותב security-report.md |
| **reviewer** | code review: bugs, anti-patterns, missing files, quality issues |
| **performanceAgent** *(אופציונלי)* | מובייל: startup time, memory leaks, 60fps |
| **webPerformanceAgent** *(אופציונלי)* | Core Web Vitals (LCP/CLS/INP), bundle analysis, Lighthouse CI |
| **accessibilityAgent** *(אופציונלי)* | VoiceOver/TalkBack, WCAG 2.1, color contrast, ARIA |
| **loadTestingAgent** *(אופציונלי)* | k6 scripts לבדיקות עומס/stress/soak |
| **dependencyManagementAgent** *(אופציונלי)* | npm audit, CVEs, licenses, bundle size |
| **userTestingAgent** *(אופציונלי)* | TestFlight, Firebase Distribution, A/B testing, usability scripts |
| **privacyEthicsAgent** *(אופציונלי)* | GDPR/CCPA, cookie consent, data deletion endpoints |

---

## LAYER 4b — Test Run (רצף)

| Agent | תפקיד |
|-------|--------|
| **testRunner** | מריץ `npm install` + כל סוויטות הטסטים עם `\|\| true`. כותב `test-results.md` עם output מלא + כיסוי לפי קובץ. **בעל גישת shell בלעדי.** |

---

## LAYER 4c — Test Fix (רצף)

| Agent | תפקיד |
|-------|--------|
| **testFixer** | קורא `test-results.md`. לכל כישלון: **Case A** — הטסט שגוי → מתקן טסט. **Case B** — קוד המקור שגוי → מתעד ל-dev agents. |

---

## 🔄 Quality Fix Loop (עד 2 סבבים)

```
לאחר Layer 4c:

  אם נמצאו בעיות:
    approval gate → "להריץ סבב תיקונים?"

    backendDev + frontendDev + authAgent
      קוראים ממצאים (feedbackNotes) ומתקנים
      (context injection מדולג — רק ממצאים, חוסך 5-15K tokens)

    Layer 4 → 4b → 4c מחדש (Quality Re-check)
    approval gate → הצגת תוצאות

    אם עדיין יש בעיות — סבב נוסף (עד max 2)
    אם הכל תקין — ממשיכים לLayer 5
```

---

## LAYER 5 — Operations (מקביל, parallel) — ללא approval gate

| Agent | תפקיד |
|-------|--------|
| **devops** | Docker, CI/CD (GitHub Actions), Nginx, deployment scripts. גישת shell. |
| **documentation** | README, API docs, setup guide, arch docs, contributing guide |
| **analyticsMonitoring** *(אופציונלי)* | Sentry, GA4/Plausible, RUM, feature flags |
| **seoAgent** *(אופציונלי)* | meta tags, Open Graph, JSON-LD, sitemap.xml, robots.txt |
| **appStorePublisher** *(אופציונלי)* | App Store Connect, Google Play, Fastlane, code signing |
| **asoMarketingAgent** *(אופציונלי)* | keywords, store listing copy, screenshot strategy |

---

## PM Acceptance Review

```
pmReviewer
  קורא את כל הקבצים שנוצרו
  בודק כל דרישה מול המימוש בפועל
  כותב pm-review.md עם ✅/⚠️/❌ לכל דרישה
  מסיים ב: VERDICT: ACCEPTED / NEEDS_FIXES
```

---

## 🔴 PM Fix Loop (עד 2 סבבים)

```
אם NEEDS_FIXES:
  approval gate → "להריץ סבב תיקוני PM?"

  backendDev + frontendDev + authAgent
    קוראים ממצאי PM (pmFeedbackNotes) ומשלימים את החסר

  Quality Re-run: Layer 4 → 4b → 4c
  PM Review Re-run

  אם ACCEPTED — יציאה מהלופ
  אם עדיין NEEDS_FIXES — סבב נוסף (עד max 2)

✅  BUILD COMPLETE
```

---

## 🏢 Squad System (3 שלבים)

### שלב 1 — Squad Planner (squadPlanner.js)

```javascript
createSquadPlan(requirements, plan)
  // Sonnet 4.6, JSON output
  // Returns: { squads: [...], platformNotes: "..." }
```

כל squad כולל: `id`, `name`, `description`, `userFacingArea`,
`backendModule`, `frontendModule`, `keyFeatures`, `agents`

**גודל:** 2-3 squads לאפליקציות קטנות, 3-5 בינוני, 5-6 גדול (כמו Yad2)

### שלב 2 — Squad Runner (squadRunner.js)

```
runAllSquads() — כל squads במקביל
  runSquad(squad):
    Phase 1: SquadPmSpec — כותב docs/squads/{id}-spec.md
    Phase 2: _runDevAgents() — בונה את הפיצ'רים
    Phase 3: _runPmReview() → ACCEPTED / GAPS
    Phase 4: אם GAPS → fix round → re-review

_mergeOutputsToContext():
  ממזג לפי סוג agent כדי שLayer 4 יעבוד ללא שינוי
  auth:backendDev + listings:backendDev → agentOutputs['backendDev']
```

### שלב 3 — Squad PM Ownership (squadPmAgent.js)

**SquadPmSpec:** כותב spec מלא לפני פיתוח:
- API endpoints + request/response schemas
- Data models
- Screens + states (loading/error/empty/success)
- Acceptance criteria (testable)
- Edge cases

**SquadPmReview:** קורא spec + כל קבצי הsquad:
- `VERDICT: ACCEPTED` — כל הקריטריונים מומשו
- `VERDICT: GAPS` — מפרט בדיוק מה חסר + באיזה קובץ

---

## 🐙 GitHub Integration (github.js)

```
parseGithubRepo(input)      → { owner, repo, full }
  תומך ב: owner/repo | https://github.com/... | git@github.com:...

checkGithubAccess(owner, repo, token)
  → { exists, canPush, private }

createGithubRepo(repoName, token, isPrivate)
  → יוצר repo חדש דרך GitHub API

pushCheckpoint(outputDir, owner, repo, token, layerLabel)
  → non-fatal: מחזיר { success, error } — לא מפיל את הbuild

pushToGithub(outputDir, owner, repo, token)
  → throws on failure — נקרא בסוף הbuild

_gitSetup(run, remoteUrl)   → init + identity + branch + remote (shared)
```

---

## 💾 Checkpoint System

```
saveCheckpoint(layerLabel)  ← נקרא אחרי כל layer
  context.saveCheckpoint()  → .build-checkpoint.json (local)
  pushCheckpoint()          → GitHub push (non-fatal)

context.saveCheckpoint() שומר:
  requirements, plan, squadPlan,
  agentOutputs, allFilesCreated, completedLayers

המשך מcheckpoint (index.js):
  ProjectContext.fromCheckpoint(checkpoint)
  layers שהושלמו → מדולגים אוטומטית
  layers שלא הושלמו → רצים כרגיל
```

---

## תשתית משותפת

| מודול | תפקיד |
|-------|--------|
| **base.js** | `BaseAgent` — model: Opus 4.7, thinking + max_tokens לפי tier. timeout: 20 דקות לכל API call. |
| **context.js** | `ProjectContext` — state משותף. `buildScopedContext()`, `buildSquadScopedContext()`, `buildSquadPmSpecContext()`, `buildSquadPmReviewContext()`. בסבבי תיקון — מדלג על dependencies, מזריק רק ממצאים (חוסך 5-15K tokens). |
| **agentDependencies.js** | DEPENDENCY_MAP — מה כל agent "רואה" מה-agents הקודמים. |
| **layerRunner.js** | `runLayerInParallel` / `runLayerSequential` — מריץ קבוצת agents, retry x2 לכל agent. |
| **squadRunner.js** | `runAllSquads` / `runSquad` — Squad mode עם PM spec/review cycle. |
| **squadPlanner.js** | `createSquadPlan` — Sonnet 4.6 מחלק לצוותים. |
| **tools/fileSystem.js** | `read_file` / `write_file` / `list_files` — לכל ה-agents. |
| **tools/shell.js** | `run_command` — לtestRunner ו-devops בלבד. |
| **approval.js** | approval gates בין layers — המשתמש יכול לעצור / לאשר בכל שלב. |
| **github.js** | חיבור ל-GitHub: validation, repo creation, checkpoint push, final push. |

---

## סיכום מספרים

| | |
|-|-|
| סה"כ agents | ~55 |
| agents חובה | ~13 (כולל errorHandlingAgent, codeDeduplicationAgent, codeCleanupAgent) |
| agents אופציונליים | ~42 |
| מודל לפיתוח | Claude Opus 4.7 (timeout: 20 דקות) |
| מודל לתכנון | Claude Sonnet 4.6 (timeout: 10 דקות) |
| מקסימום סבבי Quality Fix | 2 |
| מקסימום סבבי PM Fix | 2 |
| agents עם גישת shell | testRunner, devops |
| checkpoint | אחרי כל layer — local + GitHub push |
| Squad PM cycle | spec → dev → review → fix (per squad) |



