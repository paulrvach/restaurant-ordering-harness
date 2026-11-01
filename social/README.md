# Social mini harness

An independent tool for turning one verified milestone into a Discord draft, X draft and accompanying image. It shares the repository with the restaurant app but has its own dependencies, commands and tests. No app module imports it.

```powershell
cd social
npm ci
npm run check
npm run compose
```

The first share pack is written to `../outputs/social/2026-10-31-intro/`. Open `posting-desk.html` to edit/copy drafts, download the image and open the destinations. Images must be attached in Discord/X; a composer link only carries text. Edits in the preview are temporary; save lasting changes in the post's JSON and regenerate.

Create the next post:

```powershell
npm run new -- 2026-11-01-first-live-eval
# Edit posts/2026-11-01-first-live-eval/post.json and image-prompt.md.
# Ask Codex to generate the brief's image, or supply a permitted screenshot/photo.
# Save the selected image as image.png and write accurate alt text.
npm run compose -- posts/2026-11-01-first-live-eval/post.json
```

Each `posts/<id>/` contains `post.json`, `image-prompt.md`, the selected image and `published-links.json`. Every share pack needs an image; composition fails if the file is missing. After publishing, record the actual Discord/X URLs. Never mark a draft as published just because it was copied.

The first image was made with Codex's built-in image tool and is a concept illustration, not a working app screenshot. Its exact prompt is saved beside it. Built-in generation does not consume the project's Meta API credits. A future Muse Image adapter can use those credits once its key, entitlement and API behavior are verified; this tool does not claim that integration exists.

The default aesthetic follows [A Day in HR](https://motionimo.xyz/video/a-day-in-hr): mixed-media photography, enlarged software UI, clean sans-serif typography, green/mint operational graphics and playful cutout collage. The actionable [brand guidelines](brand/GUIDELINES.md), [shared image brief](brand/IMAGE-PROMPT.md) and [tokens](brand/tokens.json) are saved in `brand/`. New post scaffolds include this direction automatically. The first image predates these guidelines; its original generation record is preserved.

X length validation uses twitter-text's weighted counting. The generator validates HTTPS links without embedded credentials, but it cannot establish whether a claim is true or a URL is safe to publish. Review drafts and assets. Do not include private catalogs, keys or personal information.

Discord organizer-channel webhooks require permission; no such permission is assumed. Manual copy/attach/send works without bot installation or storing a user token. The optional future authenticated API integration would remain separate from draft generation.

Sources: [Discord webhooks](https://discord.com/developers/docs/resources/webhook), [Discord self-bot policy](https://support.discord.com/hc/en-us/articles/115002192352-Automated-User-Accounts-Self-Bots), [X create post API](https://docs.x.com/x-api/posts/create-post), [hackathon guide](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details).
