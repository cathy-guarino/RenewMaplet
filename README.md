# RenewMap code challenge

RenewMaplet is a response to the RenewMap code challenge.

The app is a proof of concept that addresses the supplied user research. Users can define a scope, compare facility counts and registered capacity by different metrics (technology, unit status or state), and inspect the facilities behind each result.

## Run locally

1. Copy `server/.dev.vars.example` to `server/.dev.vars`  and add your OpenElectricity API key. 

2. From the repository root, install dependencies and start the app:
   ```bash
   yarn install
   yarn dev
   ```

Open [http://localhost:5173](http://localhost:5173).

## Approach

To build this in the allotted time, I focused on product thinking over feature volume and took a structured approach to working with AI. This is how I spent the time:

1. **Started with the customer problems.** I identified what each user needed to understand and distilled these into different questions over the same underlying dataset, rather than separate workflows.

2. **Understood the data and domain.** I explored the OpenElectricity API to understand its structure, terminology and available fields. I validated that the data needed for the customer scenarios was available and started thinking about how API concepts should translate into the UI.

3. **Explored different product directions.** I prototyped several approaches, including search-led, map-led and table-led concepts, and tested them against the customer scenarios. The evidence pointed towards specific numbers and comparisons rather than open-ended exploration, so I prioritised flexible summaries backed by the underlying facility records.

4. **Defined the product behaviour.** I narrowed down to one design direction, and then worked through the key flows, states and interactions in detail. I created visual references for the build and documented intended behaviour in `BEHAVIOUR_GUIDE.md`.

5. **Designed the technical approach.** I defined the high-level architecture, structure, and data flows, and wrote up `ARCHITECTURE_GUIDE.md` and `DATA_GUIDE.md`. The intent with these documents was to give the coding agent stable project context rather than relying on individual prompts to carry architectural decisions.

6. **Built incrementally with AI.** I broke the implementation into discrete stages and wrote a focused brief for each. The agent worked from the shared product and technical documentation, rather than redefining the approach at each step. After each stage, I reviewed the code and application behaviour and iterated where needed before moving on.

7. **Kept a record of implementation decisions.** The agent maintained `BUILD_LOG.md` as it worked, giving me a record of decisions and changes to review rather than treating generated code as a black box.

## Trade-offs and next steps

Given the time available, I prioritised validating the core information model, interaction pattern and technical structure rather than production hardening or feature breadth.

I didn't build a dedicated facility-detail view because none of the supplied scenarios required one. It would be a natural extension if deeper investigation proved useful in user testing.

I also kept exploration lightweight. A production version could extend the facility table with richer filtering, sorting and search, introduce additional comparison views such as a matrix, and explore natural-language queries such as *“How much battery capacity is expected to become operational in Queensland in the next five years?”*.

Other areas I would address next include mobile optimisation, broader accessibility and browser testing, more comprehensive error and loading states, improved visual design, and further validation of the terminology and interaction model with users.
