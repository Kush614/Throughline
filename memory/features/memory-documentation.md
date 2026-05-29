# Memory Documentation

## Purpose

Create a persistent documentation system so future agents can resume repository
work with the right context. The main memory captures repo-wide state, while
feature memory files capture focused implementation history and decisions.

## Current State

- The main memory file lives at `memory/memory.md`.
- Feature-specific memory files live under `memory/features/`.
- Root `AGENTS.md` tells agents to read memory at the beginning of each task and
  update memory documentation whenever they complete a task, feature, fix, or
  repo organization change.
- Feature memory filenames should use lowercase kebab-case:
  `memory/features/<feature-name>.md`.

## Files And Entry Points

- `AGENTS.md`: repo-level instructions loaded at the beginning of agent tasks.
- `memory/memory.md`: main system memory for repo-wide context.
- `memory/features/`: directory for per-feature memory files.
- `memory/features/memory-documentation.md`: memory for this documentation
  workflow itself.

## Decisions

- Keep the main memory under `memory/` instead of the repository root so all
  memory artifacts are grouped together.
- Keep per-feature memory files separate to avoid turning the main memory file
  into an unscannable changelog.
- Use lowercase kebab-case filenames so feature memory paths are predictable.
- Require memory updates during the same task as the work so context does not
  drift or get lost.

## Open Tasks

- Future implementation work should add feature memory files as features are
  built.
- If the repo later becomes a Git repository, include the empty
  `memory/features/` directory by keeping at least this feature memory file in it.
