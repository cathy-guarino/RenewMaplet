# Data guide

## Source

Fetch `https://api.openelectricity.org.au/v4/facilities/` through a local `/api/facilities` server route. Read `OPEN_ELECTRICITY_API_TOKEN` on the server and provide `.dev.vars.example` without a real credential.

The application always uses live data. Fixtures are test-only.

## Model

The API returns facilities containing units. State and identity belong to a facility; technology, status, registered capacity, and commencement belong to units.

Parse the external response once into explicit application types. No UI or aggregation code should depend on raw API shapes.

## Selection and totals

- Apply unit-level filters to units; retain a facility when at least one unit matches.
- Facility count means distinct matching facilities.
- Registered capacity is the sum of matching units with known capacity.
- Keep missing capacity unknown and exclude it from MW totals; never turn it into zero.
- A facility may appear in multiple technology or status groups when its units differ.
- **All in scope** deduplicates facilities and units after scope filters.

## Normalisation

- Convert NEM regions such as `NSW1` to `NSW`; map WEM to `WA`.
- Recognise committed, commissioning, operating, and retired; retain an Unknown fallback.
- Use `commencement_date`, not first-seen metadata. Preserve partial year/month dates.
- Classify “recent” only when the date and operating/commissioning status support it.
- For batteries, prefer canonical `battery` units. If absent, use discharging units. Never add charging capacity to generation capacity.

## Performance and verification

Fetch once, calculate derived views from parsed data, and memoize only measured expensive work. Initially render 50 table rows and reveal 50 more per request.

Test battery deduplication, overlapping groups, distinct counts, capacity totals, missing capacity, state normalisation, partial dates, and empty results.
