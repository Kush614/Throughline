# Brain File Sidebar

## Purpose

Make the org brain sidebar a real server-backed file tree instead of a static
list, so users can create and delete company brain files from `/atlas/brain`
and `/<org>/docs/<id>`.

## Current State

- `POST /api/orgs/<slug>/docs` creates a subfile under the root brain doc or a
  supplied parent doc.
- `DELETE /api/orgs/<slug>/docs/<id>` deletes a subfile and any nested child
  subfiles. Root brain docs cannot be deleted.
- `PATCH /api/orgs/<slug>/docs/<id>` can update title/content for non-root docs.
- `BrainWorkstation` now receives `brainDocId` and each subfile `parentId`, builds
  a nested tree, and uses the same sidebar on the brain root and subfile pages.
- The sidebar header plus action creates the next `New file` immediately and
  navigates to the created subfile.
- Active file rows expose create/delete actions without hover so the flow is
  easy to demo and automate.

## Files And Entry Points

- `app/[org]/brain/_components/BrainWorkstation.tsx`
- `app/[org]/brain/page.tsx`
- `app/[org]/docs/[id]/page.tsx`
- `app/api/orgs/[slug]/docs/route.ts`
- `app/api/orgs/[slug]/docs/[id]/route.ts`
- `lib/docs.ts`
- `app/workstation/workstation.css`
- Browser route: `http://localhost:3000/atlas/brain`

## Decisions

- The org brain uses the file-backed `data/docs.json` document model, not the
  localStorage-only file tree from `LivingDoc`.
- Create/delete are immediate sidebar actions to match the workstation demo's
  low-friction file controls.
- Deleting an active subfile routes back to the company brain root.
- Nested subfiles are supported by the API and tree builder through `parentId`.

## Open Tasks

- Add inline rename UI now that the backend has `PATCH`.
- Decide whether `/atlas/workstation` should move from localStorage drafts to
  the same server-backed org brain docs model.
- Consider adding a soft-delete or undo affordance if users need safer deletes.
