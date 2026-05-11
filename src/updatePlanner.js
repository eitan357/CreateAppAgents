'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const UPDATE_SCHEMA = `{
  "summary": "One sentence describing what this update does",
  "affectedSquads": [
    {
      "id": "listings",
      "changeDescription": "Add price negotiation: POST /api/listings/:id/negotiate endpoint, NegotiateButton on listing detail screen"
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
  ],
  "platformUpdates": {
    "uiPrimitives": null,
    "uiComposite": "Add Carousel component for listings gallery; update Card to support image header",
    "apiClient": "Add GET /notifications and POST /notifications/:id/read with NotificationDto and Notification types",
    "dbSchema": null
  }
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

Decide which existing squads need updating, whether new squads are needed, and whether the shared platform layer needs changes.

Rules for affectedSquads / newSquads:
- A squad is "affected" if the change requires adding or modifying files in its feature domain
- Create a new squad ONLY when the change introduces an entirely new domain that no existing squad owns
- changeDescription must be concrete and actionable: specific endpoints, components, or screens
- If one change touches multiple existing squads, list all of them
- affectedSquads and newSquads may each be empty arrays if not applicable

Rules for platformUpdates (shared/components, shared/api, and shared/db):
- uiPrimitives: non-null if the change needs a NEW primitive component (Button variant, new Input type, etc.) or modifies an existing one's behavior/style
- uiComposite : non-null if the change needs a NEW composite component (Carousel, new Modal variant, etc.) or modifies an existing composite
- apiClient   : non-null if the change adds NEW API endpoints or entities that need new types in shared/api/types + new methods in shared/api/endpoints
- dbSchema    : non-null if the change requires a NEW entity/model or adds fields/indexes to an existing model in shared/db/
- Set to null if no changes are needed for that platform layer
- Be specific: describe exactly which component to add/change, which endpoints/types to add, or which entities/fields to add

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
    lines.push('🔄  Existing squads to be changed:');
    updatePlan.affectedSquads.forEach(s => {
      lines.push(`    • ${s.id}: ${s.changeDescription}`);
    });
    lines.push('');
  }

  if (updatePlan.newSquads.length > 0) {
    lines.push('🆕  New squads to be created:');
    updatePlan.newSquads.forEach(s => {
      lines.push(`    • ${s.name}: ${s.userFacingArea}`);
      lines.push(`      Features: ${s.keyFeatures.join(', ')}`);
    });
    lines.push('');
  }

  const p = updatePlan.platformUpdates || {};
  const platformChanges = [
    p.uiPrimitives && `    • uiPrimitives: ${p.uiPrimitives}`,
    p.uiComposite  && `    • uiComposite : ${p.uiComposite}`,
    p.apiClient    && `    • apiClient   : ${p.apiClient}`,
  ].filter(Boolean);

  if (platformChanges.length > 0) {
    lines.push('🏗️   Platform Layer to be changed:');
    platformChanges.forEach(l => lines.push(l));
  }

  return lines.join('\n');
}

module.exports = { analyzeUpdate, formatUpdatePlan };
