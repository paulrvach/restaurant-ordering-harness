import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/).parse(process.argv[2]);
const brandDirection = await readFile(new URL('../brand/IMAGE-PROMPT.md', import.meta.url), 'utf8');
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
await writeFile(join(folder, 'image-prompt.md'), `${brandDirection.trim()}\n\n## Post-specific brief\n\nPurpose: illustrate this post's verified milestone.\nSubject: [describe the restaurant work].\nLayout: [workday photo + UI / table close-up / cutout collage].\nFormat: [landscape / square].\nText: [exact original headline, if wanted].\nEvidence: [real screenshot / clearly labeled concept].\n\n## Final prompt and generation record\n\n[Save the final prompt, generation method and selected version here.]\n\nGenerate with the built-in image tool in Codex, or supply an actual permitted screenshot/photo. Save the selected image as image.png and update the alt text.\n`, { flag: 'wx' });
await writeFile(join(folder, 'published-links.json'), JSON.stringify({ status: 'draft', discord: null, x: null, publishedAt: null }, null, 2) + '\n', { flag: 'wx' });
console.log(`Post scaffold created: ${folder}. Add the selected image before composing.`);
