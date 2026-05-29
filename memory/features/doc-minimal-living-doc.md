# Doc Minimal Living Doc

## Purpose

Make `/doc-minimal` behave like a Notion-style living document where every line
is editable and slash commands can create tasks, routines, skill calls, durable
memory, decisions, and new project skills.

## Current State

- `/doc-minimal` is a Next App Router route.
- `app/doc-minimal/page.tsx` imports the workstation visual system and renders
  `LivingDoc` inside a `.workstation-root.doc-minimal-workstation` shell.
- `app/doc-minimal/_components/LivingDoc.tsx` owns the editable document state,
  slash command menu, routine blocks, skill invocation blocks, skill creation
  blocks, autosave, activity feed, local persistence, and the workstation-style
  top bar, sidebar, right rail, command palette, and compose bar for this route.
- `LivingDoc` is now configurable. The default mode keeps `/doc-minimal` seeded
  with the Atlas Q3 Launch content, while `mode="blank"` starts with an empty
  title and paragraph for org-scoped workstations such as `/atlas/workstation`.
- `LivingDoc` accepts route-specific storage namespace and label props so
  `/doc-minimal` and org workstations do not share localStorage drafts.
- The workstation sidebar includes a persistent editable file tree for the
  Atlas Q3 Launch hierarchy:
  `README > Launch plan, Research notes > Pricing teardown, Onboarding flows,
  Decisions, Deploys`.
- File tree users can add nested files, rename files inline by editing the
  filename directly, delete files, and expand/collapse branches. The root
  `README` branch is kept as the default project container.
- File tree state persists in `localStorage` under
  `neverzero.doc-minimal.file-tree.v1`.
- File tree rows use a fixed grid layout so the disclosure toggle, file icon,
  filename, count, and hover-only create/delete actions stay aligned. Hidden
  actions are absolutely positioned and do not consume row width, and actions
  are suppressed while a filename input is active so editing is not obstructed.
- File row icons are selected from the file name. For example, decision files
  use the decision icon, deploy/release files use the branch icon, and
  launch/plan/task files use the plan icon.
- `app/doc-minimal/doc-minimal.css` now contains workstation-scoped editor
  overrides for editable blocks, block handles, slash menu, routine controls,
  skill controls, the command palette, sidebar file-tree controls, and
  responsive layout.
- Every document block has an editable main line using `contentEditable`.
- Pressing `/` inside a line opens the slash command menu.
- Pressing `Enter` creates a new editable line. Pressing `Backspace` on an empty
  non-title line removes it.
- The title line remains editable text but does not run slash commands, so a
  slash command cannot accidentally replace the document title.
- Saved drafts are repaired back to the initial document if localStorage no
  longer contains a title block.
- Document blocks autosave to `localStorage` under
  `neverzero.doc-minimal.blocks.v1`.
- Draft hydration now reads localStorage before autosave writes, so an existing
  saved document is not overwritten by the seeded defaults during first render.
- `/routine` creates a recurring task block with editable frequency, next run,
  and owner fields.
- `/skill` creates a skill invocation block. Named skill commands such as
  `/research`, `/scaffold`, `/review`, `/deploy`, `/remember`, `/recall`,
  `/compress`, `/handoff`, `/conflict-check`, and `/qa` create focused skill
  call blocks.
- `/create-skill` creates an inline skill creation form.
- Created skills are written through `POST /api/skills` to
  `skills/<slug>/SKILL.md` and then become available in the document skill
  registry.
- `GET /api/skills` reads existing repo-local skill directories and returns them
  to the editor.
- The Memory and Context rail tabs are UI-only previews for now. Their
  persistence/runtime wiring is intentionally deferred until the user defines
  that behavior.

## Files And Entry Points

- `app/doc-minimal/page.tsx`
- `app/doc-minimal/_components/LivingDoc.tsx`
- `app/doc-minimal/doc-minimal.css`
- `app/api/skills/route.ts`
- Browser route: `http://localhost:3000/doc-minimal`
- Reused browser route: `http://localhost:3000/atlas/workstation`
- Created skill file shape: `skills/<skill-name>/SKILL.md`

## Decisions

- Keep the editor client-side for fast document interactions and use localStorage
  for draft document persistence.
- Use a server-side API route only where filesystem access is required:
  creating and listing project skill files.
- Store generated skills under a repo-local `skills/` directory so future agents
  and the app can inspect the same files.
- Keep `page.tsx` small so the editor can grow without mixing route code,
  stateful UI, and filesystem API behavior.
- Avoid adding an external editor library for now. The demo needs local-first
  editable blocks and slash commands more than production-grade collaborative
  CRDT editing.
- Reuse the existing `/doc-minimal` editor engine instead of replacing it with
  the static `/workstation` document. The workstation route provides the UI
  shell and visual language; `/doc-minimal` keeps the interactive block model.
- Keep memory/context internals out of this pass. The UI affordances are present
  so the page matches the workstation direction, but the runtime contract is not
  implemented here.
- Store the file hierarchy client-side for now because these are document
  navigation affordances, not real filesystem writes. The user asked to preserve
  the visible hierarchy; a backend document/file model can replace localStorage
  later without changing the sidebar interaction pattern.
- Keep the file tree controls intentionally small: visible row actions are only
  create and delete, while rename is handled by direct inline editing on the
  filename. Duplicate file controls were removed.
- Keep the org workstation blank by using a separate initial block set and
  storage namespace instead of clearing or mutating `/doc-minimal` content.

## Open Tasks

- Add keyboard navigation inside the slash menu beyond first-result `Enter`.
- Add server-backed document persistence if the demo needs shared state across
  browser sessions or machines.
- Add true recurring task scheduling once the `.nz/` state store exists.
- Make created skills discoverable by the broader CLI/runtime once that runtime
  is implemented.
- Connect sidebar file selections to distinct document contents once the app has
  a document persistence model. Today the file tree manages navigation state and
  hierarchy only; the editor content remains the reused `/doc-minimal` document.
- Resolve the unrelated root build blocker caused by the incomplete untracked
  `cli/src/store/index.ts` exports (`room.js`, `ledger.js`, `memory.js`,
  `handoff.js`, and `init.js`) being included by the root TypeScript config.
