'use strict';

const fs   = require('fs');
const path = require('path');

// Auto-generated stubs live in scripts/auto-mocks.json (created by scripts/generate-mocks.js).
// Manual MOCK_DEFINITIONS always take priority over auto-generated ones.
const AUTO_MOCKS_PATH = path.join(__dirname, '..', 'scripts', 'auto-mocks.json');
const AUTO_MOCKS = fs.existsSync(AUTO_MOCKS_PATH)
  ? JSON.parse(fs.readFileSync(AUTO_MOCKS_PATH, 'utf8'))
  : {};

function _write(outputDir, relPath, content) {
  const full = path.join(outputDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  return relPath;
}

// Returns { summary, filesCreated } for a given agent this.name in mock mode.
// Squad-specific paths use global._currentSquadContext?.id.
function getMockResponse(agentName) {
  const outputDir = global._mockOutputDir || path.join(process.cwd(), 'output', 'mock');
  const squadId   = global._currentSquadContext?.id   || 'squad-01';
  const squadName = global._currentSquadContext?.name || 'Core Features';

  const files = [];

  // Manual definitions take priority; auto-generated stubs fill the gaps.
  const def = MOCK_DEFINITIONS[agentName] || AUTO_MOCKS[agentName];
  if (def) {
    const summary = typeof def.summary === 'function' ? def.summary(squadId, squadName) : def.summary;
    const fileMap = typeof def.files   === 'function' ? def.files(squadId, squadName)   : def.files;
    for (const [relPath, content] of Object.entries(fileMap || {})) {
      files.push(_write(outputDir, relPath, content));
    }
    return { summary, filesCreated: files };
  }

  return {
    summary: `[MOCK] ${agentName} completed successfully.`,
    filesCreated: [],
  };
}

// ── Mock definitions — keyed by BaseAgent this.name ──────────────────────────
const MOCK_DEFINITIONS = {

  // ── Layer 1 — Discovery ─────────────────────────────────────────────────────
  RequirementsAnalyst: {
    summary: '[MOCK] Requirements analysis complete. 3 user stories defined across 2 domains.',
    files: {
      'docs/requirements-spec.md': '# Requirements Spec\n\n## User Stories\n- US-001: As a user, I can create items\n- US-002: As a user, I can view items\n- US-003: As a user, I can delete items\n',
      'docs/domain-glossary.md':   '# Glossary\n\n- Item: core entity managed by the application\n',
      'docs/edge-cases.md':        '# Edge Cases\n\n- Empty list state\n- Network failure handling\n- Concurrent updates\n',
    },
  },

  Architect: {
    summary: '[MOCK] System architecture complete. Node.js + Express backend, React frontend, PostgreSQL database.',
    files: {
      'docs/ARCHITECTURE.md': '# Architecture\n\n## Stack\n- Backend: Node.js + Express\n- Frontend: React + TypeScript\n- Database: PostgreSQL\n\n## Folder Structure\n```\nbackend/src/\n  routes/\n  services/\n  models/\nfrontend/src/\n  pages/\n  components/\n```\n',
    },
  },

  MobileTechAdvisor: {
    summary: '[MOCK] Mobile tech advisory complete. Recommending Expo + React Native.',
    files: { 'docs/mobile-tech-advice.md': '# Mobile Tech Advisory\n\nRecommendation: Expo (React Native)\n' },
  },

  BusinessPlanning: {
    summary: '[MOCK] Business planning complete. MVP scope defined.',
    files: { 'docs/business-plan.md': '# Business Plan\n\n## MVP Scope\nCore CRUD features for initial launch.\n' },
  },

  WebTechAdvisor: {
    summary: '[MOCK] Web tech advisory complete. Recommending Next.js with TypeScript.',
    files: { 'docs/web-tech-advice.md': '# Web Tech Advisory\n\nRecommendation: Next.js + TypeScript\n' },
  },

  // ── Layer 2 — Design ────────────────────────────────────────────────────────
  DataArchitect: {
    summary: '[MOCK] Database schema complete. User and Item models defined.',
    files: {
      'docs/db-schema.md':           '# Database Schema\n\n## Users\n- id, email, password_hash, created_at\n\n## Items\n- id, user_id, title, created_at\n',
      'backend/src/models/User.js':  '// MOCK stub\nmodule.exports = {};\n',
      'backend/src/models/Item.js':  '// MOCK stub\nmodule.exports = {};\n',
    },
  },

  ApiDesigner: {
    summary: '[MOCK] API contracts complete. 8 endpoints defined in OpenAPI spec.',
    files: {
      'docs/openapi.yaml': 'openapi: "3.0.0"\ninfo:\n  title: Mock API\n  version: "1.0.0"\npaths:\n  /health:\n    get:\n      summary: Health check\n      responses:\n        "200":\n          description: OK\n',
      'docs/api-contracts.md': '# API Contracts\n\n## GET /health\nReturns 200 OK.\n',
    },
  },

  FrontendArchitect: {
    summary: '[MOCK] Frontend architecture complete. Component tree and navigation structure defined.',
    files: {
      'docs/frontend-architecture.md': '# Frontend Architecture\n\n## Component Tree\n- App\n  - Layout\n    - Header\n    - ItemList\n    - ItemForm\n',
      'docs/component-spec.md':        '# Component Spec\n\n## ItemList\nDisplays list of items fetched from API.\n\n## ItemForm\nForm to create new items.\n',
    },
  },

  UXDesigner: {
    summary: '[MOCK] UX design complete. User flows and wireframes defined for all screens.',
    files: {
      'docs/ux-spec.md': '# UX Spec\n\n## User Flows\n1. Login → Dashboard → Create Item\n2. Dashboard → Delete Item\n\n## Empty States\n- No items: show "Create your first item" CTA\n',
    },
  },

  // ── Layer 2b — Leaders Team ─────────────────────────────────────────────────
  VpPm: {
    summary: '[MOCK] PM guidelines written. Feature priorities and acceptance criteria defined for all squads.',
    files: {
      'docs/guidelines/pm-guidelines.md': '# PM Guidelines\n\n## Priorities\n1. Authentication flow\n2. Core CRUD operations\n3. Error handling\n\n## Acceptance Criteria\n- All endpoints return consistent JSON\n- Error messages are user-friendly\n',
    },
  },

  TechLead: {
    summary: '[MOCK] Tech guidelines written. Coding standards and module structure defined.',
    files: {
      'docs/guidelines/tech-guidelines.md': '# Tech Guidelines\n\n## Module Structure\n- Routes → Controllers → Services → Models\n\n## Error Handling\n- Use AppError class for all errors\n- Return { error: message } JSON\n\n## Timezone\n- Store UTC, convert at display layer\n',
    },
  },

  QaLead: {
    summary: '[MOCK] QA guidelines written. Testing strategy defined.',
    files: {
      'docs/guidelines/qa-guidelines.md': '# QA Guidelines\n\n## Test Coverage\n- Unit: 80% for services\n- Integration: all routes\n\n## Tools\n- Jest for unit/integration\n- Supertest for API testing\n',
    },
  },

  SecurityLead: {
    summary: '[MOCK] Security guidelines written. OWASP checklist and requirements defined.',
    files: {
      'docs/guidelines/security-guidelines.md': '# Security Guidelines\n\n## Requirements\n- JWT with short expiry (15min)\n- bcrypt salt >= 12\n- Helmet.js on all routes\n- Input validation on all endpoints\n',
    },
  },

  DesignLead: {
    summary: '[MOCK] Design guidelines written. Design tokens and component standards defined.',
    files: {
      'docs/guidelines/design-guidelines.md': '# Design Guidelines\n\n## Tokens\n- Primary: #2563EB\n- Error: #DC2626\n- Font: Inter\n\n## Components\n- Always use shared/components/primitives\n- No inline styles\n',
    },
  },

  RenderingStrategy: {
    summary: '[MOCK] Rendering strategy defined. SSR for auth pages, CSR for dashboard.',
    files: { 'docs/rendering-strategy.md': '# Rendering Strategy\n\n- Auth pages: SSR\n- Dashboard: CSR with React Query\n- Public pages: SSG\n' },
  },

  InputPolicy: {
    summary: '[MOCK] Input policy defined. Validation rules and UX patterns specified.',
    files: { 'docs/input-policy.md': '# Input Policy\n\n- Validate on blur\n- Show errors below fields\n- Mark optional fields with "(optional)"\n' },
  },

  // ── Layer 2c — Platform Pipeline ────────────────────────────────────────────
  PlatformPm: {
    summary: '[MOCK] Platform spec written. Shared components, API client, and DB schema specified.',
    files: { 'docs/platform/platform-spec.md': '# Platform Spec\n\n## Shared Components\nPrimitive and composite UI components.\n\n## API Client\nTyped HTTP client with all endpoints.\n\n## DB Schema\nShared Mongoose/Prisma models.\n' },
  },

  UiPrimitives: {
    summary: '[MOCK] Primitive components created: Button, Input, Typography, Icon, Badge, Avatar, Spinner.',
    files: {
      'shared/components/primitives/Button.tsx':     '// MOCK stub\nexport function Button({ children, ...props }) { return <button {...props}>{children}</button>; }\n',
      'shared/components/primitives/Input.tsx':      '// MOCK stub\nexport function Input(props) { return <input {...props} />; }\n',
      'shared/components/primitives/Typography.tsx': '// MOCK stub\nexport function Typography({ children }) { return <span>{children}</span>; }\n',
      'shared/components/primitives/index.ts':       'export { Button } from "./Button";\nexport { Input } from "./Input";\nexport { Typography } from "./Typography";\n',
    },
  },

  UiComposite: {
    summary: '[MOCK] Composite components created: Card, Modal, EmptyState, ErrorState, LoadingState.',
    files: {
      'shared/components/composite/Card.tsx':        '// MOCK stub\nexport function Card({ children }) { return <div className="card">{children}</div>; }\n',
      'shared/components/composite/EmptyState.tsx':  '// MOCK stub\nexport function EmptyState({ title }) { return <div>{title}</div>; }\n',
      'shared/components/composite/LoadingState.tsx':'// MOCK stub\nexport function LoadingState() { return <div>Loading...</div>; }\n',
      'shared/components/composite/index.ts':        'export { Card } from "./Card";\nexport { EmptyState } from "./EmptyState";\nexport { LoadingState } from "./LoadingState";\n',
    },
  },

  ApiClient: {
    summary: '[MOCK] Shared API client created with typed endpoints and DTOs.',
    files: {
      'shared/api/client.ts': '// MOCK stub\nexport const api = { get: async (url) => fetch(url).then(r => r.json()) };\n',
      'shared/api/types.ts':  '// MOCK stub\nexport interface Item { id: string; title: string; }\nexport interface User { id: string; email: string; }\n',
      'shared/api/hooks.ts':  '// MOCK stub\nexport function useItems() { return { data: [], isLoading: false }; }\n',
    },
  },

  DbSchema: {
    summary: '[MOCK] Shared DB schema created. User and Item models with connection setup.',
    files: {
      'shared/db/index.ts': '// MOCK stub\nexport const db = null;\nexport const connect = async () => {};\n',
    },
  },

  PlatformQa: {
    summary: '[MOCK] Platform QA complete. All shared components validated.',
    files: { 'docs/quality-findings/platform-qa.md': '# Platform QA\n\nAll shared components pass validation.\nNo issues found.\n' },
  },

  PlatformSecurity: {
    summary: '[MOCK] Platform security review complete. No critical issues in shared code.',
    files: { 'docs/quality-findings/platform-security.md': '# Platform Security\n\nNo critical vulnerabilities in shared modules.\n' },
  },

  PlatformPmReview: {
    summary: '[MOCK] Platform PM review complete. VERDICT: ACCEPTED',
    files: { 'docs/platform/platform-review.md': '# Platform PM Review\n\nVERDICT: ACCEPTED\n\nAll platform components implemented per spec.\n' },
  },

  // ── Feature Infrastructure Agents ───────────────────────────────────────────
  Notifications: {
    summary: '[MOCK] Push notification infrastructure added. FCM/APNs configured.',
    files: { 'docs/features/notifications.md': '# Notifications\n\nFCM/APNs push notification setup complete.\n' },
  },

  DeepLinks: {
    summary: '[MOCK] Deep link handling added. Universal Links and custom scheme configured.',
    files: { 'docs/features/deep-links.md': '# Deep Links\n\nUniversal Links and custom scheme configured.\n' },
  },

  OfflineFirst: {
    summary: '[MOCK] Offline-first support added. WatermelonDB sync configured.',
    files: { 'docs/features/offline.md': '# Offline First\n\nOffline sync with WatermelonDB configured.\n' },
  },

  Realtime: {
    summary: '[MOCK] Real-time features added. WebSocket connection and event handlers set up.',
    files: { 'docs/features/realtime.md': '# Realtime\n\nWebSocket/Socket.io integration complete.\n' },
  },

  Animations: {
    summary: '[MOCK] Animation system added. Lottie and shared transitions configured.',
    files: { 'docs/features/animations.md': '# Animations\n\nLottie animations and shared element transitions set up.\n' },
  },

  Onboarding: {
    summary: '[MOCK] Onboarding flow added. Splash screen and permission rationale implemented.',
    files: { 'docs/features/onboarding.md': '# Onboarding\n\nSplash screen and first-run experience implemented.\n' },
  },

  Monetization: {
    summary: '[MOCK] In-app purchases added. RevenueCat subscriptions configured.',
    files: { 'docs/features/monetization.md': '# Monetization\n\nRevenueCat subscription management configured.\n' },
  },

  MLMobile: {
    summary: '[MOCK] On-device ML added. ML Kit OCR and classification configured.',
    files: { 'docs/features/ml-mobile.md': '# ML Mobile\n\nML Kit integration complete.\n' },
  },

  ARVR: {
    summary: '[MOCK] AR features added. ARKit/ARCore object placement implemented.',
    files: { 'docs/features/ar-vr.md': '# AR/VR\n\nARKit/ARCore integration complete.\n' },
  },

  WidgetsExtensions: {
    summary: '[MOCK] Widgets added. Home screen widget and Share extension implemented.',
    files: { 'docs/features/widgets.md': '# Widgets\n\nHome screen widget and Share extension implemented.\n' },
  },

  OTAUpdates: {
    summary: '[MOCK] OTA updates configured. Expo EAS Update set up.',
    files: { 'docs/features/ota-updates.md': '# OTA Updates\n\nExpo EAS Update configured.\n' },
  },

  SocialSharing: {
    summary: '[MOCK] Social sharing added. useShare() hook and OpenInApp utility implemented.',
    files: {
      'docs/features/social-sharing.md':    '# Social Sharing\n\nuseShare() and OpenInApp implemented.\n',
      'shared/sharing/index.ts':            '// MOCK stub\nexport function useShare() { return { share: async () => {} }; }\n',
    },
  },

  Localization: {
    summary: '[MOCK] i18n infrastructure added. LTR and RTL support configured.',
    files: {
      'docs/features/localization.md': '# Localization\n\ni18n with LTR/RTL support configured.\n',
      'shared/i18n/index.ts':          '// MOCK stub\nexport function t(key, fallback) { return fallback || key; }\n',
    },
  },

  ResponsiveDesign: {
    summary: '[MOCK] Responsive design system added. Mobile-first breakpoints configured.',
    files: { 'docs/features/responsive.md': '# Responsive Design\n\nMobile-first breakpoints and fluid typography configured.\n' },
  },

  PWA: {
    summary: '[MOCK] PWA features added. Service Worker and Web App Manifest configured.',
    files: {
      'docs/features/pwa.md':       '# PWA\n\nService Worker and offline support configured.\n',
      'frontend/public/manifest.json': '{"name":"Mock App","short_name":"App","display":"standalone"}\n',
    },
  },

  WebMonetization: {
    summary: '[MOCK] Stripe billing added. Checkout, customer portal, and webhook handler implemented.',
    files: { 'docs/features/web-monetization.md': '# Web Monetization\n\nStripe Billing and subscription management configured.\n' },
  },

  CmsIntegrator: {
    summary: '[MOCK] CMS integration added. Hardcoded strings extracted to CMS.',
    files: { 'docs/features/cms.md': '# CMS Integration\n\nPayload CMS/Strapi integration configured.\n' },
  },

  // ── Layer 3 — Squad Dev Agents (per squad) ──────────────────────────────────
  'Backend Dev': {
    summary: '[MOCK] Backend implementation complete. Routes, services, and middleware created.',
    files: {
      'backend/package.json':            '{"name":"backend","version":"1.0.0","main":"src/index.js"}\n',
      'backend/src/index.js':            '// MOCK stub\nconst express = require("express");\nconst app = express();\napp.get("/health", (req, res) => res.json({ status: "ok" }));\nmodule.exports = app;\n',
      'backend/src/routes/health.js':    '// MOCK stub\nconst router = require("express").Router();\nrouter.get("/", (req, res) => res.json({ status: "ok" }));\nmodule.exports = router;\n',
      'backend/src/middleware/error.js': '// MOCK stub\nmodule.exports = (err, req, res, next) => res.status(500).json({ error: err.message });\n',
      'backend/.env.example':            'PORT=3000\nDATABASE_URL=postgresql://localhost/app\nJWT_SECRET=changeme\n',
    },
  },

  'Frontend Dev': {
    summary: '[MOCK] Frontend implementation complete. All pages and components created.',
    files: {
      'frontend/package.json':    '{"name":"frontend","version":"1.0.0","private":true}\n',
      'frontend/src/App.tsx':     '// MOCK stub\nexport default function App() { return <div>App</div>; }\n',
      'frontend/src/main.tsx':    '// MOCK stub\nimport React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\nReactDOM.createRoot(document.getElementById("root")!).render(<App />);\n',
      'frontend/.env.example':    'VITE_API_URL=http://localhost:3000\n',
    },
  },

  AuthAgent: {
    summary: '[MOCK] Auth layer complete. JWT middleware, register/login routes, and token refresh implemented.',
    files: {
      'backend/src/middleware/auth.js':      '// MOCK stub\nmodule.exports = { requireAuth: (req, res, next) => next() };\n',
      'backend/src/routes/auth.js':          '// MOCK stub\nconst router = require("express").Router();\nrouter.post("/register", (req, res) => res.json({ token: "mock" }));\nrouter.post("/login", (req, res) => res.json({ token: "mock" }));\nmodule.exports = router;\n',
      'backend/src/services/authService.js': '// MOCK stub\nmodule.exports = { generateToken: () => "mock-token" };\n',
      'docs/auth-flows.md':                  '# Auth Flows\n\n## Register\nPOST /auth/register → 201 { token }\n\n## Login\nPOST /auth/login → 200 { token }\n',
    },
  },

  IntegrationAgent: {
    summary: '[MOCK] Third-party integrations added. Stripe and SendGrid clients configured.',
    files: { 'docs/integrations.md': '# Integrations\n\n## Stripe\nPayment processing configured.\n\n## SendGrid\nEmail service configured.\n' },
  },

  // ── Per-Squad Specialist Agents ─────────────────────────────────────────────
  SquadPmSpec: {
    summary: (squadId, squadName) => `[MOCK] Squad spec written for ${squadName}.`,
    files: (squadId) => ({
      [`docs/squads/${squadId}-spec.md`]: `# Squad Spec — ${squadId}\n\n## Features\n- Feature 1: CRUD operations\n- Feature 2: List view\n\n## API Endpoints\n| Method | Path | Description |\n|--------|------|-------------|\n| GET | /api/items | List items |\n| POST | /api/items | Create item |\n`,
    }),
  },

  SquadDesigner: {
    summary: '[MOCK] Squad design doc written. Screen layouts and component list defined.',
    files: (squadId) => ({
      [`docs/squads/${squadId}-design.md`]: `# Squad Design — ${squadId}\n\n## Screens\n1. List Screen — shows all items\n2. Create Screen — form to add item\n\n## Components\n- ItemCard, ItemForm, ItemList\n`,
    }),
  },

  SquadErrorHandling: {
    summary: '[MOCK] Error handling classes and middleware added.',
    files: {
      'backend/src/errors/AppError.js': '// MOCK stub\nclass AppError extends Error { constructor(message, status) { super(message); this.status = status; } }\nmodule.exports = { AppError };\n',
    },
  },

  SquadCodeCleanup: {
    summary: '[MOCK] Code cleanup complete. Unused imports removed, formatting standardized.',
    files: {},
  },

  SquadDeduplication: {
    summary: '[MOCK] Deduplication complete. No duplicate logic found.',
    files: {},
  },

  SquadQa: {
    summary: '[MOCK] QA complete. 5 tests passed, 0 failed. ALL PASS.',
    files: (squadId) => ({
      [`docs/squads/${squadId}-qa-report.md`]: `# QA Report — ${squadId}\n\n## Results\nALL PASS — 5 passing (12ms)\n\n## Coverage\n- Services: 85%\n- Routes: 90%\n`,
    }),
  },

  SquadSecurity: {
    summary: '[MOCK] Security review complete. No critical vulnerabilities found.',
    files: (squadId) => ({
      [`docs/squads/${squadId}-security.md`]: `# Security Review — ${squadId}\n\n## Findings\n✅ No critical vulnerabilities.\n✅ Input validation in place.\n✅ Auth middleware applied.\n`,
    }),
  },

  SquadPmReview: {
    summary: '[MOCK] PM review complete. VERDICT: ACCEPTED',
    files: (squadId) => ({
      [`docs/squads/${squadId}-review.md`]: `# PM Review — ${squadId}\n\nVERDICT: ACCEPTED\n\nAll features implemented per spec. Acceptance criteria met.\n`,
    }),
  },

  SquadPmUpdateSpec: {
    summary: '[MOCK] Squad update spec written.',
    files: (squadId) => ({
      [`docs/squads/${squadId}-update-spec.md`]: `# Squad Update Spec — ${squadId}\n\nUpdate scope defined.\n`,
    }),
  },

  // ── Global Deduplication ────────────────────────────────────────────────────
  CodeDeduplication: {
    summary: '[MOCK] Global deduplication complete. No cross-squad duplicates found.',
    files: {},
  },

  // ── Layer 4 — Quality ───────────────────────────────────────────────────────
  Security: {
    summary: '[MOCK] Security audit complete. No critical vulnerabilities. Helmet.js and rate limiting verified.',
    files: {
      'docs/quality-findings/security-report.md': '# Security Report\n\n✅ No critical vulnerabilities.\n✅ Helmet.js configured.\n✅ Rate limiting in place.\n✅ Input validation verified.\n',
      'backend/src/middleware/security.js':        '// MOCK stub\nconst helmet = require("helmet");\nmodule.exports = { applySecurityMiddleware: (app) => app.use(helmet()) };\n',
    },
  },

  Reviewer: {
    summary: '[MOCK] Code review complete. No blocking issues. Minor style suggestions noted.',
    files: {
      'docs/quality-findings/reviewer-report.md': '# Code Review Report\n\n✅ No bugs found.\n✅ Error handling consistent.\n✅ API response format uniform.\n🟡 Minor: some functions exceed 30 lines.\n',
    },
  },

  ErrorAudit: {
    summary: '[MOCK] Error audit complete. All error paths handled.',
    files: {
      'docs/quality-findings/error-audit.md': '# Error Audit\n\n✅ All routes have error handlers.\n✅ AppError class used consistently.\n',
    },
  },

  CodeQualityAudit: {
    summary: '[MOCK] Code quality audit complete. No major issues.',
    files: {
      'docs/quality-findings/code-quality.md': '# Code Quality Report\n\n✅ No circular dependencies.\n✅ No unused exports.\n🟡 Minor: 2 functions could be split.\n',
    },
  },

  CmsQA: {
    summary: '[MOCK] CMS QA complete. All content keys validated.',
    files: {
      'docs/quality-findings/cms-qa.md': '# CMS QA\n\n✅ All hardcoded strings extracted.\n✅ Translation keys validated.\n',
    },
  },

  Performance: {
    summary: '[MOCK] Performance audit complete. App startup under 2s. No memory leaks detected.',
    files: {
      'docs/quality-findings/performance.md': '# Performance Report\n\n✅ App startup: 1.2s\n✅ No memory leaks.\n✅ 60fps animations.\n',
    },
  },

  Accessibility: {
    summary: '[MOCK] Accessibility audit complete. WCAG 2.1 AA compliance verified.',
    files: {
      'docs/quality-findings/accessibility.md': '# Accessibility Report\n\n✅ WCAG 2.1 AA compliant.\n✅ VoiceOver/TalkBack compatible.\n✅ Keyboard navigation working.\n',
    },
  },

  LoadTesting: {
    summary: '[MOCK] Load testing complete. Backend handles 500 req/s without degradation.',
    files: {
      'docs/quality-findings/load-testing.md': '# Load Testing Report\n\n✅ 500 req/s sustained.\n✅ P99 latency: 120ms.\n✅ No errors under load.\n',
    },
  },

  DependencyManagement: {
    summary: '[MOCK] Dependency audit complete. No critical vulnerabilities. All packages up to date.',
    files: {
      'docs/quality-findings/dependencies.md': '# Dependency Report\n\n✅ 0 critical vulnerabilities.\n✅ 0 high severity issues.\n🟡 3 packages have minor updates available.\n',
    },
  },

  WebPerformance: {
    summary: '[MOCK] Web performance audit complete. Core Web Vitals passing.',
    files: {
      'docs/quality-findings/web-performance.md': '# Web Performance\n\n✅ LCP: 1.8s (Good)\n✅ CLS: 0.02 (Good)\n✅ INP: 150ms (Good)\n',
    },
  },

  UserTesting: {
    summary: '[MOCK] User testing plan complete. TestFlight and Firebase App Distribution configured.',
    files: {
      'docs/quality-findings/user-testing.md': '# User Testing\n\nTestFlight configured for iOS beta.\nFirebase App Distribution configured for Android.\n',
    },
  },

  PrivacyEthics: {
    summary: '[MOCK] Privacy review complete. GDPR/CCPA compliance verified.',
    files: {
      'docs/quality-findings/privacy.md': '# Privacy Report\n\n✅ GDPR compliant.\n✅ CCPA compliant.\n✅ Cookie consent implemented.\n✅ Data deletion endpoint present.\n',
    },
  },

  // ── Test Agents ─────────────────────────────────────────────────────────────
  TestWriter: {
    summary: '[MOCK] Tests written. Unit tests for services and integration tests for all routes.',
    files: {
      'backend/src/__tests__/unit/sample.test.js':        '// MOCK stub\ndescribe("sample", () => { test("passes", () => expect(1+1).toBe(2)); });\n',
      'backend/src/__tests__/integration/health.test.js': '// MOCK stub\nconst request = require("supertest");\ndescribe("health", () => { test("GET /health returns 200", async () => {}); });\n',
      'docs/testing.md':                                  '# Testing\n\n## Commands\n```\nnpm test\n```\n\n## Coverage\n- Unit: services/\n- Integration: routes/\n',
    },
  },

  TestRunner: {
    summary: '[MOCK] Tests ran. 5 passed, 0 failed. Coverage: 82%.',
    files: {
      'docs/quality-findings/test-results.md': '# Test Results\n\n## Summary\n5 tests passed, 0 failed.\nCoverage: 82%.\n\n## Details\n✅ health.test.js — 1 passed\n✅ sample.test.js — 4 passed\n',
    },
  },

  TestFixer: {
    summary: '[MOCK] All tests passing. No fixes required.',
    files: {},
  },

  // ── PM Reviewer (global, Layer 4) ───────────────────────────────────────────
  PMReviewer: {
    summary: '[MOCK] PM acceptance review complete. VERDICT: ACCEPTED\n\nAll requirements satisfied. Implementation complete.',
    files: {
      'docs/pm-review.md': '# PM Acceptance Review\n\nVERDICT: ACCEPTED\n\nAll user stories implemented and verified.\n',
    },
  },

  // ── Layer 5 — Operations ────────────────────────────────────────────────────
  DevOps: {
    summary: '[MOCK] DevOps setup complete. Dockerfile, docker-compose, and CI/CD pipeline created.',
    files: {
      'Dockerfile':                    'FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nCMD ["node", "backend/src/index.js"]\n',
      'docker-compose.yml':            'version: "3.8"\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n',
      '.github/workflows/deploy.yml':  'name: Deploy\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n',
      'backend/.dockerignore':         'node_modules\n.env\n',
    },
  },

  Documentation: {
    summary: '[MOCK] Documentation complete. README, SETUP, and DEPLOYMENT guides written.',
    files: {
      'README.md':           '# Project\n\nFull-stack application.\n\n## Quick Start\n```\nnpm install\nnpm start\n```\n',
      'docs/SETUP.md':       '# Setup\n\n## Prerequisites\n- Node.js 20+\n- PostgreSQL 15+\n\n## Steps\n1. Clone repo\n2. `cp .env.example .env`\n3. `npm install`\n',
      'docs/DEPLOYMENT.md':  '# Deployment\n\n## Docker\n```\ndocker-compose up\n```\n',
    },
  },

  AnalyticsMonitoring: {
    summary: '[MOCK] Analytics setup complete. Sentry crash reporting and GA4 configured.',
    files: { 'docs/analytics.md': '# Analytics\n\nSentry crash reporting configured.\nGoogle Analytics 4 configured.\n' },
  },

  AppStorePublisher: {
    summary: '[MOCK] App Store submission setup complete. Fastlane and code signing configured.',
    files: { 'docs/app-store/submission.md': '# App Store Submission\n\nFastlane configured.\nCode signing certificates set up.\n' },
  },

  ASOMarketing: {
    summary: '[MOCK] ASO content written. Keywords, store listing, and screenshot strategy defined.',
    files: { 'docs/app-store/aso.md': '# App Store Optimization\n\n## Keywords\nproductivity, tasks, todo\n\n## Store Listing\nTitle: Task Manager\n' },
  },

  SEO: {
    summary: '[MOCK] SEO setup complete. Meta tags, Open Graph, and sitemap.xml configured.',
    files: {
      'docs/seo.md':          '# SEO\n\nMeta tags, Open Graph, and JSON-LD configured.\n',
      'frontend/public/sitemap.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n',
    },
  },
};

module.exports = { getMockResponse, MOCK_DEFINITIONS };
