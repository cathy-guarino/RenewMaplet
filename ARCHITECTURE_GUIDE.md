# Architecture guide

## Stack

Keep the starter's React, TypeScript, Vite, Cloudflare Worker/Hono, and Yarn workspace setup. Add Tailwind CSS v4, shadcn/ui, Geist Sans, Lucide, and Vitest. Add browser tests only for critical flows.

## Structure

```text
client/src/
  app/                          # shell, composition, state ownership
  components/                   # product components
    ui/                         # generated shadcn components
  data/                         # API client, parser, application types
  domain/                       # pure filtering, grouping, aggregation
  styles/                       # tokens and application styles
server/src/                      # credential-protecting API proxy
tests/fixtures/                  # test-only API responses
```

## Engineering rules

- Keep the feature model framework-free and test pure domain functions directly.
- Parse API data at the boundary; React receives application types.
- Keep state near its owner and derive values instead of duplicating them.
- Prefer feature-owned modules over a generic shared folder.
- Use shadcn components and semantic tokens; avoid forking component internals.
- Add an abstraction after a real second use, not in anticipation.
- Comments explain domain assumptions or surprising trade-offs.

## Design system

- Use shadcn components in `components/ui/` as the shared UI primitives. Extend an existing primitive before creating a competing version.
- Search for an existing component before adding one. Do not duplicate controls, indicators, tooltips, table elements, or layout patterns.
- Put colors, typography, spacing, radii, borders, and control sizes in semantic theme tokens. Do not hardcode repeated visual values in components.
- Use semantic names such as `background`, `muted`, `border`, and `technology-wind`; avoid names tied to a single screen or raw color.
- Keep product-specific composition in `components/`. Promote something to `components/ui/` only when it is reusable and independent of facility-domain language.
- Add variants to a shared component when behavior and structure are the same. Create a new component when its semantics or interaction are materially different.
- Preserve the light-only visual system in `BEHAVIOUR_GUIDE.md`; do not introduce parallel themes or one-off styling systems.

## Validation

Provide root scripts for `dev`, `build`, `typecheck`, `lint`, `test`, and `check`. `check` runs all required non-browser checks.

Before completing a stage:

1. Run `yarn check`.
2. Exercise the changed flow in a browser.
3. Compare relevant reference screenshots.
4. Remove dead code and update `BUILD_LOG.md`.
