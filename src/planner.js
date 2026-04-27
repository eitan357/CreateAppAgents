'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');

const REQUIREMENTS_START = '---REQUIREMENTS_START---';
const REQUIREMENTS_END   = '---REQUIREMENTS_END---';

const SYSTEM_PROMPT = `אתה יועץ מוצר בכיר ואסטרטג UX המסייע ללקוח לתכנן את האפליקציה שלו לפני תחילת הפיתוח.
המטרה שלך: לאסוף דרישות מקיפות דרך שיחה טבעית וחכמה.

## עקרונות השיחה:
- דבר בעברית תמיד
- שאל 2-3 שאלות ממוקדות בכל תור — אל תציף את המשתמש
- הקשב לתשובות ושאל שאלות המשך חכמות בהתאם להקשר
- הצע אפשרויות כשהמשתמש לא בטוח ("לדוגמה: Google OAuth, email/password, או גישת אורח")
- אם המשתמש מתאר פיצ'ר מורכב — פרק אותו לשאלות קטנות
- כשהשיחה מתקדמת וצברת מידע טוב, הצע לסכם: "נראה שיש לי תמונה ברורה — רוצה שאסכם ונתחיל לבנות?"

## נושאים לכסות לאורך השיחה (לא כרשימה, אלא בזרימה טבעית):
1. מטרת האפליקציה ובעיה שהיא פותרת
2. קהל היעד — מי המשתמשים? גיל, רקע, מומחיות טכנית?
3. פלטפורמה — web (דסקטופ/מובייל), אפליקציית מובייל (iOS/Android), או שניהם?
4. דפים / מסכים עיקריים — מה המשתמש רואה ועושה בכל מסך?
5. פיצ'רים מרכזיים — מה חייב להיות ב-MVP? מה יכול לחכות?
6. אימות משתמשים — הרשמה, התחברות, social login, הרשאות שונות?
7. נתונים ותוכן — מה נשמר? מי יוצר תוכן? האם יש CMS?
8. אינטגרציות — תשלומים, מפות, שליחת מיילים/SMS, APIs חיצוניים?
9. Real-time — צ'אט, עדכונים חיים, התראות push?
10. קנה מידה — כמה משתמשים צפויים? עומס שיא?
11. שפות ו-RTL — עברית, ערבית, אנגלית, רב-לשוני?
12. עיצוב ומיתוג — סגנון? צבעי מותג? dark mode? האם יש Figma?
13. אילוצים — תקציב, לוח זמנים, טכנולוגיה מועדפת?

## כשהמשתמש מוכן (אומר "מוכן", "בוא נבנה", "התחל פיתוח", "yes", "כן" וכדומה, או כשאתה מציע וניאות):
הפק מסמך דרישות מפורט בפורמט הזה בדיוק (כולל הסמנים):

---REQUIREMENTS_START---
## תיאור האפליקציה
[תיאור ברור של מה האפליקציה עושה ואיזו בעיה היא פותרת]

## קהל יעד
[מי המשתמשים ומה הצרכים שלהם]

## פלטפורמה
[web / mobile / שניהם, ועם איזה framework מועדף אם צוין]

## דפים / מסכים
[רשימה מפורטת של כל דף/מסך עם תיאור קצר של מה מופיע בו]

## פיצ'רים
### MVP (חייב לפיתוח הראשוני)
[רשימת פיצ'רים חיוניים]

### פאזה 2 (לאחר השקה)
[פיצ'רים שניתן לדחות]

## אימות ומשתמשים
[סוג auth, תפקידים, הרשאות]

## נתונים ותוכן
[מה נשמר, מי מנהל, מבנה עיקרי]

## אינטגרציות
[שירותים חיצוניים נדרשים]

## דרישות טכניות
[real-time, קנה מידה, ביצועים, שפות, RTL]

## עיצוב
[סגנון, צבעים, dark mode, העדפות]

## אילוצים
[תקציב, זמן, טכנולוגיה]
---REQUIREMENTS_END---`;

async function runPlanningSession(ask) {
  const client = new Anthropic();
  const history = [];

  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║       🧠  מצב תכנון אינטראקטיבי          ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝'));
  console.log(chalk.gray('שוחח עם ה-AI לתכנון האפליקציה.'));
  console.log(chalk.gray('כשתהיה מוכן לעבור לפיתוח — הקלד "מוכן" או "בוא נבנה".\n'));

  // First turn: AI opens the conversation
  const opening = await callClaude(client, history, '(התחל את השיחה — ברך את המשתמש ושאל אותו על האפליקציה שרוצה לבנות)');
  history.push({ role: 'user',      content: '(התחל את השיחה — ברך את המשתמש ושאל אותו על האפליקציה שרוצה לבנות)' });
  history.push({ role: 'assistant', content: opening.text });
  printAI(opening.text);

  // Conversation loop
  while (true) {
    const userInput = (await ask(chalk.bold.white('\nאתה: '))).trim();
    if (!userInput) continue;

    history.push({ role: 'user', content: userInput });

    const response = await callClaude(client, history, null);
    history.push({ role: 'assistant', content: response.text });

    // Check if requirements were produced
    if (response.text.includes(REQUIREMENTS_START)) {
      printAI(response.text.split(REQUIREMENTS_START)[0].trim());
      const requirements = extractRequirements(response.text);
      if (requirements) {
        console.log(chalk.bold.green('\n✅  מסמך דרישות הופק בהצלחה!\n'));
        return requirements;
      }
    }

    printAI(response.text);
  }
}

async function callClaude(client, history, overrideUserMessage) {
  const messages = overrideUserMessage
    ? [{ role: 'user', content: overrideUserMessage }]
    : history;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages,
  });

  const text = response.content.find(b => b.type === 'text')?.text || '';
  return { text };
}

function extractRequirements(text) {
  const start = text.indexOf(REQUIREMENTS_START);
  const end   = text.indexOf(REQUIREMENTS_END);
  if (start === -1 || end === -1) return null;
  return text.slice(start + REQUIREMENTS_START.length, end).trim();
}

function printAI(text) {
  // Strip the requirements block from display if present
  const displayText = text.includes(REQUIREMENTS_START)
    ? text.split(REQUIREMENTS_START)[0].trim()
    : text;
  if (!displayText) return;
  console.log(chalk.bold.cyan('\nAI: ') + chalk.white(displayText));
}

module.exports = { runPlanningSession };
