import { expect, test } from 'vitest';
import { composeUpdate } from '../src/compose.js';

const milestone = {
  id: 'sample-post',
  image: { file: 'image.png', alt: 'Recipe and vendor order concept illustration', kind: 'ai-generated' },
  title: 'Recipe to order harness',
  progress: 'Started an eval-first restaurant ordering project.',
  next: 'Test recipe scaling and vendor pack rounding.',
  ask: 'Restaurant operators: which vendor order format causes the most work?',
  evidenceUrl: 'https://github.com/paulrvach/restaurant-ordering-harness',
};
test('builder gets Discord and X drafts with supplied evidence and correct destinations', () => {
  const result = composeUpdate(milestone);
  expect(result.status).toBe('draft');
  expect(result.discord).toContain(milestone.progress);
  expect(result.discord).toContain(milestone.ask);
  expect(result.discord).toContain(milestone.evidenceUrl);
  expect(new URL(result.xIntentUrl).searchParams.get('text')).toBe(result.x);
  expect(new URL(result.xIntentUrl).hostname).toBe('x.com');
  expect(result.discordChannelUrl).toBe('https://discord.com/channels/1557169028080869426/1557169028848422946');
  expect(result.x).not.toContain('accuracy');
  expect(result.image).toEqual({ file: 'image.png', alt: 'Recipe and vendor order concept illustration', kind: 'ai-generated' });
});

test('builder must shorten oversized Unicode drafts and use credential-free links', () => {
  expect(() => composeUpdate({ ...milestone, xText: '餐'.repeat(141) })).toThrow('shorter');
  expect(() => composeUpdate({ ...milestone, evidenceUrl: 'https://name:password@example.com' })).toThrow();
  expect(() => composeUpdate({ ...milestone, evidenceUrl: 'javascript:alert(1)' })).toThrow();
});
