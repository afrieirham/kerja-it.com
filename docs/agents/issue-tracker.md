# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `afrieirham/kerja-it.com`.
Use the `gh` CLI from this clone.

## Operations

- Create: `gh issue create --title "..." --body-file <file>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels`.
- Comment: `gh issue comment <number> --body-file <file>`.
- Label: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number> --comment "..."`.

For multiline bodies, write the text to a temporary file and pass
`--body-file`.

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the GitHub issue.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Wayfinding

A map is an issue labelled `wayfinder:map`. Link child tickets as native
GitHub sub-issues where available; otherwise use a task list in the map
and `Part of #<map>` in each child.

Label children `wayfinder:<type>`, where type is `research`, `prototype`,
`grilling`, or `task`.

Record blockers with native issue dependencies where available;
otherwise use `Blocked by: #<number>` in the child body.

Choose the first open child in map order with no open blockers and no
assignee. Claim it with `gh issue edit <number> --add-assignee @me`.
Resolve it by commenting with the result, closing it, and adding a
summary and link to the map's Decisions-so-far.
