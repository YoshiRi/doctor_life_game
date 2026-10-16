const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../src');
const code=['data','events','engine','reference-stats','initial-report'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\nglobalThis.exportsForTests={DoctoralGame,InitialReport,ReferenceStats};';
const context=vm.createContext({});
vm.runInContext(code,context);
const {DoctoralGame:G,InitialReport:R,ReferenceStats:Stats}=context.exportsForTests;

test('JASSO mean is sourced annual total and exposes population/definition',()=>{
  assert.equal(R.JASSO.annualIncomeYen,2665100);
  assert.match(R.JASSO.population,/博士課程/);
  assert.equal(R.JASSO.year,2024);
  assert.equal(R.build(G.makeGame('unaware',3)).income.observedMean,2665100/120000);
});
test('report is a pure projection and does not consume the simulation RNG',()=>{
  for(let seed=1;seed<40;seed++){
    const state=G.makeGame(seed%2?'aware':'unaware',seed);
    const before=JSON.stringify(state);
    const a=R.build(state),b=R.build(state);
    assert.equal(JSON.stringify(a),JSON.stringify(b));
    assert.equal(JSON.stringify(state),before);
    assert.equal(a.lab.total,a.lab.master+a.lab.doctor+a.lab.faculty);
    assert.equal(a.income.total,a.income.family+a.income.work);
    assert.equal(a.income.balance,a.income.total-a.income.cost);
  }
});
test('reopening a report after progression still shows the original hand',()=>{
  const state=G.makeGame('aware',27),original=R.build(state);
  state.labBudget=4;state.cash=1000;state.initialPapers=17;
  G.advance(state,'research');
  assert.equal(JSON.stringify(R.build(state)),JSON.stringify(original));
});
test('M2 and D1 projected baseline incomes use the respective game rules',()=>{
  const a=R.build(G.makeGame('aware',31)),b=R.build(G.makeGame('unaware',31));
  assert.equal(a.stage,'M2');assert.equal(b.stage,'D1');
  assert.equal(a.income.work,6);assert.equal(b.income.work,5);
});
test('game assumptions use actual existing initial sampling weights',()=>{
  const a=R.build(G.makeGame('unaware',30));
  assert.equal(a.reference,Stats);
  assert.equal(a.papers.distribution,undefined);
  assert.equal(a.grant.distribution,undefined);
  assert.deepEqual(Array.from(R.PAPER_WEIGHTS),[6,3,1]);
  assert.match(a.lab.description,/仮想設定/);
});

test('published observations are present with traceable references, not generated rankings',()=>{
  const s=G.makeGame('unaware',19),d=R.build(s),ref=d.reference;
  assert.equal(ref.income.support[0].pct,43.2);
  assert.equal(ref.income.support[1].pct,32.8);
  assert.equal(ref.publications.bins.reduce((n,b)=>n+b.count,0),4353);
  assert.equal(ref.publications.bins.reduce((n,b)=>n+b.pct,0),100);
  assert.equal(ref.grants.types.find(x=>x.label==='基盤(C)').accepted,12756);
  assert.equal(ref.grants.types.find(x=>x.label==='若手研究').accepted,5585);
  assert.equal(ref.laboratories.kinds.find(x=>x.label==='国立大学等').doctor,2.4);
  assert.equal(ref.laboratories.kinds.find(x=>x.label==='私立大学').total,20.0);
  for(const src of Object.values(ref)) {
    assert.match(src.url,/^https:\/\//);
    assert(src.population.length>10);
    assert(src.note.length>10);
  }
  assert.equal(d.papers.value,s.initialPapers);
  assert.equal(d.grant.budgetLevel,s.labBudget);
});
test('research comparison metadata keeps graduate papers and research groups distinct from simulated peers',()=>{
  const ref=R.build(G.makeGame('aware',18)).reference;
  assert.match(ref.publications.population,/2012年度博士課程修了者/);
  assert.match(ref.publications.note,/D1/);
  assert.match(ref.grants.note,/研究室数ではありません/);
  assert.match(ref.laboratories.note,/確率分布ではありません/);
});
