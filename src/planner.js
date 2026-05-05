'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const chalk = require('chalk');

const REQUIREMENTS_START = '---REQUIREMENTS_START---';
const REQUIREMENTS_END   = '---REQUIREMENTS_END---';

const SYSTEM_PROMPT = `You are a senior product advisor and UX strategist helping a client plan their application before development begins.
Your goal: gather comprehensive requirements through a natural, intelligent conversation.

## Conversation Principles:
- Communicate in English
- Ask 2-3 focused questions per turn — don't overwhelm the user
- Listen to answers and ask smart follow-up questions based on context
- Suggest options when the user is unsure ("for example: Google OAuth, email/password, or guest access")
- If the user describes a complex feature — break it down into smaller questions
- When the conversation progresses and you have enough information, offer to summarize: "It looks like I have a clear picture — would you like me to summarize and start building?"

## Topics to cover throughout the conversation (not as a list, but in natural flow):
1. The app's purpose and the problem it solves
2. Target audience — who are the users? Age, background, technical expertise?
3. Platform — web (desktop/mobile), mobile app (iOS/Android), or both?
4. Main pages / screens — what does the user see and do on each screen?
5. Core features — what must be in the MVP? What can wait?
6. User authentication — registration, login, social login, different permission levels?
7. Data and content — what is stored? Who creates content? Is there a CMS?
8. Integrations — payments, maps, email/SMS sending, external APIs?
9. Real-time — chat, live updates, push notifications?
10. Scale — how many users are expected? Peak load?
11. Languages and RTL — Hebrew, Arabic, English, multilingual?
12. Design and branding — style? Brand colors? Dark mode? Is there a Figma?
13. Constraints — budget, timeline, preferred technology?

## When the user is ready (says "ready", "let's build", "start development", "yes", or similar, or when you offer and they agree):
Produce a detailed requirements document in this exact format (including the markers):

---REQUIREMENTS_START---
## App Description
[A clear description of what the app does and what problem it solves]

## Target Audience
[Who the users are and what their needs are]

## Platform
[web / mobile / both, and which framework is preferred if specified]

## Pages / Screens
[A detailed list of every page/screen with a brief description of what appears on it]

## Features
### MVP (required for initial development)
[List of essential features]

### Phase 2 (after launch)
[Features that can be deferred]

## Authentication & Users
[Auth type, roles, permissions]

## Data & Content
[What is stored, who manages it, main structure]

## Integrations
[Required external services]

## Technical Requirements
[real-time, scale, performance, languages, RTL]

## Design
[Style, colors, dark mode, preferences]

## Constraints
[Budget, time, technology]
---REQUIREMENTS_END---`;

async function runPlanningSession(ask) {
  const client = new Anthropic();
  const history = [];

  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║       🧠  Interactive Planning Mode       ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝'));
  console.log(chalk.gray('Chat with the AI to plan your application.'));
  console.log(chalk.gray('When you are ready to move to development — type "ready" or "let\'s build".\n'));

  // First turn: AI opens the conversation
  const opening = await callClaude(client, history, '(Start the conversation — greet the user and ask them about the application they want to build)');
  history.push({ role: 'user',      content: '(Start the conversation — greet the user and ask them about the application they want to build)' });
  history.push({ role: 'assistant', content: opening.text });
  printAI(opening.text);

  // Conversation loop
  while (true) {
    const userInput = (await ask(chalk.bold.white('\nYou: '))).trim();
    if (!userInput) continue;

    history.push({ role: 'user', content: userInput });

    const response = await callClaude(client, history, null);
    history.push({ role: 'assistant', content: response.text });

    // Check if requirements were produced
    if (response.text.includes(REQUIREMENTS_START)) {
      printAI(response.text.split(REQUIREMENTS_START)[0].trim());
      const requirements = extractRequirements(response.text);
      if (requirements) {
        console.log(chalk.bold.green('\n✅  Requirements document generated successfully!\n'));
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
    model: 'claude-sonnet-4-6',
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
