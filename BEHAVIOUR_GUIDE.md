# Behaviour guide

Use `reference/` to judge hierarchy, density, alignment, and states. Live values will change; do not copy or assert exact totals.

## Page structure

- A 52px global header contains a globe, **RenewMaplet**, and reset action.
- A visually distinct left scope panel is about 264px on desktop.
- The main panel contains one header row and either grouped results or the facility table.
- Panels are flush, separated by full-height dividers, and scroll independently where needed.

## Scope and summary

- Filters: State, Technology, Unit status, Commencement.
- A filter shows a dark selected-count circle only when it narrows the default “all” state.
- Facilities is the default measure; Technology is the default breakdown.
- Measure and breakdown are shadcn Select controls.
- Keep the current facility count and registered capacity beneath the title.
- Group rows show a relative-share bar, Registered MW, and Facilities. **All in scope** is last.
- Columns stay fixed as data changes.

## Facility table

Selecting a group replaces the other groups with that row and an inline table filling the remaining height. Changing scope, measure, or breakdown closes it.

Columns: Technology, Facility with a plain state suffix, Unit status, MW, Units. Header clicks toggle sort; there is no header filtering. “Show more facilities” adds 50 rows. Facilities do not open detail views.

## States and accessibility

- Loading, error, and empty states occupy the results area without changing the shell.
- Reset is an icon button with an accessible name and left-side tooltip.
- Use `aria-sort`; expose expanded state; announce loading and errors.
- All controls must work by keyboard. Horizontal scrolling is acceptable for dense narrow layouts.

## Visual language

- Light mode, Geist Sans, compact neutrals.
- Tokens: background `#fafafa`, foreground `#0a0a0a`, surface `#fff`, scope `#f5f5f5`, muted `#f2f2f2`, border `#e5e5e5`, muted text `#666`, header `#27272a`, header text `#fafafa`.
- Avoid floating cards, gradients, tinted controls, excessive rounding, and decorative copy.
- Technology uses compact colored squares, with tooltips when unlabeled.
- Status uses small symbols on very light circles: green dot for operating, clock for committed, strike-circle for retired. State icons are neutral.

## Acceptance scenarios

- Alice scopes NSW + QLD batteries by commencement and inspects resulting identities and statuses.
- Bob scopes a state plus committed wind, solar, and battery units and reads total MW.
- Sally scopes a state's fossil technologies, breaks down by Unit status, and compares retired with remaining facilities.

Screenshot states: `01` default, `02` active scope, `03` status, `04` state, `05` expanded table, `06` sorting, `07` loading, `08` error, `09` narrow.
