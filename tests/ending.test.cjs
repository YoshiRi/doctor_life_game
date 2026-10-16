const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.resolve(__dirname,'../src');
const code=['data','events','engine','auto','ending'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\nglobalThis.exports={DoctoralGame,AutoPlay,EndingRoll};';
const ctx=vm.createContext({});vm.runInContext(code,ctx);
const {DoctoralGame:G,AutoPlay:A,EndingRoll:E}=ctx.exports;

function values(s){return {research:s.research,draft:s.draft,morale:s.morale,cash:s.cash,debt:s.debt,papers:s.papers,dcPrep:s.dcPrep,raPrep:s.raPrep,labBudget:s.labBudget};}

test('month, funding decision and submission record actual before/after values',()=>{
  const s=G.makeGame('aware',32);
  assert.equal(s.timeline[0].kind,'start');
  const init=values(s);
  assert.equal(G.advance(s,'funding'),true);
  assert.equal(s.timeline[1].kind,'month');
  for(const k of Object.keys(init)) assert.equal(s.timeline[1].after[k]-s.timeline[1].before[k],s.timeline[1].delta[k]||0,k);
  assert.equal(s.timeline[1].after.research,s.research);
  assert.equal(s.timeline[1].before.research,init.research);
  assert.match(s.pending.title,/DC1/);
  G.resolve(s,0);
  const ev=s.timeline.at(-1);
  assert.equal(ev.kind,'event');assert.match(ev.title,/DC1/);assert.match(ev.detail,/申請/);
  assert(ev.notes.some(x=>x.title.includes('DC1')));
  const fresh=G.makeGame('unaware',12);fresh.research=90;fresh.draft=100;
  const prev=fresh.timeline.length;
  assert(G.submit(fresh));
  assert.equal(fresh.timeline.length,prev+1);assert.equal(fresh.timeline.at(-1).kind,'submission');
  assert.equal(fresh.timeline.at(-1).delta.draft,-100);
});

test('the replay records no simulated extra randomness and stays deterministic',()=>{
  const a=G.makeGame('aware',2026),b=G.makeGame('aware',2026);
  const ra=A.runToEnd(a),rb=A.runToEnd(b);
  assert(ra.finished&&rb.finished);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  const scenes=E.build(a);
  assert(scenes.length>=a.actionHistory.length+1);
  assert.equal(scenes[0].kind,'start');
  assert.equal(scenes.at(-1).after.research,a.research);
  assert.equal(scenes.at(-1).after.papers,a.papers);
  assert.equal(scenes.at(-1).after.debt,a.debt);
  for(let i=1;i<scenes.length;i++){
    assert.equal(scenes[i].before.research,scenes[i-1].after.research);
    assert.equal(scenes[i].before.cash,scenes[i-1].after.cash);
    for(const k of Object.keys(scenes[i].delta)){
      assert(Math.abs(scenes[i].delta[k]-(scenes[i].after[k]-scenes[i].before[k]))<.001,k);
    }
  }
});

test('legacy save records a baseline only from the first subsequent action',()=>{
  const s=G.makeGame('unaware',87);
  delete s.timeline;
  G.advance(s,'research');
  assert.equal(s.timeline[0].kind,'legacy_start');
  assert.equal(s.timeline[1].kind,'month');
});

test('legacy finished games can replay log text without fictitious deltas',()=>{
  const s=G.makeGame('unaware',999);
  A.runToEnd(s);delete s.timeline;
  const scenes=E.build(s);
  assert(scenes.length>0);
  assert(scenes.every(x=>x.before===null&&x.after===null&&Object.keys(x.delta).length===0));
});

test('recording does not mutate completed state during ending construction',()=>{
  const s=G.makeGame('aware',5341);
  A.runToEnd(s);
  const before=JSON.stringify(s);
  const scenes=E.build(s);
  assert(scenes.length>0);
  assert.equal(JSON.stringify(s),before);
  assert.equal(E.build({...s,finished:false}).length,0);
});
