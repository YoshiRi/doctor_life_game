const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../src');
const source=['data','events','engine','auto'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\nglobalThis.testExport={DoctoralGame,AutoPlay};';
const context=vm.createContext({});vm.runInContext(source,context);
const {DoctoralGame:G,AutoPlay:A}=context.testExport;

test('off mode never proceeds, progress-only repeats the chosen monthly action',()=>{
  const s=G.makeGame('unaware',12);
  assert.equal(A.canStep(s,'off'),false);
  assert.equal(A.step(s,'off').type,'paused');
  const step=A.step(s,'advance','rest');
  assert.equal(step.type,'month');assert.equal(step.action,'rest');
  assert.equal(s.month,1);assert.equal(s.actionHistory[0].action,'rest');
});

test('progress-only waits for a branching event and resumes after manual resolution',()=>{
  const s=G.makeGame('aware',32);
  A.step(s,'advance','funding');
  assert.match(s.pending.title,/DC1/);
  assert.equal(A.canStep(s,'advance'),false);
  const before=s.month;
  assert.equal(A.step(s,'advance','work').type,'paused');
  assert.equal(s.month,before);
  G.resolve(s,0);
  assert.equal(A.canStep(s,'advance'),true);
  assert.equal(A.step(s,'advance','research').type,'month');
});

test('progress-only automatically acknowledges a single-choice result',()=>{
  const s=G.makeGame('unaware',22);
  s.pending={id:'ack',choices:[{label:'確認',effects:{morale:2}}]};
  const month=s.month;
  assert.equal(A.canStep(s,'advance'),true);
  assert.equal(A.step(s,'advance').type,'choice');
  assert.equal(s.month,month);assert.equal(s.pending,null);
});

test('progress-only waits when manuscript can be submitted',()=>{
  const s=G.makeGame('unaware',18);
  s.research=90;s.draft=100;
  assert(G.canSubmit(s));
  assert.equal(A.canStep(s,'advance'),false);
  assert.equal(A.step(s,'advance').type,'paused');
  assert.equal(A.step(s,'full').type,'submission');
  assert.equal(s.manuscript,'reviewing');
  assert(s.schedule.some(e=>e.kind==='review'));
});

test('full-auto applies first available funding choice, and choice selection leaves RNG untouched',()=>{
  const s=G.makeGame('aware',32);
  A.step(s,'full');
  assert.match(s.pending.title,/DC1/);
  const before=s.rngState;
  assert.equal(A.choiceIndex(s),0);
  assert.equal(s.rngState,before);
  assert.equal(A.step(s,'full').type,'choice');
  assert(s.schedule.some(e=>e.kind==='dc_result'));
});

test('full auto selects nontrivial alternatives deterministically',()=>{
  const s=G.makeGame('unaware',3005);
  s.pending={id:'two_paths',choices:[{label:'A'},{label:'B'},{label:'C'}]};
  const rng=s.rngState;
  const i=A.choiceIndex(s);assert.equal(i,A.choiceIndex(s));
  assert(i>=0&&i<3);assert.equal(s.rngState,rng);
});

test('complete automatic journeys eventually finish, with bounded months and deterministic replays',()=>{
  for(let seed=1;seed<=100;seed++){
    const awareness=seed%2?'aware':'unaware';
    const a=G.makeGame(awareness,seed),b=G.makeGame(awareness,seed);
    for(let i=0;i<300&&!a.finished;i++){
      const r=A.step(a,'full');assert.notEqual(r.type,'paused','stalled seed='+seed+' step='+i);
    }
    assert(a.finished,'did not finish seed='+seed);
    assert(a.month<=48);
    for(let i=0;i<300&&!b.finished;i++) A.step(b,'full');
    assert.equal(JSON.stringify(a),JSON.stringify(b));
  }
});