const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../src');
const code=['data','events','engine','auto','multiverse'].map(name=>fs.readFileSync(path.join(dir,name+'.js'),'utf8')).join('\n')+'\nglobalThis.modules={DoctoralGame,AutoPlay,Multiverse};';
const context=vm.createContext({});vm.runInContext(code,context);
const {DoctoralGame:G,Multiverse:M,AutoPlay:A}=context.modules;

test('profile seed generates equal initial hands with independent episode seeds',()=>{
  for(let seed=1;seed<50;seed++){
    const a=G.makeGame('aware',seed,12345),b=G.makeGame('aware',seed,67890);
    for(const k of ['seed','profileSeed','field','university','advisor','family','relationship','initialPapers','labBudget','cash','research','draft','morale','dcPrep']) assert.equal(a[k],b[k],`profile ${k}`);
    assert.equal(a.rngState,12345);assert.equal(b.rngState,67890);
    assert.notEqual(a.episodeSeed,b.episodeSeed);
  }
});

test('explicit two seeds preserve full deterministic replay including auto decisions',()=>{
  const a=G.makeGame('unaware',9234,4901),b=G.makeGame('unaware',9234,4901);
  assert(A.runToEnd(a).finished);assert(A.runToEnd(b).finished);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
});

test('same hand with different episode seeds produces diverse outcomes',()=>{
  const b=G.makeGame('aware',3000,111),a=G.makeGame('aware',3000,222);
  A.runToEnd(b);A.runToEnd(a);
  assert.notEqual(JSON.stringify(b.timeline),JSON.stringify(a.timeline));
});

test('100 journeys preserve original save and add up correctly',()=>{
  const s=G.makeGame('aware',300);G.advance(s,'funding');G.resolve(s,0);
  const before=JSON.stringify(s);
  const r=M.run(s,483921);
  assert.equal(JSON.stringify(s),before);
  assert.equal(r.sampleSize,100);
  assert.equal(r.outcomes.standard+r.outcomes.extended+r.outcomes.withoutDegree,100);
  assert.equal(r.duration[36]+r.duration[48],100);
  assert.equal(r.papers.reduce((a,b)=>a+b,0),100);
  assert.equal(r.samples.length,100);
  assert.equal(new Set(r.samples.map(x=>x.episodeSeed)).size,100);
  for(const type of ['DC1','DC2']) assert(r.dc[type].accepted<=r.dc[type].applied);
  for(const sample of r.samples)assert([36,48].includes(sample.months));
});

test('same batch seed produces same batch; different batch changes results',()=>{
  const s=G.makeGame('unaware',5831);
  const a=M.run(s,91820),b=M.run(s,91820),c=M.run(s,91821);
  assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.notEqual(JSON.stringify(a.samples),JSON.stringify(c.samples));
});

test('invalid trial requests fail early and new UI is wired',()=>{
  assert.throws(()=>M.run(null,4));
  assert.throws(()=>M.run(G.makeGame(),5,501));
  assert.throws(()=>M.run(G.makeGame(),1.5));
  const ui=fs.readFileSync(path.join(dir,'ui.js'),'utf8');
  const html=fs.readFileSync(path.resolve(dir,'../index.html'),'utf8');
  assert(html.indexOf('src/multiverse.js')>html.indexOf('src/auto.js'));
  assert(html.indexOf('src/ui.js')>html.indexOf('src/multiverse.js'));
  assert(ui.includes('data-do="cohort-run"'));
  assert(ui.includes('data-do="cohort-close"'));
  assert(ui.includes('Multiverse.run(state,randomEpisodeSeed())'));
  assert.doesNotThrow(()=>new vm.Script(ui));
});
