# Codex Development Guidelines — Doctoral Life

## Project intent
Build a browser-based, Japanese-language life simulation of entering and progressing through a doctoral program in Japan. Use transparent data provenance. Support easy addition of events and policies without refactoring the simulation core.

## Non-negotiables
- Distinguish observed official statistics, official program regulations, estimated parameters, and fictional gameplay assumptions. NEVER present assumed probabilities as empirical Japanese statistics.
- Represent JSPS DC1/DC2, RA, TA and university financial support as versioned policy rules. Eligibility, application dates, payment amounts and concurrency restrictions depend on fiscal year and institution; do not invent official conditions.
- Treat graduation eligibility as institution / graduate school / academic-year specific; distinguish completion of standard residence period, course completion, dissertation submission, and degree awarded.
- Research progress, grants, manuscript submission, peer-review outcomes, and graduation must be modeled by separate state transitions. Do not model delayed decisions as independent monthly random events.
- Event occurrences have stable IDs, conditions, probabilities/hazards or deterministic schedule, cooldowns, priority, and provenance. Normalize time units (monthly/weekly hazard as applicable) before draw.
- Avoid deterministic stereotypes about field, wealth, professors, gender or relationships. Where data are absent, label mechanics as assumptions and keep them configurable.
- Player choices should have traceable consequences through state and event history; allow deterministic seeded replay and exportable logs.

## Current implementation
- Open `README.md` and `ARCHITECTURE.md` before changing code.
- `src/data.js`: attributes and assumed model parameters
- `src/events.js`: conditional narrative event definitions
- `src/engine.js`: simulation state, scheduled events, probability draws, application and manuscript decisions, degree determination
- `src/ui.js`: state-driven UI, browser save and JSON export
- `tools/build.mjs`: builds standalone HTML artifact
- `tests/engine.test.cjs`: basic regression suite

## Commands
- Test: `node --test tests/*.test.cjs`
- Build: `node tools/build.mjs`
- No external runtime dependencies are required.

## Recommended development sequence
1. Add explicit policy/parameter source metadata and a validation script, without changing current playability.
2. Expand tests for DC1 from M2, delayed decisions, funding conflicts, dissertation conditions, negative balances, deterministic replay, and event cooldown.
3. Import actual official distributions (with URL, reference year, extraction date, population, category breakdown) and calibrate observed margins. Keep all fictional odds visually separate in UI.
4. Add research-field-specific workflows and institutional requirements as data files, then publish reproducible simulations comparing outcomes to reference distributions.
5. Improve mobile accessibility and add a smoke test for browser gameplay.

## Scope reminder
This prototype is not yet a validated statistical simulation. Unless explicitly supported by a documented dataset, its numeric outcomes are illustrative.

## Auto-mode implementation
- src/auto.js owns the pure, deterministic decision policy and a single-step interpreter. The UI in src/ui.js owns one cancellable timer (no background loops). Never consume the simulation RNG just to decide an automatic UI option.
- Progress-only mode repeats the selected monthly action and waits for multi-choice decisions/available submission; single-choice acknowledgments proceed automatically. Full auto makes choices and submits completed papers. Always stop at game end and avoid persisting running timers/mode across reloads.
