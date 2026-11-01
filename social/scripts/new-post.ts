import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/).parse(process.argv[2]);
const folder = join(fileURLToPath(new URL('../posts/', import.meta.url)), id);
// Non-recursive creation fails on an existing post, preserving the prior content.
await mkdir(folder);
await writeFile(join(folder, 'post.json'), JSON.stringify({
  id, title: 'Replace with a specific milestone',
  progress: 'Describe only what you have verified.', next: 'Describe the next step.',
  ask: 'Ask one useful question.', evidenceUrl: 'https://github.com/paulrvach/restaurant-ordering-harness',
  xText: 'Write a concise, evidence-backed X update.',
  image: { file: 'image.png', alt: 'Describe the selected image after generating it.', kind: 'ai-generated' },
}, null, 2) + '\n', { flag: 'wx' });
await writeFile(join(folder, 'image-prompt.md'), '# Image brief\n\nPurpose: illustrate this post’s verified milestone.\n\nSubject: [describe].\nStyle: food editorial / restaurant operations.\nFormat: landscape for Discord and X.\nText: [exact headline, if wanted].\nAvoid: fake metrics, fake screenshots, private data, unsupported product claims.\n\nSave the final prompt and generation method here. Generate with the built-in image tool in Codex, or supply an actual permitted screenshot/photo. Save the selected image as image.png.\n', { flag: 'wx' });
await writeFile(join(folder, 'published-links.json'), JSON.stringify({ status: 'draft', discord: null, x: null, publishedAt: null }, null, 2) + '\n', { flag: 'wx' });
console.log(`Post scaffold created: ${folder}. Add the selected image before composing.`);
