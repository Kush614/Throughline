# Org Workstation

## Purpose

Provide an org-scoped workstation route at `/<org>/workstation` that uses the
upgraded minimal-doc editor as the editable company workspace surface.

## Current State

- `app/[org]/workstation/page.tsx` validates the org slug with `getOrg()` and
  renders the reusable `LivingDoc` editor.
- The org workstation uses `mode="blank"` so the first document opens with an
  empty title and empty paragraph instead of the seeded Atlas Q3 Launch content.
- The route stores drafts under `neverzero.<org>.workstation.*` localStorage
  keys, keeping org workstation content separate from `/doc-minimal`.
- `/atlas/install` now shows a `Workstation` nav link that points to
  `/atlas/workstation`.
- `/atlas`, `/atlas/agents`, and `/atlas/brain` link to the org-scoped
  workstation instead of the global prototype where relevant.

## Files And Entry Points

- `app/[org]/workstation/page.tsx`
- `app/doc-minimal/_components/LivingDoc.tsx`
- `app/[org]/page.tsx`
- `app/[org]/agents/page.tsx`
- `app/[org]/brain/page.tsx`
- `app/install/page.tsx`
- Browser route: `http://localhost:3000/atlas/workstation`

## Decisions

- Reuse the upgraded `/doc-minimal` editor engine rather than forking another
  editor for org workstations.
- Keep `/doc-minimal` seeded for the demo, but make `LivingDoc` configurable
  with blank mode, route-specific storage keys, and route-specific labels.
- Use localStorage for the org workstation draft until a server-backed document
  model exists.

## Open Tasks

- Connect org workstation content to server-backed org brain persistence when
  the data model is defined.
- Decide whether the global `/workstation` prototype should be replaced by the
  upgraded minimal-doc editor or remain as the rich static prototype.
