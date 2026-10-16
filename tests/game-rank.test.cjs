const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../src');
const scripts=['data','events','engine','reference-stats','initial-report'];
const context=vm.createContext({});
vm.runInContext(scripts.map(n=>fs.readFileSync(path.join(dir,n+'.js'),'utf8')).join('\n')+'\nglobalThis.testing={DoctoralGame,InitialReport};',context);
const {DoctoralGame:G,InitialReport:R}=context.testing;

test('game status displays four synthetic-cohort ranks, not observed national percentiles',()=>{
  const s=G.makeGame('aware',1234567), before=JSON.stringify(s);
  const a=R.build(s),b=R.build(s);
  assert.equal(JSON.stringify(s),before,'status calculation must be read-only');
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(a.gameCohort.n,1024);
  assert.equal(a.gameCohort.provenance,'synthetic_game_cohort');
  assert.deepEqual(Array.from(a.gameCohort.metrics,m=>m.key),['income','papers','grant','lab']);
  for(const m of a.gameCohort.metrics){
    assert(m.percentile>=0&&m.percentile<=100);
    assert(m.approxTop>=5&&m.approxTop<=95);
    assert(['S','A','B','C','D'].includes(m.tier));
  }
  assert.match(a.gameCohort.description,/仮想学生/);
  assert(a.reference.income.annualMeanYen>0);
});

test('reopening after game progress or replay preserves the initial rank',()=>{
  const s=G.makeGame('unaware',4683), rank=JSON.stringify(R.build(s).gameCohort);
  s.cash+=900;s.initialPapers=40;s.labBudget=4;
  G.advance(s,'research');
  assert.equal(JSON.stringify(R.build(s).gameCohort),rank);
  assert.equal(JSON.stringify(R.build(G.makeGame('unaware',4683)).gameCohort),rank);
});

test('game cohorts are field- and entry-stage-specific, without changing random state',()=>{
  const seed=8898;
  const a=R.build(G.makeGame('aware',seed)),b=R.build(G.makeGame('unaware',seed));
  assert.equal(a.gameCohort.stage,'M2');assert.equal(b.gameCohort.stage,'D1');
  assert.equal(a.gameCohort.field,b.gameCohort.field);
  assert.notEqual(a.income.total,b.income.total);
  assert.equal(a.gameCohort.metrics.length,4);
});

test('discrete values use midrank for ties, not arbitrary ordering',()=>{
  const result=[];
  for(let seed=1;seed<=120;seed++){
    const mixed=(Math.imul(seed,0x9e3779b1)^0x6a09e667)>>>0;
    const x=R.build(G.makeGame('unaware',mixed));
    result.push({field:x.field,...x.gameCohort.metrics.find(m=>m.key==='papers')});
  }
  const byValue=new Map();
  for(const x of result){
    const key=x.field+':'+x.value;
    if(byValue.has(key))assert.equal(x.percentile,byValue.get(key));
    else byValue.set(key,x.percentile);
  }
  assert(byValue.size>=2);
  for(const field of new Set(result.map(x=>x.field))){
    const ordered=result.filter(x=>x.field===field).sort((a,b)=>a.value-b.value);
    for(let i=1;i<ordered.length;i++)if(ordered[i].value>ordered[i-1].value)assert(ordered[i].percentile>ordered[i-1].percentile);
  }
});
