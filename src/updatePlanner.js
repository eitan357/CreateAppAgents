'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const UPDATE_SCHEMA = `{
  "summary": "One sentence describing what this update does",
  "affectedSquads": [
    {
      "id": "listings",
      "changeDescription": "Add price negotiation: POST /api/listings/:id/negotiate endpoint, NegotiateButton component on listing detail screen, negotiation history in user profile"
    }
  ],
  "newSquads": [
    {
      "id": "payments",
      "name": "Payments Squad",
      "description": "Handles all payment processing and transaction history",
      "userFacingArea": "Checkout and payment history screens",
      "backendModule": "payments",
      "frontendModule": "payments",
      "keyFeatures": ["checkout", "payment-history", "refunds"],
      "agents": ["backendDev", "frontendDev", "integrationAgent"]
    }
  ]
}`;

async function analyzeUpdate(changeRequest, existingSquadPlan) {
  const client = new Anthropic();

  const squadsDescription = existingSquadPlan.squads.map(s =>
    `- ${s.id} (${s.name}): ${s.userFacingArea} — features: ${s.keyFeatures.join(', ')}`
  ).join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are a technical project manager analyzing a change request for an existing application.

Decide which existing squads need to be updated and whether any new squads must be created.

Rules:
- A squad is "affected" if the change requires adding or modifying files in its domain
- Create a new squad ONLY when the change introduces an entirely new domain that no existing squad owns
- changeDescription must be concrete and actionable: specific endpoints, components, or screens to add/modify
- If one change touches multiple existing squads, list all of them
- affectedSquads and newSquads may each be empty arrays if not applicable

Return ONLY valid JSON matching this schema exactly:
${UPDATE_SCHEMA}`,
    messages: [{
      role: 'user',
      content: `Existing squads:\n${squadsDescription}\n\nPlatform: ${existingSquadPlan.platformNotes}\n\nChange request:\n${changeRequest}`,
    }],
  }, { timeout: 10 * 60 * 1000 });

  const text = response.content.find(b => b.type === 'text')?.text || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Update planner failed to generate valid JSON.');
  return JSON.parse(jsonMatch[0]);
}

function formatUpdatePlan(updatePlan) {
  const lines = [`📋  ${updatePlan.summary}`, ''];

  if (updatePlan.affectedSquads.length > 0) {
    lines.push('🔄  צוותים קיימים שישתנו:');
    updatePlan.affectedSquads.forEach(s => {
      lines.push(`    • ${s.id}: ${s.changeDescription}`);
    });
    lines.push('');
  }

  if (updatePlan.newSquads.length > 0) {
    lines.push('🆕  צוותים חדשים שייווצרו:');
    updatePlan.newSquads.forEach(s => {
      lines.push(`    • ${s.name}: ${s.userFacingArea}`);
      lines.push(`      פיצ'רים: ${s.keyFeatures.join(', ')}`);
    });
  }

  return lines.join('\n');
}

module.exports = { analyzeUpdate, formatUpdatePlan };
