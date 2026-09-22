# RenewMaplet agent instructions

Before editing, read in this order:

1. `PROJECT_OUTLINE.md` — product intent and scope
2. `BEHAVIOUR_GUIDE.md` — user experience and acceptance
3. `DATA_GUIDE.md` — API and domain rules
4. `ARCHITECTURE_GUIDE.md` — implementation conventions and stages
5. `BUILD_LOG.md` — current state and prior decisions

## Working rules

- Implement only what is requested by the user.
- Follow the guides; report on any necessary departure.
- Avoid speculative features and abstractions.
- Comment domain decisions and surprising constraints, not obvious code.
- Keep fixtures in tests. The application always uses live data.
- Remove unused code before finishing.
- Log progress and decisions in BUILD_LOG whenever a notable change is made. 

Before reporting completion, run `yarn check`, exercise the changed flow in a browser, and update `BUILD_LOG.md`.
