# Social mini harness

This folder owns post drafting, image briefs, assets, previews and published-link records. It has independent dependencies and checks. Read the parent AGENTS.md for shared project rules.

One directory per post under posts/. Keep post.json, image-prompt.md, the selected image and published-links.json together. Every post needs an image and descriptive alt text. State whether it is AI-generated, a screenshot, a photo or a graphic. An illustration must never be described as a working product screenshot.

Use the built-in image-generation tool for generated images in Codex and preserve the final prompt. Prefer Meta credits for application model experiments; image generation here is a separate built-in tool until a Meta image integration is explicitly implemented and verified.

Check supplied claims against evidence before publishing. Never invent adoption, accuracy or time-saved metrics. Generate editable drafts; do not post without a specific user instruction. Do not create Discord self-bots or assume webhook permissions in the organizer's server.

Run npm run check in this folder. Tests use the public composeUpdate boundary. Root code must not import social modules.
