import { readFile, mkdir, writeFile, copyFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeUpdate } from '../src/compose.js';

const socialRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const inputFile = resolve(socialRoot, process.argv[2] ?? 'posts/2026-10-31-intro/post.json');
const draft = composeUpdate(JSON.parse(await readFile(inputFile, 'utf8')));
const imagePath = join(dirname(inputFile), draft.image.file);
await access(imagePath); // Every post needs its selected image before rendering a share pack.
const outputDir = join(repoRoot, 'outputs/social', draft.id);
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hackathon posting desk</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f2eb;color:#18332a;font:16px/1.5 system-ui,sans-serif}main{max-width:1040px;margin:auto;padding:40px 24px}h1{font-size:36px;line-height:1.15;margin:12px 0}h2{font-size:20px}p{max-width:75ch}.eyebrow{letter-spacing:.12em;font-size:12px;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:32px}section{background:#fffefa;border:1px solid #d8ded5;border-radius:16px;padding:24px}textarea{display:block;width:100%;height:340px;resize:vertical;border:1px solid #adbcb1;border-radius:8px;padding:16px;font:inherit;color:inherit;background:#fff}nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}button,a.button{font:inherit;border:1px solid #22654c;background:#22654c;color:white;border-radius:8px;padding:10px 14px;text-decoration:none;cursor:pointer}a.secondary{background:transparent;color:#22654c}small{display:block;margin-top:12px;color:#415b50}#notice{min-height:24px}@media(max-width:700px){.grid{grid-template-columns:1fr}main{padding:24px 16px}h1{font-size:28px}}:focus-visible{outline:3px solid #bd6b20;outline-offset:3px}
</style></head><body><main><div class="eyebrow">META HACKATHON · BUILD IN PUBLIC</div><h1>Your next update, ready to review.</h1>
<p>Edit the drafts, check every claim and evidence link, then copy them into the appropriate channel. This desk does not publish anything.</p>
<p>Submission deadline: <strong>November 4 · 6:00 PM Pacific</strong>. For the viral award, submit the published demo post URL in the CV form.</p>
<section><h2>Post image · ${escape(draft.image.kind)}</h2><img src="${escape(draft.image.file)}" alt="${escape(draft.image.alt)}" style="display:block;width:100%;max-height:460px;object-fit:contain;border-radius:8px"><p>${escape(draft.image.alt)}</p><a class="button secondary" href="${escape(draft.image.file)}" download>Download post image</a><small>Attach this image in Discord/X after copying your text. The X composer link does not upload media.</small></section>
<div class="grid"><section><h2>Discord · project progress</h2><label for="discord">Draft</label><textarea id="discord">${escape(draft.discord)}</textarea><nav><button type="button" data-copy="discord">Copy Discord draft</button><a class="button secondary" href="${escape(draft.discordChannelUrl)}" target="_blank" rel="noopener noreferrer">Open channel</a></nav><small>Use #intros for your introduction. Check the channel’s rules before sharing progress.</small></section>
<section><h2>X · public update</h2><label for="x">Draft</label><textarea id="x">${escape(draft.x)}</textarea><nav><button type="button" data-copy="x">Copy X draft</button><a class="button secondary" id="open-x" href="${escape(draft.xIntentUrl)}" target="_blank" rel="noopener noreferrer">Open X composer</a></nav><small>Generated draft: ${draft.xWeightedLength} weighted characters. X checks the length again after your edits. Attach a real screenshot or demo in X.</small></section></div>
<p id="notice" role="status" aria-live="polite"></p><p><a href="https://github.com/paulrvach/restaurant-ordering-harness">Repository</a> · <a href="https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details">Participant guide</a> · <a href="https://cerebralvalley.ai/e/meta-ai-developer-hackathon/hackathon/submit">Submission</a></p>
<script>
const fields={discord:document.getElementById('discord'),x:document.getElementById('x')};
const notice=document.getElementById('notice');
document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
const field=fields[button.dataset.copy];try{await navigator.clipboard.writeText(field.value);notice.textContent='Copied. Review in the destination before publishing.';}catch{field.focus();field.select();notice.textContent=document.execCommand('copy')?'Copied.':'Select the draft and press Ctrl+C to copy.';}}));
fields.x.addEventListener('input',()=>{document.getElementById('open-x').href='https://x.com/intent/post?'+new URLSearchParams({text:fields.x.value});});
</script></main></body></html>`;
await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'posting-desk.html'), html);
await writeFile(join(outputDir, 'discord.txt'), draft.discord + '\n');
await writeFile(join(outputDir, 'x.txt'), draft.x + '\n');
await writeFile(join(outputDir, 'alt-text.txt'), draft.image.alt + '\n');
await writeFile(join(outputDir, 'drafts.json'), JSON.stringify(draft, null, 2) + '\n');
await copyFile(imagePath, join(outputDir, draft.image.file));
try { await copyFile(join(dirname(inputFile), 'image-prompt.md'), join(outputDir, 'image-prompt.md')); }
catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
console.log(`Share pack with image saved to ${outputDir}. No message was posted.`);
