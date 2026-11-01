import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Worksheet cards render on real shadcn components over the installed
// assistant-ui primitives. The hand-rolled card/table/badge CSS is gone.
const draft = readFileSync(new URL('../components/tools/propose-order-draft.tsx', import.meta.url), 'utf8');
const missing = readFileSync(new URL('../components/tools/request-missing-fact.tsx', import.meta.url), 'utf8');
const approval = readFileSync(new URL('../components/tools/approve-order-draft.tsx', import.meta.url), 'utf8');
const thread = readFileSync(new URL('../components/thread.tsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../components/worksheet-shell.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

for (const [name, source] of [['draft', draft], ['missing-fact', missing], ['approval', approval]] as const) {
  assert.doesNotMatch(source, /#bbb/, `${name} card still uses an inline #bbb border`);
  assert.doesNotMatch(source, /card-header|card-content|card-footer/, `${name} card still uses the removed hand-rolled slots`);
  assert.match(source, /ui\/card/, `${name} card does not use the shadcn Card`);
}

// Draft lines use the shadcn Table with every column header the smoke test needs.
assert.match(draft, /ui\/table/, 'draft lines do not use the shadcn Table');
assert.match(draft, /ui\/badge/, 'draft card has no status Badge');
assert.match(draft, /Needs review/, 'draft card never says "Needs review"');

// Servings and stock rows carry Field labels, hints and blocking text.
assert.match(draft, /ui\/field/, 'draft form does not use the shadcn Field');
assert.match(missing, /ui\/field/, 'missing-fact card does not use the shadcn Field');
assert.match(missing, /ui\/input/, 'missing-fact card does not use the shadcn Input');

// Final approval is a revision-bound Alert Dialog, never two same-weight buttons alone.
assert.match(approval, /ui\/alert-dialog/, 'approval card does not use the shadcn Alert Dialog');
assert.match(approval, /AlertDialogAction/, 'approval dialog has no explicit confirm action');

// Assistant turns expose copy through the ActionBar primitive.
assert.match(thread, /ActionBarPrimitive/, 'thread has no ActionBar copy on assistant turns');

// The inspector still reads server-owned worksheet state, never its own copy.
assert.match(shell, /worksheetView/, 'shell no longer reads the worksheet view');
assert.match(shell, /ui\/badge/, 'shell does not badge worksheet status');

// The old stylesheet is fully replaced by Tailwind plus shadcn tokens.
assert.match(css, /@import "tailwindcss"/, 'globals.css does not load Tailwind');
assert.doesNotMatch(css, /\.worksheet-app|\.recipe-sidebar|\.draft-badge/, 'globals.css still carries the removed layout classes');

console.log('PASS card structure: shadcn Card/Table/Badge/Field/AlertDialog, ActionBar copy, no legacy styles');
