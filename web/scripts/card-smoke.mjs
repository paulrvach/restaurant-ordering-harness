import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const moduleName = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(moduleName ? pathToFileURL(resolve(moduleName)).href : 'playwright');
const output = resolve(process.env.CARD_SMOKE_OUTPUT ?? 'outputs/card-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const checks = [];
const realRoute = process.env.CARD_SMOKE_REAL === '1';
page.on('pageerror', (error) => errors.push(error.message));

const proposal = {
  servings: 20,
  stockEdits: [{ ingredient: 'tomato', amount: 1, unit: 'kg' }],
  draft: {
    status: 'draft', issues: [], currency: 'USD', subtotalCents: 1250,
    lines: [{ vendorId: 'demo-produce', sku: 'TOM-2KG', ingredient: 'tomato',
      packs: 1, demandBase: 2500, netDemandBase: 1500, purchasedBase: 2000,
      excessBase: 500, baseUnit: 'g', lineCents: 1250, priceCents: 1250,
      currency: 'USD', source: 'synthetic-catalog:row-1', quotedOn: '2026-10-31' }],
  },
};

if (!realRoute) await page.addInitScript(({ proposal }) => {
  const originalFetch = window.fetch.bind(window);
  window.__cardRequests = [];
  window.fetch = async (input, init) => {
    const request = new Request(input, init);
    if (!new URL(request.url).pathname.endsWith('/api/chat')) return originalFetch(input, init);
    window.__cardRequests.push(await request.json());
    const turn = window.__cardRequests.length;
    const calls = [
      ['proposeOrderDraft', proposal],
      ['requestMissingFact', { ingredient: 'flour', sku: 'FLR-5KG', topic: 'unit',
        label: 'Flour amount in grams', placeholder: 'e.g. 250 g',
        reason: '2 cups needs a confirmed mass. No density has been assumed.' }],
      ['approveOrderDraft', { revisionId: 'synthetic-revision-1', subtotalCents: 4450,
        currency: 'USD', lineCount: 4 }],
    ];
    const call = calls[turn - 1];
    const frames = [{ type: 'start', messageId: `synthetic-card-${turn}` }, { type: 'start-step' }];
    if (call) {
      frames.push({ type: 'tool-input-start', toolCallId: `synthetic-tool-${turn}`, toolName: call[0] });
      frames.push({ type: 'tool-input-delta', toolCallId: `synthetic-tool-${turn}`, inputTextDelta: '{' });
      frames.push({ type: 'tool-input-available', toolCallId: `synthetic-tool-${turn}`, toolName: call[0], input: call[1] });
    } else {
      frames.push({ type: 'text-start', id: 'done' },
        { type: 'text-delta', id: 'done', delta: 'Approved draft only. No order was sent.' },
        { type: 'text-end', id: 'done' });
    }
    frames.push({ type: 'finish-step' }, { type: 'finish', finishReason: call ? 'tool-calls' : 'stop' });
    const encoder = new TextEncoder();
    return new Response(new ReadableStream({
      async start(controller) {
        for (const frame of frames) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
          if (frame.type === 'tool-input-delta') await new Promise((done) => setTimeout(done, 400));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    }), { headers: { 'Content-Type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' } });
  };
}, { proposal });

async function check(name, action) {
  try {
    await action();
    checks.push({ name, result: 'passed' });
  } catch (error) {
    checks.push({ name, result: 'failed', message: error.message });
    await page.screenshot({ path: resolve(output, 'failure.png') });
    throw error;
  }
}

try {
  await page.goto(process.env.BASE_URL ?? 'http://localhost:3092');
  if (realRoute) {
    const health = await page.request.get(new URL('/api/chat', page.url()).href);
    assert.equal((await health.json()).mode, 'offline-synthetic', 'Real-route browser proof requires the explicit key-free offline demo.');
    await page.getByRole('textbox').first().pressSequentially('Load synthetic bistro stew, 4 servings');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await check('Real route shows a blocked draft and both review questions', async () => {
      await page.getByRole('textbox', { name: /Confirm flour amount/ }).waitFor({ timeout: 30000 });
      assert.equal(await page.getByRole('button', { name: 'Review draft', exact: true }).isDisabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Answer', exact: true }).count(), 2);
      await page.screenshot({ path: resolve(output, '01-real-blocked.png') });
    });
    await page.getByRole('textbox', { name: /Confirm flour amount/ }).fill('250 g');
    await page.getByRole('region', { name: 'Missing fact card' }).filter({ has: page.getByRole('textbox', { name: /Confirm flour amount/ }) }).getByRole('button', { name: 'Answer', exact: true }).click();
    await page.getByRole('textbox', { name: /onion/i }).fill('confirm each');
    await page.getByRole('button', { name: 'Answer', exact: true }).click();
    await page.getByRole('button', { name: 'Ask first', exact: true }).click();
    await check('Both answers resume the real route to the 4450c draft', async () => {
      await page.getByText('Draft subtotal USD 44.50', { exact: true }).waitFor({ timeout: 30000 });
      assert.equal(await page.getByRole('button', { name: 'Review draft', exact: true }).isEnabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Answer', exact: true }).count(), 0);
      await page.screenshot({ path: resolve(output, '02-real-resolved.png') });
    });
    await page.getByRole('button', { name: 'Review draft', exact: true }).click();
    await page.getByRole('button', { name: 'Approve draft', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm approval', exact: true }).click();
    await check('Final approval resumes the real route and leaves a draft', async () => {
      await page.getByText('The synthetic draft is reviewed. No order was placed.', { exact: true }).waitFor({ timeout: 30000 });
      assert.equal(await page.getByRole('button', { name: 'Approve draft', exact: true }).count(), 0);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: resolve(output, '03-real-approved.png') });
    });
  } else {
  await page.getByRole('textbox').first().pressSequentially('Show the synthetic worksheet.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await check('Partial tool arguments render without crashing', async () => {
    await page.getByRole('region', { name: 'Order worksheet card', exact: true }).waitFor({ timeout: 15000 });
    assert.deepEqual(errors, []);
  });
  await check('Worksheet shows demand, stock, packs, excess and source terms', async () => {
    for (const name of ['Ingredient / SKU', 'Demand', 'Stock deducted', 'Net need', 'Packs', 'Purchased', 'Excess', 'Pack price', 'Line subtotal', 'Source / quote date']) {
      assert.equal(await page.getByRole('columnheader', { name, exact: true }).count(), 1, name);
    }
    await page.screenshot({ path: resolve(output, '01-worksheet.png') });
  });
  await check('Invalid edits cannot submit', async () => {
    await page.getByRole('spinbutton', { name: 'Servings', exact: true }).fill('0');
    assert.equal(await page.getByRole('button', { name: 'Review draft', exact: true }).isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__cardRequests.length), 1);
  });
  await check('Edited servings and stock resume exactly once', async () => {
    await page.getByRole('spinbutton', { name: 'Servings', exact: true }).fill('40');
    await page.getByRole('spinbutton', { name: 'Stock amount 1', exact: true }).fill('2');
    await page.getByRole('button', { name: 'Review draft', exact: true }).click();
    await page.getByRole('textbox', { name: 'Flour amount in grams', exact: true }).waitFor();
    const results = await page.evaluate(() => window.__cardRequests[1].messages.flatMap((message) => message.parts ?? []).filter((part) => part.type === 'tool-proposeOrderDraft'));
    assert.deepEqual(results.at(-1).output, { approved: true, servings: 40, stockEdits: [{ ingredient: 'tomato', amount: 2, unit: 'kg' }] });
    assert.equal(await page.getByRole('button', { name: 'Review draft', exact: true }).count(), 0);
    await page.screenshot({ path: resolve(output, '02-edits-returned.png') });
  });
  await check('Focused answer resumes and becomes read only', async () => {
    const answer = page.getByRole('textbox', { name: 'Flour amount in grams', exact: true });
    await answer.fill('   ');
    assert.equal(await page.getByRole('button', { name: 'Answer', exact: true }).isDisabled(), true);
    await answer.fill('250 g');
    await page.getByRole('button', { name: 'Answer', exact: true }).click();
    await page.getByRole('button', { name: 'Approve draft', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Answer', exact: true }).count(), 0);
  });
  await check('Final approval preserves revision and resumes once', async () => {
    await page.getByRole('button', { name: 'Approve draft', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm approval', exact: true }).click();
    await page.getByText('Approved draft only. No order was sent.', { exact: true }).waitFor();
    const requests = await page.evaluate(() => window.__cardRequests);
    assert.equal(requests.length, 4);
    const parts = requests[3].messages.flatMap((message) => message.parts ?? []);
    assert.deepEqual(parts.filter((part) => part.type === 'tool-approveOrderDraft').at(-1).output,
      { approved: true, revisionId: 'synthetic-revision-1' });
    assert.equal(await page.getByRole('button', { name: 'Approve draft', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: resolve(output, '03-approved-draft.png') });
  });
  }
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  throw error;
} finally {
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ synthetic: true, realRoute, providerCalls: 0, checks, errors }, null, 2));
  await context.close();
  await browser.close();
  process.stdout.write(`${JSON.stringify(checks)}\n`);
}
