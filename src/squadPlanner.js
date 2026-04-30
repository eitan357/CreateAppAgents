'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const SQUAD_SCHEMA = `{
  "squads": [
    {
      "id": "auth",
      "name": "Auth Squad",
      "description": "2-3 sentences about what this squad builds and owns",
      "userFacingArea": "The section of the app this squad is responsible for",
      "backendModule": "auth",
      "frontendModule": "auth",
      "keyFeatures": ["login", "register", "password-reset"]
    }
  ],
  "platformNotes": "One sentence describing what the platform team handles across all squads"
}`;

async function createSquadPlan(requirements, plan) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are a technical project manager. Analyze app requirements and divide the application into feature squads — autonomous teams that each own a distinct, independent slice of the product.

Rules:
- Create 2-3 squads for small apps (under 5 screens / simple CRUD)
- Create 3-5 squads for medium apps (marketplace, SaaS dashboard, social features)
- Create 5-6 squads for large apps (multi-category marketplace like Yad2, complex platforms)
- Each squad owns a clear user-facing area with minimal dependencies on other squads
- Shared infrastructure (auth patterns, DB models, design system) belongs to the platform team — do NOT create a squad for it
- Squad IDs: lowercase, hyphens only, no spaces
- backendModule and frontendModule are folder names (e.g. "products", "real-estate", "user-profile")

Return ONLY valid JSON matching this schema exactly:
${SQUAD_SCHEMA}`,
    messages: [{
      role: 'user',
      content: `Project: ${plan.projectName}\n\nDescription: ${plan.description}\n\nRequirements:\n${requirements}\n\nTech Stack:\n${JSON.stringify(plan.techStack, null, 2)}`,
    }],
  });

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Squad planner failed to generate valid JSON.');
  return JSON.parse(jsonMatch[0]);
}

function formatSquadPlan(squadPlan) {
  const lines = [];

  squadPlan.squads.forEach((squad, i) => {
    lines.push(`  Squad ${i + 1} — ${squad.name}`);
    lines.push(`    🎯  תחום    : ${squad.userFacingArea}`);
    lines.push(`    📋  תיאור   : ${squad.description}`);
    lines.push(`    ⚙️   Backend : backend/src/modules/${squad.backendModule}/`);
    lines.push(`    🖥️   Frontend: frontend/src/${squad.frontendModule}/ (or mobile/src/${squad.frontendModule}/)`);
    lines.push(`    🔑  פיצ'רים: ${squad.keyFeatures.join(', ')}`);
    lines.push('');
  });

  lines.push(`  🏗️   Platform Team (רץ מעל כל הצוותים)`);
  lines.push(`    ${squadPlan.platformNotes}`);

  return lines.join('\n');
}

module.exports = { createSquadPlan, formatSquadPlan };
