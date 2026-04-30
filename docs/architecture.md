# ארכיטקטורה מלאה — App Builder Multi-Agent System

---

## שלב 0 — הכנה (index.js)

```
┌─────────────────────────────────────────┐
│        בחירת מצב הזנת דרישות           │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
[מצב 1]             [מצב 2]
planner.js          הזנה ידנית
──────────          ─────────
שיחה אינטראקטיבית   המשתמש מקליד
עם Sonnet 4.6       את הדרישות
(multi-turn).       בעצמו.
שואל שאלות על
פלטפורמה, פיצ׳רים,
קהל, עיצוב וכו׳.
מייצר מסמך דרישות.
     │                   │
     └─────────┬─────────┘
               ▼
┌──────────────────────────────────┐
│   המשתמש מאשר את מסמך הדרישות  │
└──────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│   בחירת רמת איכות / עלות        │
│                                  │
│  1️⃣  חסכוני  — ללא thinking,     │
│      max 4K tokens               │
│  2️⃣  מאוזן   — adaptive thinking,│  ← setModelConfig() → base.js
│      max 6K tokens               │
│  3️⃣  מקסימלי — adaptive thinking,│
│      max 8K tokens               │
└──────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│   designPicker.js (אופציונלי)    │
│                                  │
│  Sonnet מייצר 3 עיצובים שונים   │
│  (צבעים, טיפוגרפיה, סגנון).     │
│  המשתמש בוחר ויכול לשכלל        │
│  בשיחה עם AI. העיצוב נוסף        │
│  למסמך הדרישות.                  │
└──────────────────────────────────┘
```

---

## שלב 1 — יצירת תוכנית (orchestrator.js)

```
┌──────────────────────────────────────────────┐
│   createPlan()  — Sonnet 4.6, max 1.5K      │
│                                              │
│  קורא את הדרישות ומייצר JSON plan:          │
│  • tech stack (backend/frontend/db/auth)     │
│  • אילו agents לכלול בכל layer              │
│  • אילו optional agents נדרשים              │
│  • הערכת מספר קבצים                         │
└──────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  המשתמש מאשר את התוכנית        │
│  (approval gate — ניתן לדחות)   │
└──────────────────────────────────┘
               │
               ▼
  ProjectContext נוצר
  (requirements, plan, outputDir,
   agentOutputs, feedbackNotes)
```

---

## LAYER 1 — Discovery (רצף, sequential)

| Agent | תפקיד |
|-------|--------|
| **requirementsAnalyst** | מנתח דרישות → מסמך PRD מפורט עם user stories, קריטריוני קבלה, edge cases, הגדרת MVP |
| **systemArchitect** | מחליט על ארכיטקטורת המערכת: monolith/microservices, patterns (MVC/Repository), flow בין שכבות |
| **mobileTechAdvisor** *(אופציונלי)* | בוחר framework למובייל (RN/Expo/Flutter), קונפיגורציה, ניהול state |
| **webTechAdvisor** *(אופציונלי)* | בוחר framework לweb (Next.js/Nuxt/Vite), TypeScript, monorepo, ESLint/Prettier/Husky |
| **businessPlanningAgent** *(אופציונלי)* | הערכת עלויות, MVP scope, מודל עסקי, roadmap שחרור |

---

## LAYER 2 — Design (מקביל, parallel)

| Agent | תפקיד |
|-------|--------|
| **dataArchitect** | סכמות DB, relations, indexes, migrations |
| **apiDesigner** | RESTful API endpoints, request/response shapes, auth flows |
| **frontendArchitect** | ארכיטקטורת frontend: routing, state mgmt, folder structure |
| **renderingStrategyAgent** *(אופציונלי, web)* | CSR/SSR/SSG/ISR לכל route, App Router, middleware.ts |
| **uxDesignerAgent** *(אופציונלי)* | user flows, wireframes ASCII לכל מסך, empty/error/loading states, UX copy |
| **designSystemAgent** *(אופציונלי)* | design tokens, Button/Input/Modal/Toast, dark mode, Storybook |
| **localizationAgent** *(אופציונלי)* | i18n תשתית, קבצי תרגום (en/he/ar), RTL support, date/currency לפי locale |

> `frontendDev` תלוי ב-`localizationAgent` — מבנה הקומפוננטות כולל i18n מהיום הראשון.

---

## LAYER 3 — Implementation (מקביל, parallel)

| Agent | תפקיד |
|-------|--------|
| **backendDev** | שרת, routes, controllers, services, middleware, DB queries |
| **frontendDev** | מסכים, קומפוננטות, hooks, forms, navigation |
| **authAgent** | JWT/sessions, login/register/logout, middleware הגנת routes |
| **integrationAgent** *(אופציונלי)* | Stripe, Firebase, webhooks, third-party APIs |

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

---

## LAYER 3c — Web Features (מקביל, אופציונלי)

| Agent | תפקיד |
|-------|--------|
| **responsiveDesignAgent** | mobile-first CSS, breakpoints, fluid typography, container queries |
| **pwaAgent** | Service Worker, manifest, offline support, install prompt |
| **webMonetizationAgent** | Stripe Billing, checkout, customer portal, webhooks, feature gating |

---

## LAYER 4 — Quality (מקביל, parallel)

| Agent | תפקיד |
|-------|--------|
| **testWriter** | קורא קוד מקור, מזהה אזורים לא מכוסים, כותב טסטים חדשים לפני הריצה |
| **security** | מוצא חורי אבטחה (XSS, SQLi, CSRF, IDOR), כותב security-report.md |
| **reviewer** | code review: bugs, anti-patterns, missing files, quality issues |
| **performanceAgent** *(אופציונלי)* | מובייל: startup time, memory leaks, 60fps |
| **webPerformanceAgent** *(אופציונלי)* | Core Web Vitals (LCP/CLS/INP), bundle analysis, Lighthouse CI |
| **accessibilityAgent** *(אופציונלי)* | VoiceOver/TalkBack, WCAG 2.1, color contrast |
| **loadTestingAgent** *(אופציונלי)* | k6 scripts לבדיקות עומס/stress/soak |
| **dependencyManagementAgent** *(אופציונלי)* | npm audit, CVEs, licenses, bundle size |
| **userTestingAgent** *(אופציונלי)* | TestFlight, Firebase Distribution, A/B testing, usability scripts |
| **privacyEthicsAgent** *(אופציונלי)* | GDPR/CCPA, cookie consent, data deletion endpoints |

---

## LAYER 4b — Test Run (sequential)

| Agent | תפקיד |
|-------|--------|
| **testRunner** | מריץ `npm install` + כל סוויטות הטסטים (jest/vitest/playwright/cypress) עם `\|\| true`. כותב `test-results.md` עם output מלא + כיסוי לפי קובץ. **בעל גישת shell בלעדי.** |

---

## LAYER 4c — Test Fix (sequential)

| Agent | תפקיד |
|-------|--------|
| **testFixer** | קורא `test-results.md`. לכל כישלון קורא קובץ הטסט + קובץ מקור. **Case A** — הטסט שגוי: מתקן את קובץ הטסט. **Case B** — קוד המקור שגוי: מתעד ל-dev agents. |

---

## 🔄 Quality Fix Loop (עד 2 סבבים)

```
אם נמצאו בעיות:

  backendDev + frontendDev + authAgent
    קוראים את הממצאים ומתקנים.
    (ללא הזרקת dependencies מחדש — רק דרישות + ממצאים)

  ↓  Quality Re-run: Layer 4 → 4b → 4c  ↓

  אם עדיין יש בעיות — סבב נוסף (עד max).
  אם הכל תקין — ממשיכים ל-Layer 5.
```

---

## LAYER 5 — Operations (מקביל, parallel)

| Agent | תפקיד |
|-------|--------|
| **devops** | Docker, CI/CD (GitHub Actions), Nginx, deployment scripts |
| **documentation** | README, API docs, setup guide, arch docs, contributing guide |
| **analyticsMonitoring** *(אופציונלי)* | Sentry, GA4/Plausible, RUM, feature flags |
| **seoAgent** *(אופציונלי)* | meta tags, Open Graph, JSON-LD, sitemap.xml, robots.txt |
| **appStorePublisher** *(אופציונלי)* | App Store Connect, Google Play, Fastlane, code signing |
| **asoMarketingAgent** *(אופציונלי)* | keywords, store listing copy, screenshot strategy |

---

## PM Acceptance Review

```
┌──────────────────────────────────────────────┐
│  pmReviewer                                  │
│                                              │
│  קורא את כל הקבצים שנוצרו.                   │
│  בודק כל דרישה מול המימוש בפועל.             │
│  כותב pm-review.md עם ✅/⚠️/❌ לכל דרישה.   │
│  מסיים ב: VERDICT: ACCEPTED / NEEDS_FIXES    │
└──────────────────────────────────────────────┘
```

---

## 🔴 PM Fix Loop (עד 2 סבבים)

```
אם NEEDS_FIXES:

  backendDev + frontendDev + authAgent
    קוראים ממצאי PM ומשלימים את החסר.

  ↓  Quality Re-run: Layer 4 → 4b → 4c  ↓
  ↓  PM Review Re-run                    ↓

  אם ACCEPTED — יציאה מהלופ.
  אם עדיין NEEDS_FIXES — סבב נוסף (עד max).

✅  BUILD COMPLETE — הדפסת רשימת כל הקבצים שנוצרו
```

---

## תשתית משותפת

| מודול | תפקיד |
|-------|--------|
| **base.js** | כל agent יורש מ-`BaseAgent`. model: Opus 4.7, thinking ו-max_tokens לפי tier שבחר המשתמש. |
| **context.js** | `ProjectContext` — state משותף בין כל ה-agents. כולל: requirements, plan, agentOutputs, feedbackNotes, pmFeedbackNotes. `buildScopedContext()` מזריק לכל agent רק את ה-dependencies הרלוונטיות לו. בסבבי תיקון — מדלג על dependencies, מזריק רק ממצאים. |
| **agentDependencies.js** | מפה של מה כל agent "רואה" מה-agents שרצו לפניו (context injection). |
| **layerRunner.js** | `runLayerInParallel` / `runLayerSequential` — מריץ קבוצת agents ומחכה לכולם. |
| **tools/fileSystem.js** | read_file / write_file / list_files — לכל ה-agents. |
| **tools/shell.js** | run_command — לטסטים ו-devops בלבד. |
| **approval.js** | approval gates בין layers — המשתמש יכול לעצור / לאשר בכל שלב. |

---

## סיכום מספרים

| | |
|-|-|
| סה"כ agents | ~47 |
| agents חובה | ~10 |
| agents אופציונליים | ~37 |
| מודל לפיתוח | Claude Opus 4.7 |
| מודל לתכנון/עיצוב | Claude Sonnet 4.6 |
| מקסימום סבבי תיקון | 2 (quality) + 2 (PM) |
| agents עם גישת shell | testRunner, devops |
