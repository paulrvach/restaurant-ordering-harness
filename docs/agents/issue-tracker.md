# Issue tracker: GitHub

Issues and specs live in https://github.com/paulrvach/restaurant-ordering-harness/issues. The user selected GitHub Issues; do not create a parallel local issue tracker.

Use `gh` from this repository. Before writes, verify `gh repo view --json nameWithOwner` is `paulrvach/restaurant-ordering-harness`.

- Create: `gh issue create --title <title> --body-file <file>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Close only when acceptance criteria are achieved; add evidence first.

Use one issue per approved vertical slice, explicit acceptance criteria and native blocking dependencies where available. Otherwise add `Blocked by: #N` in the issue body. Create labels explicitly before using them; no triage vocabulary is configured yet. PRs as a request surface: no.

When a skill says publish to the issue tracker, create a GitHub issue. When it says fetch a ticket, read its body and comments.
