import { z } from 'zod';
import twitterText from 'twitter-text';

const publicLink = z.url().refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'Use a public HTTPS link without embedded credentials.');
export const milestoneSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
  title: z.string().min(1).max(80), progress: z.string().min(1).max(1200),
  next: z.string().min(1).max(500), ask: z.string().max(500).default(''),
  evidenceUrl: publicLink,
  xText: z.string().min(1).optional(),
  image: z.object({
    file: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(png|jpg|jpeg|webp)$/),
    alt: z.string().min(1).max(1000),
    kind: z.enum(['ai-generated', 'screenshot', 'photo', 'graphic']),
  }),
}).strict();

/** Only formats supplied claims. The owner verifies evidence and publishes. */
export function composeUpdate(raw: unknown) {
  const input = milestoneSchema.parse(raw);
  const discord = [
    `**${input.title}**`, input.progress, `Next: ${input.next}`,
    input.ask, `Evidence: ${input.evidenceUrl}`,
  ].filter(Boolean).join('\n\n');
  const x = input.xText ?? `${input.title}\n\n${input.progress}\n\n${input.evidenceUrl}`;
  const parsed = twitterText.parseTweet(x);
  if (!parsed.valid) throw new Error(`X draft is invalid (${parsed.weightedLength} weighted characters). Supply a shorter xText.`);
  if (discord.length > 2000) throw new Error('Discord draft exceeds 2,000 characters. Shorten it.');
  return { status: 'draft' as const, discord, x, xWeightedLength: parsed.weightedLength,
    id: input.id, image: input.image,
    xIntentUrl: `https://x.com/intent/post?${new URLSearchParams({ text: x })}`,
    discordChannelUrl: 'https://discord.com/channels/1557169028080869426/1557169028848422946',
  };
}
