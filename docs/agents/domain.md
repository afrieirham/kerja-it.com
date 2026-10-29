# Domain docs

This repo uses a single-context layout across `web/` and `scraper/`:

- `GLOSSARY.md` at the repo root defines shared domain vocabulary.
- `docs/adr/` holds architecture decision records.

## Before exploring

Read `GLOSSARY.md` and ADRs relevant to the area being explored.

If either is absent, proceed silently. Domain documentation is created
lazily through the domain-modeling skill when terms or decisions are
resolved.

## Use shared vocabulary

Use glossary terms in issue titles, proposals, hypotheses, and test names.
For missing concepts, reconsider invented terminology or note the gap
for domain-modeling.

## Surface decision conflicts

When a proposal contradicts an existing ADR, identify the ADR and explain
why the decision should be reconsidered.
