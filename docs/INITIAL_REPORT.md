# Initial conditions report / 初期条件レポート

Displayed immediately after choosing whether the player knew about JSPS DC1; the player must click "この人生を始める" to begin normal gameplay. The report can be reopened from the top bar without changing the simulation state. The first report is shown only to newly created games; old saved games skip it automatically.

## Provenance contract

| Card | Quantity | Provenance / limitations |
| --- | --- | --- |
| Money | Monthly household help, simplified work income, living cost, cash | **Game parameters**, `GameData.family` / `university` / `relationships` and `DoctoralGame.finance()` rules. Does not include tuition and uses a fixed simplified short-hours work income. Not observed Japanese doctoral incomes. |
| Money benchmark | 2,665,100 yen/year, approx. 22.2 *man-yen/month* | **JASSO 2024 academic-year survey**, general doctoral-program students, published March 31, 2026; includes student loans and various sources of cash inflow. Mean across doctoral academic years, NOT a percentile or a like-for-like M2/D1 baseline. [Primary source](https://www.jasso.go.jp/statistics/gakusei_chosa/__icsFiles/afieldfile/2026/03/24/daiin24_all_1.pdf), page 9, general students' income table. |
| Output | Initial publication-*equivalent* achievements, 0/1/2; 60%/30%/10% weights | **Game assumption** from `DoctoralGame.makeGame()`: weights 6:3:1. This is not a distribution of peer-reviewed publications for enrolled students. `initialPapers` does not populate `papers` (which records accepted manuscripts during the game). |
| Grant | `labBudget` starting level 0/1/2, each ~1/3 probability | **Game assumption** in `makeGame()`. Not a PI grant award rate, annual KAKEN funding amount, or laboratory grant distribution. KAKEN is an indicated future reference source only. |
| Lab size | Students in master's/doctoral programmes and faculty total | **UI-only hypothetical model**, deterministic hash of the starting seed and field. These counts do not currently affect gameplay outcomes, and no actual national lab-size distribution or percentile is claimed. |

References to institutional and disciplinary data must be matched by cohort, sampling frame, fiscal year, and academic field *before* calculating position percentiles or ranks. The four cards must keep visible observed-vs-hypothetical provenance indicators.

## Implementation

- `src/initial-report.js` is a read-only projection. Its `build(state)` uses `state.savedInitial` when present, not the evolving state.
- It must **not consume `rngState` or call `DoctoralGame.advance`**: merely opening the report cannot change an outcome.
- UI-only flag `introReopened` allows reopening, while `state.introSeen=false` gates the first start. Legacy saves omit the flag and enter gameplay as before.
- Pure simulation state is version 1 and is backward-compatible.
- `tests/initial-report.test.cjs` verifies references, deterministic projections, original starting state, and month-specific income rules. Use `node --test tests/*.test.cjs`.

## Next data work

1. Obtain a population-compatible distribution of doctoral M2/D1 output (peer-reviewed first-author paper counts) by field, replacing dummy weights only where supported.
2. Import KAKEN PI/project yearly direct cost data and choose an aggregation cohort, notional laboratory-to-PI mapping and multi-PI attribution rules. Never equate awarded grant totals with unrestricted laboratory operating budgets.
3. Find university/lab-level enrolment rosters or a defensible aggregated reference sample; only then display percentiles for laboratory size.
4. Replace the hypothetical family, income, and living-cost model with independently documented sources; ensure no student-loan inflow is mistaken for wages.

## Entertainment layer: virtual population status tiers

The opening report now includes four **game-only** rankings: monthly starting inflows (family support + simplified work), master's-output-equivalent achievements, starting lab-budget level, and hypothetical lab membership. The rankings compare the player to a fixed deterministic cohort of **1,024 synthetic game starts** matching the same research field and M2/D1 entry stage, sampled with the existing `DoctoralGame.makeGame` model. Synthetic samples are cached by field/stage. A pure read-only `InitialReport.build` computes tie-adjusted midrank percentiles and an S–D letter tier, rounded to 5% increments for the approximate upper-percentile label. Data are calculated without advancing the current game or consuming the player's RNG.

This is **not** a national percentile, deviation score, observed cohort, income survey benchmark, KAKEN rank, or publication peer benchmark. Do not mix the entertainment tiers with `ReferenceStats` measurements. Grants refer solely to fictional `labBudget` levels, and the virtual lab head count is UI-only. Never label these ranks as measurements of Japan's doctoral population, or reuse them for calibration of game event probabilities.
