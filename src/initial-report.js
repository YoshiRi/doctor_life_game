/* Initial-life report: observed reference data is deliberately segregated from
 * illustrative game state. This module is pure and does not consume game RNG. */
const InitialReport = (() => {
  const JASSO = Object.freeze({annualIncomeYen:ReferenceStats.income.annualMeanYen,year:ReferenceStats.income.year,population:ReferenceStats.income.population,url:ReferenceStats.income.url});
  const PAPER_WEIGHTS = Object.freeze([6,3,1]); // Game engine probabilities remain illustrative.
  const FIELD_LABS = Object.freeze({
    cs: {master:6,doctor:3}, bio:{master:4,doctor:4},
    materials:{master:5,doctor:3},humanities:{master:3,doctor:3}
  });
  function hash(seed,salt){
    let n=(seed>>>0)^salt;
    n=Math.imul(n^(n>>>16),0x7feb352d);
    n=Math.imul(n^(n>>>15),0x846ca68b);
    return (n^(n>>>16))>>>0;
  }
  function initialState(state){
    // Saved snapshots are snapshots at creation time. Older save data may have none.
    const original=state?.savedInitial;
    return original && original.seed===state.seed ? original : state;
  }
  function build(state){
    if (!state) return null;
    const s=initialState(state),p=DoctoralGame.profile(s);
    const family=p.family.support;
    const baseWork=s.month<0?6:5; // Automatic simplified income in the game, not observed income.
    const cost=p.university.cost+p.relationship.expense;
    const v=hash(s.seed,0x51b765ac);
    const baseline=FIELD_LABS[s.field]||FIELD_LABS.cs;
    const master=Math.max(0,baseline.master+((v&7)%5)-2);
    const doctor=Math.max(0,baseline.doctor+(((v>>>3)&7)%5)-2);
    const faculty=1+((v>>>7)%3===0?1:0);
    return {
      stage:DoctoralGame.stage(s),
      period:DoctoralGame.date(s),
      seed:s.seed,
      field:p.field.name,university:p.university.name,region:p.university.region,
      income:{family,work:baseWork,total:family+baseWork,cost,balance:family+baseWork-cost,startingCash:s.cash,
        observedMean:ReferenceStats.income.annualMeanYen/120000},
      papers:{value:s.initialPapers,weights:PAPER_WEIGHTS,
        description:'修士までの成果を論文本数相当に換算したゲーム指標。査読論文の実測本数ではありません。'},
      grant:{budgetLevel:s.labBudget,
        description:'ゲーム内の研究室予算レベル。研究室・PIの実際の科研費採択額ではありません。'},
      lab:{master,doctor,faculty,total:master+doctor+faculty,
        description:'研究室人数は表示専用の仮想設定。ゲーム内の進捗・採択確率にはまだ反映しません。'},
      jasso:JASSO,reference:ReferenceStats
    };
  }
  return {build,JASSO,PAPER_WEIGHTS};
})();
