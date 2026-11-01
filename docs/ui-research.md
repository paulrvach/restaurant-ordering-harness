# UI research: Apple, Google, shadcn, assistant-ui

Researched November 1, 2026. Two agents read the primary docs and every link below returned HTTP 200 during the pass. I audited the two pages this repo has today, then changed the one I own.

The repo has two pages. The order worksheet chat UI lives on PR #8 (`agent/issue-2-worksheet-1101a`, `web/`). I read it but did not touch it. Another agent owns that branch. The posting desk (`social/scripts/compose.ts`, generates `outputs/social/<id>/posting-desk.html`) lives on main with no open PR. That is the page I changed.

## What I checked

I read `docs/spec.md`, `GLOSSARY.md`, `src/ordering.ts`, `src/worksheet-tools.ts`, `social/src/compose.ts`, `social/scripts/compose.ts`, and the PR #8 files `web/app/page.tsx`, `web/components/worksheet-shell.tsx`, `web/components/tools/propose-order-draft.tsx`, `web/components/tools/request-missing-fact.tsx`, `web/components/tools/approve-order-draft.tsx`, and `web/components/tools/card-controls.tsx` through `git show`. No checkout was modified except my own worktree.

## Principles I kept

From Apple HIG and Material 3, cut to what applies to a review-before-approve tool.

1. People stay in charge of AI output. Every `planOrder` draft renders as a reviewable card with explicit approve and edit paths. Nothing exports on its own. [Apple HIG, Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai)
2. Interrupt only for real decisions. Blockers stay inline in the worksheet. No popups for routine recalculation. [Apple HIG, Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)
3. Dialogs are for required decisions, snackbars are for the rest. Final draft approval earns a focused review step. Routine updates stay inline. [M3 dialogs](https://m3.material.io/components/dialogs/guidelines)
4. Say what happens in plain words. The approval card states packs, subtotal, excess, and that export writes a file and places no order. [M3 UX writing](https://m3.material.io/foundations/content-design/style-guide/ux-writing-best-practices)
5. One card holds one subject. One card per order draft, one per channel on the desk. The desk already does this. [M3 cards](https://m3.material.io/components/cards/overview)
6. Every field gets a label and a hint. Each review question states what to type and why it blocks. [M3 text fields](https://m3.material.io/components/text-fields/guidelines)
7. Headlines ask one specific question. "How many grams per cup of flour?" beats "Warning!" [M3 dialogs](https://m3.material.io/components/dialogs/guidelines)
8. Feedback weight matches significance. Draft and blocked states sit inline next to the items they describe. Blockers use icon plus text, never red alone. [Apple HIG, Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback)
9. Transient notices need an inline twin on web. Copy success stays in the `#notice` line beside the buttons, not in a timed toast. [M3 snackbar](https://m3.material.io/components/snackbar/guidelines)
10. Text holds 4.5:1, control boundaries hold 3:1. I measured the desk palette with a script. Body and button text passed. The textarea border failed at 1.98:1 and the card border at 1.22:1. Both now pass. [M3 color contrast](https://m3.material.io/foundations/designing/color-contrast)
11. Semantic colors beat fixed hex. The desk now uses CSS variables with a `prefers-color-scheme` dark set, so a dark viewer or extension keeps it legible. [Apple HIG, Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
12. 44pt targets, text scaling, screen reader names. Copy buttons now guarantee 44px height. Labels stay attached at large text sizes. [Apple HIG, Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) and [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

## Components I mapped

assistant-ui covers the worksheet chat. shadcn covers the card patterns, and its desk-relevant pieces translate to plain CSS because the desk ships no React.

- Tool UI renders each gate as a card with loading, result, and interactive states. It already backs all three gates. [assistant-ui Tool UI](https://www.assistant-ui.com/docs/tools/tool-ui)
- Thread owns the scroll container and empty states for the worksheet conversation. [Thread](https://www.assistant-ui.com/docs/primitives/thread)
- Message renders one turn, including turns that embed a gate card. [Message](https://www.assistant-ui.com/docs/primitives/message)
- Composer handles free-text follow-ups outside the gates. [Composer](https://www.assistant-ui.com/docs/primitives/composer)
- ActionBar adds per-message copy and retry. That fits copy-draft-text on a turn. [ActionBar](https://www.assistant-ui.com/docs/primitives/action-bar)
- Card gives the draft card header, content, and footer slots. [Card](https://ui.shadcn.com/docs/components/card)
- Table styles the draft lines (vendor, SKU, packs, demand, net, purchased, excess, subtotal). [Table](https://ui.shadcn.com/docs/components/table)
- Field binds label, control, and help text for servings and stock rows. It replaces the old Form docs, which now redirect. [Field](https://ui.shadcn.com/docs/components/field)
- Input fits servings, stock amounts, and the single-question answer box. [Input](https://ui.shadcn.com/docs/components/input)
- Textarea is the pattern source for the desk editors. [Textarea](https://ui.shadcn.com/docs/components/textarea)
- Button variants map to approve, copy, and channel-open actions. [Button](https://ui.shadcn.com/docs/components/button)
- Badge fits draft status and the image-kind tag. [Badge](https://ui.shadcn.com/docs/components/badge)
- Alert fits the issues list and the desk status line. [Alert](https://ui.shadcn.com/docs/components/alert)
- Alert Dialog fits final approval, bound to revision id plus subtotal. The desk publishes nothing so it needs no equivalent. [Alert Dialog](https://ui.shadcn.com/docs/components/alert-dialog)

Lower priority, verified: Toast (hand-roll on the desk, no sonner dep), Select (native select covers the unit enum), Label, Separator, Skeleton (loading state while `planOrder` computes), Dialog. [Toast](https://ui.shadcn.com/docs/components/toast) [Select](https://ui.shadcn.com/docs/components/select) [Label](https://ui.shadcn.com/docs/components/label) [Separator](https://ui.shadcn.com/docs/components/separator) [Skeleton](https://ui.shadcn.com/docs/components/skeleton) [Dialog](https://ui.shadcn.com/docs/components/dialog)

## What changed on the posting desk

`social/scripts/compose.ts` is the only code I edited. The desk keeps its single-file output and zero new dependencies.

- Semantic color tokens with a dark set. All text, borders, and buttons use CSS variables. `color-scheme: light dark` plus `prefers-color-scheme` keeps the cream page legible in dark viewers.
- Borders now pass 3:1. Textarea border moved from `#adbcb1` (1.98:1) to `#6f8478` (4.00:1). Card border moved from `#d8ded5` (1.22:1) to `#7d8f83` (3.06:1). You can see the old failure in the before shot. The cards were barely boxes.
- Copy buttons guarantee 44px height. Real thumbs, real phones.
- The status line is a callout that only renders once there is feedback. No empty box sits between the cards and the footer. It keeps `role="status"` and `aria-live="polite"`.
- The image kind is a badge pill instead of inline text.
- The X panel shows a live plain-character count while you edit, labeled as approximate because X rechecks weighted length. The composer link still rewrites on input.
- Footer links use the brand green with a visited state instead of default browser blue and purple.
- Focus ring keeps the amber `#bd6b20` at 3.55:1 in light and moves to `#e8a04c` (7.64:1) in dark.
- `prefers-reduced-motion` disables the button transition. There is one short transition and nothing else moves.

I left the green primary alone. The brand red fits artwork, not actions. Red copy buttons would read as destructive.

## What the worksheet page still needs

For the PR #8 branch, in priority order. I did not edit those files.

1. Replace the `#bbb` inline borders on the three tool cards with Card slots plus the Table pattern for draft lines. The 10-column table at 13px with `min-width: 960` forces horizontal scroll on a phone. Collapse to one vendor group per card on narrow screens, or move excess and source into a details row.
2. Wrap servings and stock rows in the Field pattern so each input carries its label, format hint, and why-it-blocks text. The current stock rows rely on placeholder and aria-label alone.
3. Give the approval card the Alert Dialog treatment. Approval binds to revision id. The dialog headline should ask the one question, like "Approve revision 3 at $44.50?" The current "Review and approve" heading plus two same-weight buttons undersells a binding decision.
4. Add a Skeleton or running CardNotice with real progress while `planOrder` computes. The current "Preparing..." text gives no sense of what is happening.
5. Add ActionBar copy on assistant turns so operators can lift draft text without retyping.
6. Never show draft versus blocked by color alone. Pair the badge with the words "Draft" or "Needs review".
7. Keep every confirmation in the transcript. A toast alone is not enough on web.

## Evidence

- `npm run check` passes at root and in `social/`.
- `discord.txt`, `x.txt`, and `drafts.json` are byte-identical before and after. Only the HTML changed.
- `C:/Users/Paul/AppData/Local/Temp/contrast.mjs` checks every text and boundary pair in both themes. All pass.
- Before and after screenshots sit at `C:/Users/Paul/AppData/Local/Temp/ui-before.html` and the regenerated `outputs/social/2026-10-31-intro/posting-desk.html`.
