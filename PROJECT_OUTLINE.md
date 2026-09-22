# Project outline

## Product

RenewMaplet is a light-mode explorer for Australian electricity facilities. It turns OpenElectricity data into scoped facility counts, capacity totals, comparisons, and a supporting facility list.

This is a proof of concept. Build a coherent, explainable vertical slice rather than production infrastructure.

## Customer needs

- **Alice:** find battery facilities in NSW and QLD and identify which recently came online.
- **Bob:** find committed wind, solar, and battery facilities in a state and total their upcoming capacity.
- **Sally:** compare retired and remaining fossil facilities in a state.

These validate one flexible exploration model; they are not separate product modes.

## Product model

Users:

1. Define a scope using State, Technology, Unit status, and Commencement.
2. Choose whether to measure Facilities or Registered capacity.
3. Break the scope down by Technology, Unit status, or State.
4. Compare groups, then open the supporting facilities for a group.

## In scope

- Live OpenElectricity facility data
- Scope filters, grouped summaries, facility and capacity totals
- Inline sortable facility table
- Loading, error and empty states
- Desktop and narrower views. 
- Accessible keyboard interaction

## Out of scope

Maps, facility detail pages, search, table filtering, downloads, accounts, saved views, multiple themes, deployment, mobile responsiveness.

## Success

Each customer question can be answered through the same flow as per BEHAVIOUR_GUIDE.md, calculations follow `DATA_GUIDE.md`, and the interface matches the intent of the supplied screenshots.
