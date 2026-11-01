import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { performance } from 'node:perf_hooks';
import { planOrder, orderInputSchema } from '../src/ordering.js';

// Fail before importing the agent or making any external request.
const key = process.env.META_MODEL_API_KEY?.trim() || process.env.MODEL_API_KEY?.trim();
if (!key?.trim() || key.includes('your-')) {
  console.error('Set META_MODEL_API_KEY in the ignored .env file before a live eval. No model request was made.');
  process.exit(1);
}
const { createRecipeAgent, extractionSchema, promptVersion } = await import('../src/meta-recipe.js');
const fixture = JSON.parse(await readFile('evals/fixtures/tomato-soup.json', 'utf8'));
const baseline = orderInputSchema.parse(fixture.orderInput);
const started = performance.now();
const agent = createRecipeAgent(key);
console.log('Running one synthetic fixture against direct Meta API, max 1 step, 0 retries, 1200 output tokens, 60s timeout.');
try {
  const response = await agent.generate(JSON.stringify({
    recipeText: fixture.recipeText,
    catalogCandidates: baseline.catalog.map(({ sku, ingredient, pack }) => ({ sku, ingredient, pack })),
  }), {
    maxSteps: 1, maxProcessorRetries: 0, abortSignal: AbortSignal.timeout(60000),
    modelSettings: { maxOutputTokens: 1200, maxRetries: 0, temperature: 0 },
    structuredOutput: { schema: extractionSchema },
  });
  const extraction = extractionSchema.parse(response.object);
  const draft = extraction.recipe && extraction.questions.length === 0
    ? planOrder({ ...baseline, recipe: extraction.recipe }) : null;
  const observed = draft && {
    status: draft.status, sku: draft.lines[0]?.sku, packs: draft.lines[0]?.packs,
    subtotalCents: draft.subtotalCents, demandBase: draft.lines[0]?.demandBase,
    netDemandBase: draft.lines[0]?.netDemandBase,
  };
  const passed = isDeepStrictEqual(observed, fixture.expected) && draft?.lines.length === 1 && draft.issues.length === 0;
  let revision = 'uncommitted';
  try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* New checkout. */ }
  const report = { fixtureId: fixture.id, revision, promptVersion, model: process.env.META_MODEL ?? 'meta/muse-spark-1.3',
    endpoint: 'https://api.meta.ai/v1', runAt: new Date().toISOString(),
    latencyMs: Math.round(performance.now() - started), passed,
    usage: response.usage, finishReason: response.finishReason, extraction, draft,
    expected: fixture.expected, observed };
  await mkdir('outputs/evals', { recursive: true });
  const file = `outputs/evals/${new Date().toISOString().replaceAll(':', '-')}.json`;
  await writeFile(file, JSON.stringify(report, null, 2) + '\n');
  console.log(`${passed ? 'PASS' : 'FAIL'}: ${fixture.id}. Report: ${file}`);
  if (!passed) process.exitCode = 1;
} catch (error) {
  // Do not print arbitrary provider errors which can contain request headers.
  console.error(`Live eval failed (${error instanceof Error ? error.name : 'unknown error'}). Check entitlement, API compatibility, quota and timeout. No retry or provider fallback was attempted.`);
  process.exitCode = 1;
}
