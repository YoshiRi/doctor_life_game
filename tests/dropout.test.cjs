const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const src=path.resolve(__dirname,'../src');
const code=['data','events','engine','auto','multiverse','outcome-report','reference-stats','real-world-comparison'].map(f=>fs.readFileSync(path.join(src,f+'.js'),'utf8')).join('\n')+'\nglobalThis.x={DoctoralGame,AutoPlay,Multiverse,OutcomeReport,ReferenceStats,RealWorldComparison};';
const ctx=vm.createContext({});vm.runInContext(code,ctx);const {DoctoralGame:G,AutoPlay:A,Multiverse:M,OutcomeReport:O,ReferenceStats:R,RealWorldComparison:W}=ctx.x;
test('voluntary withdrawal at D1-D3 creates a distinct early dropout',()=>{
  const s=G.makeGame('unaware',742,1023);
  assert(G.offerWithdrawal(s));assert.equal(s.pending.choices.length,2);
  assert(G.resolve(s,1));assert(s.finished);assert.equal(s.outcome.status,'dropout');
  assert.equal(s.outcome.months,0);assert(!s.pending);assert.equal(s.schedule.length,0);
  assert.equal(G.advance(s,'research'),false);
  assert.equal(G.offerWithdrawal(s),false);
});
test('continuing the course does not terminate the player',()=>{
  const s=G.makeGame('unaware',743,1024);
  assert(G.offerWithdrawal(s));assert(G.resolve(s,0));assert(!s.finished);
  assert.equal(s.pending,null);assert.equal(s.morale>=0,true);
  const m=G.makeGame('aware',743,1024);assert(!G.offerWithdrawal(m));
});
test('early exit offer occurs only after entry and before the standard end',()=>{
  const s=G.makeGame('unaware',744,1025);
  assert.equal(G.earlyExitChance(s),0);
  s.month=10;assert(G.earlyExitChance(s)>0);assert(G.earlyExitChance(s)<1);
  s.month=36;assert.equal(G.earlyExitChance(s),0);
});
test('100-trial results partition into 4 exclusive endpoints and valid durations',()=>{
  const s=G.makeGame('unaware',1056,2099),r=M.run(s,48084,100);
  const total=Object.values(r.outcomes).reduce((n,v)=>n+v,0);
  assert.equal(total,100);assert.equal(r.outcomes.dropout+r.completed,100);
  assert.equal(r.samples.length,100);
  assert.equal(Object.values(r.duration).reduce((n,v)=>n+v,0),100);
  for(const item of r.samples){assert(['dropout','standard','extended','withoutDegree'].includes(item.outcome));
    if(item.outcome==='dropout')assert(item.months<36);
    else assert([36,48].includes(item.months));
  }
});
test('comparisons exclude early leavers from completed-cohort denominators',()=>{
  const s=G.makeGame('unaware',1056,2099),r=M.run(s,48084,100);
  const d=W.build(r,'engineering',s);
  assert.equal(d.completedSize,100-r.outcomes.dropout);
  assert.equal(d.dropoutSource.annualPct,3.4);
  assert.equal(d.dropout[0].game,r.outcomes.dropout);
  assert.equal(d.dropout[0].real,3.4);
  assert(Math.abs(d.degree.reduce((a,b)=>a+b.game,0)-(d.completedSize?100:0))<1e-7);
  const completed=r.samples.filter(x=>x.outcome!=='dropout').length;
  assert.equal(completed,d.completedSize);
});
test('final report recognizes early exit without ranking completion time',()=>{
  const s=G.makeGame('unaware',190,501);
  assert(G.offerWithdrawal(s));assert(G.resolve(s,1));
  const trials=M.run(s,9098,100),report=O.build(s,trials);
  assert.equal(report.result.category,'dropout');
  assert.equal(report.months.value,0);
  assert(report.months.bins.some(b=>b.selected));
});