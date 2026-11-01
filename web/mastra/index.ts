import { Mastra } from '@mastra/core/mastra';
import { createWorksheetAgent, createWorksheetSession, type WorksheetSession } from 'restaurant-ordering-harness/src/worksheet-agent';
import bistro from '../../evals/fixtures/bistro-stew.json';
import tomato from '../../evals/fixtures/tomato-soup.json';
import { createOfflineModel } from './offline-model';

export function seedWorksheet(text: string): WorksheetSession {
  if (/tomato soup/i.test(text)) return createWorksheetSession(tomato.orderInput);
  const input = structuredClone(bistro.orderInput);
  const raw = { ...input, recipe: { ...input.recipe, ingredients: input.recipe.ingredients.map(row => row.ingredient === 'flour' ? { ...row, amount: 2, unit: 'cups' } : row) } };
  return createWorksheetSession(raw, [{
    ingredient: 'onion', sku: 'ONI-10EA', topic: 'yield',
    label: 'Confirm onion planning by count', placeholder: 'confirm each',
    reason: 'Usable onion weight is unstated. Confirm planning 2 each against the catalog count pack.',
  }]);
}

export function createMastra(session: WorksheetSession, plainChat: boolean) {
  const offline = process.env.WORKSHEET_OFFLINE_DEMO === '1';
  const apiKey = process.env.META_MODEL_API_KEY?.trim();
  if (!offline && !apiKey) throw new Error('Chat is not configured.');
  return new Mastra({ agents: { worksheet: createWorksheetAgent(
    offline ? 'offline-synthetic-no-key' : apiKey!, session,
    offline ? createOfflineModel(session, plainChat) : undefined,
  ) } });
}
