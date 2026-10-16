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
  function buildBase(state){
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
  // ENTERTAINMENT ONLY: synthetic peers generated from the SAME game initial-state model.
  // The JSPS/JASSO/NISTEP/JSPS reference observations never enter this ranking.
  const COHORT_SIZE=1024;
  const cachedCohorts=new Map();
  const rankKinds=Object.freeze([
    {key:'income', label:'生活資金', explanation:'初期の月次収入（援助＋想定勤務収入）', unit:'万円/月'},
    {key:'papers', label:'研究実績', explanation:'修士までの成果・ゲーム内の本数相当', unit:'本相当'},
    {key:'grant', label:'Grant環境', explanation:'研究室予算ゲームポイント（実際のGrant額ではない）', unit:'Lv'},
    {key:'lab', label:'研究室規模', explanation:'ゲームが割り当てた仮想所属人数', unit:'人'}
  ]);
  function values(d){return {income:d.income.total, papers:d.papers.value, grant:d.grant.budgetLevel, lab:d.lab.total};}
  function cohortFor(d){
    // Compare to synthetic students in the same starting stage and research field.
    const key=d.stage+':'+d.field;
    if (cachedCohorts.has(key)) return cachedCohorts.get(key);
    const peers=[];
    const awareness=d.stage==='M2'?'aware':'unaware';
    for (let i=0;peers.length<COHORT_SIZE && i<COHORT_SIZE*24;i++) {
      const seed=(Math.imul(i+1,0x9e3779b1)^0x6a09e667)>>>0;
      const s=DoctoralGame.makeGame(awareness,seed);
      if(DoctoralGame.profile(s).field.name!==d.field)continue;
      peers.push(values(buildBase(s)));
    }
    if(peers.length!==COHORT_SIZE)throw Error('Could not generate virtual game cohort');
    cachedCohorts.set(key,peers);
    return peers;
  }
  function score(value, peers){
    let below=0, tied=0;
    for(const n of peers){if(n<value)below++;else if(n===value)tied++;}
    // Midrank: ties contribute half their mass; never imply exact rank among ties.
    const percentile=Math.round(100*(below+tied/2)/peers.length);
    const approxTop=Math.max(5,Math.min(95,Math.round((100-percentile)/5)*5));
    const tier=percentile>=90?'S':percentile>=75?'A':percentile>=50?'B':percentile>=25?'C':'D';
    return {percentile,approxTop,tier,tied};
  }
  function build(state){
    const d=buildBase(state);
    if(!d)return null;
    const cohort=cohortFor(d), own=values(d);
    d.gameCohort={
      n:cohort.length,field:d.field,stage:d.stage,provenance:'synthetic_game_cohort',
      description:'同じ研究分野・開始学年の仮想学生1,024人をゲームの初期条件抽選から生成。実在する博士学生の順位や偏差値ではありません。',
      metrics:rankKinds.map(spec=>({
        ...spec,value:own[spec.key],...score(own[spec.key],cohort.map(p=>p[spec.key]))
      }))
    };
    return d;
  }
  return {build,JASSO,PAPER_WEIGHTS,COHORT_SIZE};
})();
