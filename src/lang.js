'use strict';

let _code = 'en';

const SUPPORTED = [
  { code: 'en', label: 'English' },
  { code: 'he', label: 'עברית' },
  { code: 'ar', label: 'العربية' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'zh', label: '中文' },
];

// ── Translations for static UI strings ───────────────────────────────────────
// Add a new language by copying the 'en' block and translating every value.
// Languages not listed here fall back to English for static strings,
// but AI agents (planner, designPicker) still receive getLangInstruction()
// and will naturally respond in the selected language.

const TRANSLATIONS = {
  en: {
    // Banners
    planningTitle:     '🧠  Interactive Planning Mode',
    designTitle:       '🎨  3 Design Proposals for Your App',
    qualityTitle:      'Quality / Cost Level',
    githubTitle:       'GitHub Repository',
    // Core prompts
    projectName:       '📦  Project name: ',
    continuePrompt:    '▶  Continue? (y/n): ',
    continueStep:      '▶  Continue to next step? (y/n): ',
    continueLayer:     '▶  Continue to next layer? (y/n): ',
    chooseMode:        '▶  Choose mode (1 or 2): ',
    chooseOption:      (opts) => `▶  Choose (${opts}): `,
    chooseLevel:       '▶  Select level (1, 2 or 3) [default: 2]: ',
    chooseDesign:      '▶  Choice or request: ',
    confirmSelection:  '▶  Confirm selection and continue to development? (y/n): ',
    startDev:          '▶  Start development with these requirements? (y/n): ',
    designBeforeDev:   '▶  Design the app before development? (y/n): ',
    youPrompt:         'You: ',
    // Status messages
    filesCreated:      'Files created:',
    agentDone:         (name) => `✅  ${name} Agent — completed`,
    layerComplete:     'Layer Complete:',
    buildComplete:     '✅  Build complete!',
    reqsGenerated:     '✅  Requirements document generated successfully!',
    designAdded:       '✅  Design spec added to project requirements.',
    designSelected:    (n, name) => `✅  Design ${n} selected — ${name}`,
    freshBuild:        'Starting fresh build...',
    resuming:          '♻️   Resuming from previous checkpoint...',
    generatingPlan:    '⏳  Generating project plan...',
    generatingSquads:  '⏳  Generating squad breakdown...',
    stoppedByUser:     '⏹️   Stopped by user.',
    progressSaved:     '💾  Progress saved — you can resume from this point in the next run.',
    // Checkpoint menu
    foundPrevBuild:    (name) => `♻️   Found a previous build for "${name}"`,
    completedLayers:   'Completed layers:',
    opt1Fresh:         '1️⃣   Fresh build from scratch',
    opt2Resume:        '2️⃣   Resume from checkpoint',
    opt3Update:        "3️⃣   Update / add a feature to the existing app",
    // Mode selection
    howStart:          'How would you like to start?',
    mode1:             '1️⃣   AI Planning  — interactive conversation with a product advisor',
    mode2:             '2️⃣   Direct Input  — type your requirements yourself',
    // Planning session
    planningHelp:      "Chat with the AI to plan your application. When you are ready to move to development — type \"ready\" or \"let's build\".",
    describeApp:       '📝  Describe the application you want to build.\n    (Type your requirements, and when done type END on a separate line)',
    describeUpdate:    'Describe the change you want to make. (Type END on a separate line when done)',
    reqsHeader:        '━━━  Generated Requirements Document  ━━━',
    reqsFooter:        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    refineHint:        '💡  You can re-run and continue refining the requirements in another conversation.',
    // Design picker
    generatingDesigns: '🎨  Generating 3 design proposals tailored to your app...',
    designOpts:        'What would you like to do?',
    designOptPick:     '  • Type 1, 2, or 3 — to choose a design',
    designOptRefine:   '  • Type a request — to modify / combine designs (e.g. "I like 1 but with the colors of 2")',
    designOptSkip:     '  • Type "skip" — to continue to development without choosing a design',
    designSkipped:     '⏭️   Continuing to development without a selected design.',
    refining:          '🔄  Refining designs based on your request...',
    continueRefining:  '💬  Continue refining the design:',
    designNow:         'What would you like to do now?',
    designNowOpts:     '  • Type 1, 2, or 3 to choose  •  Continue refining  •  Type "skip" to skip',
    // Design card labels
    colorsLabel:       'Colors:',
    typographyLabel:   'Typography:',
    styleLabel:        'Style:',
    previewLabel:      'Preview:',
    characterLabel:    'Character:',
    inspirationLabel:  'Inspiration:',
    headingsLabel:     'Headings:',
    bodyLabel:         'Body:',
    cornersLabel:      'Corners:',
    shadowsLabel:      'Shadows:',
    animationLabel:    'Animation:',
    darkModeLabel:     'Dark mode:',
    primaryLabel:      'Primary',
    secondaryLabel:    'Secondary',
    accentLabel:       'Accent',
    backgroundLabel:   'Background',
    surfaceLabel:      'Surface',
    textLabel:         'Text',
    // Tier labels
    tier1:             'Economy  — no extended thinking, faster and cheaper',
    tier2:             'Balanced — adaptive extended thinking (Claude decides when to think)',
    tier3:             'Maximum  — full extended thinking, highest quality',
    tierSelected:      (label) => `✅  Selected level: ${label}`,
    // Squad plan labels
    squadDomain:       'Domain    ',
    squadDescription:  'Description',
    squadBackend:      'Backend   ',
    squadFrontend:     'Frontend  ',
    squadFeatures:     'Features  ',
    squadPlatformTeam: '🏗️   Platform Team (runs across all squads)',
    // Errors
    errNoProjectName:  '❌  Project name is required.',
    errNoRequirements: '❌  Cannot continue without requirements.',
    errNoChange:       '❌  Cannot continue without a description of the change.',
  },

  he: {
    // Banners
    planningTitle:     '🧠  מצב תכנון אינטראקטיבי',
    designTitle:       '🎨  3 הצעות עיצוב לאפליקציה שלך',
    qualityTitle:      'רמת איכות / עלות',
    githubTitle:       'GitHub Repository',
    // Core prompts
    projectName:       '📦  שם הפרויקט: ',
    continuePrompt:    '▶  להמשיך? (y/n): ',
    continueStep:      '▶  להמשיך לשלב הבא? (y/n): ',
    continueLayer:     '▶  להמשיך לשכבה הבאה? (y/n): ',
    chooseMode:        '▶  בחר מצב (1 או 2): ',
    chooseOption:      (opts) => `▶  בחר (${opts}): `,
    chooseLevel:       '▶  בחר רמה (1, 2 או 3) [ברירת מחדל: 2]: ',
    chooseDesign:      '▶  בחירה או בקשה: ',
    confirmSelection:  '▶  לאשר את הבחירה ולהמשיך לפיתוח? (y/n): ',
    startDev:          '▶  להתחיל פיתוח עם הדרישות האלה? (y/n): ',
    designBeforeDev:   '▶  לעצב את האפליקציה לפני הפיתוח? (y/n): ',
    youPrompt:         'אתה: ',
    // Status messages
    filesCreated:      'קבצים שנוצרו:',
    agentDone:         (name) => `✅  ${name} Agent — הסתיים`,
    layerComplete:     'שכבה הושלמה:',
    buildComplete:     '✅  הבנייה הושלמה!',
    reqsGenerated:     '✅  מסמך הדרישות נוצר בהצלחה!',
    designAdded:       '✅  מפרט העיצוב נוסף לדרישות הפרויקט.',
    designSelected:    (n, name) => `✅  עיצוב ${n} נבחר — ${name}`,
    freshBuild:        'מתחיל בנייה חדשה...',
    resuming:          '♻️   ממשיך מנקודת עצירה קודמת...',
    generatingPlan:    '⏳  מייצר תוכנית פרויקט...',
    generatingSquads:  '⏳  מייצר חלוקת צוותים...',
    stoppedByUser:     '⏹️   נעצר על ידי המשתמש.',
    progressSaved:     '💾  התקדמות נשמרה — ניתן להמשיך מנקודה זו בהרצה הבאה.',
    // Checkpoint menu
    foundPrevBuild:    (name) => `♻️   נמצאה בנייה קודמת עבור "${name}"`,
    completedLayers:   'שכבות שהושלמו:',
    opt1Fresh:         '1️⃣   בנייה חדשה מאפס',
    opt2Resume:        '2️⃣   המשך מנקודת העצירה',
    opt3Update:        "3️⃣   עדכון / הוספת פיצ'ר לאפליקציה הקיימת",
    // Mode selection
    howStart:          'איך תרצה להתחיל?',
    mode1:             '1️⃣   תכנון עם AI  — שיחה עם יועץ מוצר',
    mode2:             '2️⃣   הזנה ידנית  — כתוב את הדרישות בעצמך',
    // Planning session
    planningHelp:      'שוחח עם ה-AI כדי לתכנן את האפליקציה שלך. כשמוכן לעבור לפיתוח — הקלד "מוכן" או "בוא נבנה".',
    describeApp:       '📝  תאר את האפליקציה שאתה רוצה לבנות.\n    (הקלד את הדרישות, וכשתסיים הקלד END בשורה נפרדת)',
    describeUpdate:    'תאר את השינוי שאתה רוצה לעשות. (הקלד END בשורה נפרדת כשתסיים)',
    reqsHeader:        '━━━  מסמך הדרישות שנוצר  ━━━',
    reqsFooter:        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    refineHint:        '💡  תוכל להריץ מחדש ולהמשיך לשפר את הדרישות בשיחה אחרת.',
    // Design picker
    generatingDesigns: '🎨  מייצר 3 הצעות עיצוב מותאמות לאפליקציה שלך...',
    designOpts:        'מה תרצה לעשות?',
    designOptPick:     '  • הקלד 1, 2 או 3 — לבחור עיצוב',
    designOptRefine:   '  • הקלד בקשה — לשנות / לשלב עיצובים',
    designOptSkip:     '  • הקלד "skip" — להמשיך לפיתוח בלי עיצוב',
    designSkipped:     '⏭️   ממשיך לפיתוח בלי עיצוב נבחר.',
    refining:          '🔄  מעדכן עיצובים לפי הבקשה שלך...',
    continueRefining:  '💬  המשך לעצב:',
    designNow:         'מה תרצה לעשות עכשיו?',
    designNowOpts:     '  • הקלד 1, 2 או 3 לבחור  •  המשך לשפר  •  הקלד "skip" לדלג',
    // Design card labels
    colorsLabel:       'צבעים:',
    typographyLabel:   'טיפוגרפיה:',
    styleLabel:        'סגנון:',
    previewLabel:      'תצוגה מקדימה:',
    characterLabel:    'אופי:',
    inspirationLabel:  'השראה:',
    headingsLabel:     'כותרות:',
    bodyLabel:         'גוף:',
    cornersLabel:      'פינות:',
    shadowsLabel:      'צללים:',
    animationLabel:    'אנימציה:',
    darkModeLabel:     'מצב כהה:',
    primaryLabel:      'ראשי',
    secondaryLabel:    'משני',
    accentLabel:       'הדגשה',
    backgroundLabel:   'רקע',
    surfaceLabel:      'משטח',
    textLabel:         'טקסט',
    // Tier labels
    tier1:             'חסכוני  — ללא חשיבה עמוקה, מהיר וזול יותר',
    tier2:             'מאוזן   — חשיבה עמוקה אדפטיבית (Claude מחליט מתי לחשוב)',
    tier3:             'מקסימלי — חשיבה עמוקה מלאה, איכות גבוהה ביותר',
    tierSelected:      (label) => `✅  רמה נבחרה: ${label}`,
    // Squad plan labels
    squadDomain:       'תחום     ',
    squadDescription:  'תיאור    ',
    squadBackend:      'Backend  ',
    squadFrontend:     'Frontend ',
    squadFeatures:     'פיצ\'רים  ',
    squadPlatformTeam: '🏗️   צוות פלטפורמה (רץ על פני כל הצוותים)',
    // Errors
    errNoProjectName:  '❌  שם הפרויקט הוא שדה חובה.',
    errNoRequirements: '❌  לא ניתן להמשיך ללא דרישות.',
    errNoChange:       '❌  לא ניתן להמשיך ללא תיאור השינוי.',
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

function setLanguage(code) {
  _code = SUPPORTED.some(l => l.code === code) ? code : 'en';
}

function getLanguage() { return _code; }

function getLangName() {
  return SUPPORTED.find(l => l.code === _code)?.label || 'English';
}

// Injected into AI system prompts so the model communicates in the chosen language.
// Also instructs the planner to write requirements section headers in that language.
function getLangInstruction() {
  if (_code === 'en') return 'Communicate in English.';
  const name = getLangName();
  return `Communicate in ${name} (language code: ${_code}). Always respond in this language. When generating the requirements document, write all section headers in ${name} as well.`;
}

// Translate a static UI string key. Falls back to English if the current
// language has no translation for this key.
function t(key, ...args) {
  const strings = TRANSLATIONS[_code] || TRANSLATIONS.en;
  const val = strings[key] ?? TRANSLATIONS.en[key] ?? key;
  if (typeof val === 'function') return val(...args);
  return val;
}

module.exports = { SUPPORTED, setLanguage, getLanguage, getLangName, getLangInstruction, t };
