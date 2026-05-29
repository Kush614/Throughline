# Landing Page Hero

## Purpose

The landing hero introduces NeverZero Cloud and shows a live workstation demo card
without making the first viewport feel broken or overlapped.

## Current State

The hero layout in `app/landing.css` now uses a desktop CSS grid: copy stays in
the left column and `HeroDemo` stays in the right column. Below 1100px, the demo
stacks under the hero copy. Small-screen rules keep the nav CTA, hero footnotes,
demo header text, and agent row text from causing horizontal overflow.

## Files And Entry Points

- `app/page.tsx`: landing route markup and hero content.
- `app/landing.css`: hero, nav, and responsive landing page styles.
- `app/_components/HeroDemo.tsx`: animated workstation demo card.

## Decisions

- Prefer CSS-only layout changes over restructuring `app/page.tsx`.
- Use a grid on desktop instead of absolute positioning so the demo card cannot
  cover the headline.
- Use `overflow-x: clip` plus targeted shrink/ellipsis rules to prevent mobile
  overflow from long nav/demo strings.

## Open Tasks

- `pnpm build` is currently blocked by an unrelated existing type error in
  `app/doc-minimal/_components/LivingDoc.tsx`: `WorkstationTopBar` is not defined.
- The animated quote in `HeroDemo` still types on load; screenshots may catch it
  mid-string by design.
