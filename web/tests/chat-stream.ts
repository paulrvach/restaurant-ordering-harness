import assert from 'node:assert/strict';
import type { UIMessage } from 'ai';
process.env.WORKSHEET_OFFLINE_DEMO = '1';
const { GET, POST } = await import('../app/api/chat/route');

function request(id: string, messages: UIMessage[], cookie = '') {
  return new Request('http://localhost/api/chat', { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify({ id, messages }) });
}
function user(text: string): UIMessage { return { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }] }; }
function chunks(text: string): Record<string, unknown>[] {
  return text.split('\n').filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));
}
const health = await GET();
assert.equal(health.status, 200);
assert.equal((await health.json()).mode, 'offline-synthetic');
for (const part of [null, 1, 'text', {}, { type: 'text', text: 4 }]) {
  const malformedPart = await POST(new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ id: 'bad-parts', messages: [{ id: 'bad', role: 'user', parts: [part] }] }) }));
  assert.equal(malformedPart.status, 400);
}
const afterMalformed = await POST(request('after-malformed', [user('Hello')]));
assert.equal(afterMalformed.status, 200);
await afterMalformed.text();
const response = await POST(request('plain', [user('Hello')]));
assert.equal(response.status, 200);
assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
assert.equal((await POST(request('busy', [user('Hello')]))).status, 429);
const output = await response.text();
assert.match(output, /text-delta/);
assert.match(output, /Offline synthetic chat is ready/);
assert.match(output, /\[DONE\]/);
assert.doesNotMatch(output, /"type":"error"/);
console.log('PASS actual core 1.81.0 -> mastra-ai-sdk 1.11.3 -> AI SDK v7 SSE, offline model; concurrency 1');

const parallel = await Promise.all([POST(request('parallel-a', [user('Hello')])), POST(request('parallel-b', [user('Hello')]))]);
assert.deepEqual(parallel.map(result => result.status).sort(), [200, 429]);
await parallel.find(result => result.status === 200)!.text();
const messages: UIMessage[] = [user('Load synthetic bistro stew, 4 servings')];
const first = await POST(request('bistro', messages));
assert.equal(first.status, 200);
const cookie = first.headers.get('set-cookie')!.split(';')[0]!;
const firstCalls = chunks(await first.text()).filter(part => part.type === 'tool-input-available');
assert.equal(firstCalls.length, 3);
const proposal = firstCalls.find(part => part.toolName === 'proposeOrderDraft')!;
assert.equal((proposal.input as any).draft.subtotalCents, null);
assert.deepEqual(firstCalls.filter(part => part.toolName === 'requestMissingFact').map(part => (part.input as any).topic).sort(), ['unit', 'yield']);
messages.push({ id: 'first-gates', role: 'assistant', parts: firstCalls.map(call => ({ type: `tool-${call.toolName}`, toolCallId: call.toolCallId, input: call.input, state: 'output-available', output: call.toolName === 'proposeOrderDraft'
  ? { approved: false, servings: 4, stockEdits: [] }
  : { ...(call.input as object), value: (call.input as any).topic === 'unit' ? '250 g' : 'confirm each' } })) as UIMessage['parts'] });
const second = await POST(request('bistro', messages, cookie));
assert.equal(second.status, 200);
const secondCalls = chunks(await second.text()).filter(part => part.type === 'tool-input-available');
assert.equal(secondCalls.length, 1);
assert.equal(secondCalls[0]!.toolName, 'proposeOrderDraft');
assert.equal((secondCalls[0]!.input as any).draft.subtotalCents, 4450);
const reorderFirst = await POST(request('bistro-reordered', [user('Load synthetic bistro stew, 4 servings')], cookie));
assert.equal(reorderFirst.status, 200);
const reorderCalls = chunks(await reorderFirst.text()).filter(part => part.type === 'tool-input-available');
assert.equal(reorderCalls.length, 3);
const reorderProposal = reorderCalls.find(part => part.toolName === 'proposeOrderDraft')!;
const reorderQuestions = reorderCalls.filter(part => part.toolName === 'requestMissingFact');
const reorderMessages: UIMessage[] = [user('Load synthetic bistro stew, 4 servings')];
const answerFor = (call: Record<string, unknown>) => call.toolName === 'proposeOrderDraft'
  ? { approved: false, servings: 4, stockEdits: [] }
  : { ...(call.input as object), value: (call.input as any).topic === 'unit' ? '250 g' : 'confirm each' };
reorderMessages.push({ id: 'reordered-gates', role: 'assistant', parts: [...reorderQuestions, reorderProposal].map(call => ({ type: `tool-${call.toolName}`, toolCallId: call.toolCallId, input: call.input, state: 'output-available', output: answerFor(call) })) as UIMessage['parts'] });
const reordered = await POST(request('bistro-reordered', reorderMessages, cookie));
assert.equal(reordered.status, 200);
const reorderedCalls = chunks(await reordered.text()).filter(part => part.type === 'tool-input-available');
assert.equal(reorderedCalls.length, 1);
assert.equal(reorderedCalls[0]!.toolName, 'proposeOrderDraft');
assert.equal((reorderedCalls[0]!.input as any).draft.subtotalCents, 4450);
console.log('PASS question-first batch continuation resolves to the same 4450c draft');
const dupFirst = await POST(request('bistro-duplicate', [user('Load synthetic bistro stew, 4 servings')], cookie));
assert.equal(dupFirst.status, 200);
const dupCalls = chunks(await dupFirst.text()).filter(part => part.type === 'tool-input-available');
assert.equal(dupCalls.length, 3);
const dupProposal = dupCalls.find(part => part.toolName === 'proposeOrderDraft')!;
const dupQuestions = dupCalls.filter(part => part.toolName === 'requestMissingFact');
const dupAnswer = (call: Record<string, unknown>) => call.toolName === 'proposeOrderDraft'
  ? { approved: false, servings: 4, stockEdits: [] }
  : { ...(call.input as object), value: (call.input as any).topic === 'unit' ? '250 g' : 'confirm each' };
const dupParts = [...dupQuestions, dupProposal].map(call => ({ type: `tool-${call.toolName}`, toolCallId: call.toolCallId, input: call.input, state: 'output-available', output: dupAnswer(call) }));
const dupMessages: UIMessage[] = [user('Load synthetic bistro stew, 4 servings')];
dupMessages.push({ id: 'dup-gates', role: 'assistant', parts: [...dupParts, structuredClone(dupParts[0]!)] as UIMessage['parts'] });
const duped = await POST(request('bistro-duplicate', dupMessages, cookie));
assert.equal(duped.status, 200);
const dupedCalls = chunks(await duped.text()).filter(part => part.type === 'tool-input-available');
assert.equal(dupedCalls.length, 1);
assert.equal((dupedCalls[0]!.input as any).draft.subtotalCents, 4450);
console.log('PASS repeated identical answers in one batch apply once');
const resolved = secondCalls[0]!;
messages.push({ id: 'resolved-gate', role: 'assistant', parts: [{ type: 'tool-proposeOrderDraft', toolCallId: resolved.toolCallId as string, input: resolved.input, state: 'output-available', output: { approved: true, servings: 4, stockEdits: [] } }] });
const third = await POST(request('bistro', messages, cookie));
assert.equal(third.status, 200);
const approval = chunks(await third.text()).find(part => part.type === 'tool-input-available' && part.toolName === 'approveOrderDraft')!;
assert.equal((approval.input as any).subtotalCents, 4450);
const tampered = structuredClone(messages);
(tampered[2]!.parts[0] as any).input.draft.subtotalCents = 1;
assert.equal((await POST(request('bistro', tampered, cookie))).status, 409);
assert.equal((await POST(request('other-thread', tampered, cookie))).status, 409);
const changedResult = structuredClone(messages);
(changedResult[1]!.parts[0] as any).output.approved = true;
assert.equal((await POST(request('bistro', changedResult, cookie))).status, 409);
const separate = await POST(request('new-thread', [user('Load synthetic bistro stew, 4 servings')], cookie));
const separateCalls = chunks(await separate.text()).filter(part => part.type === 'tool-input-available');
assert.equal((separateCalls.find(part => part.toolName === 'proposeOrderDraft')!.input as any).draft.subtotalCents, null);
const greeting = await POST(request('greet-tomato', [user('Hello')]));
const greetingCookie = greeting.headers.get('set-cookie')!.split(';')[0]!;
await greeting.text();
const tomato = await POST(request('greet-tomato', [user('Hello'), user('Load synthetic tomato soup')], greetingCookie));
const tomatoCalls = chunks(await tomato.text()).filter(part => part.type === 'tool-input-available');
assert.equal(tomatoCalls.length, 1);
assert.equal((tomatoCalls[0]!.input as any).draft.lines.length, 1);
assert.equal((await POST(request('unsupported', [user('Make a pancake recipe')]))).status, 400);
console.log('PASS real-route client tool continuation: blocked flour/yield -> 4450c -> exact-revision approval; threads isolated');

for (const body of ['null', '{}', '{']) assert.equal((await POST(new Request('http://localhost/api/chat', { method: 'POST', body }))).status, 400);
delete process.env.WORKSHEET_OFFLINE_DEMO;
delete process.env.META_MODEL_API_KEY;
assert.equal((await POST(request('no-key', [user('Hello')]))).status, 503);
console.log('PASS malformed request 400 and missing server configuration 503 without provider calls');
