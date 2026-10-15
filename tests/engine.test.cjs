const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const dir=path.resolve(__dirname,'../src');
const code=['data','events','engine'].map(f=>fs.readFileSync(path.join(dir,f+'.js'),'utf8')).join('\n')+'\nglobalThis.testExport={GameData,GameEvents,DoctoralGame};';
const context=vm.createContext({});vm.runInContext(code,context);
const {DoctoralGame:G,GameData:D}=context.testExport;
function advanceResolving(s,action='research',count=1){for(let i=0;i<count&&!s.finished;i++){if(s.pending)G.resolve(s,0);if(s.pending)G.resolve(s,0);if(s.manuscript==='writing'&&s.draft===100)G.submit(s);G.advance(s,action);while(s.pending)G.resolve(s,0);}}

test('same seed reproducibly generates same profile and first turn',()=>{
 const a=G.makeGame('aware',48923),b=G.makeGame('aware',48923);
 assert.equal(JSON.stringify(a),JSON.stringify(b));
 advanceResolving(a,'research',12);advanceResolving(b,'research',12);
 assert.equal(JSON.stringify(a),JSON.stringify(b));
});
test('M2 DC1 May -> submitted, result reserved for six months later',()=>{
 const s=G.makeGame('aware',32);assert.equal(s.month,-12);
 G.advance(s,'funding');assert.equal(s.month,-11);assert.match(s.pending.title,/DC1/);
 G.resolve(s,0);assert.equal(s.schedule[0].kind,'dc_result');assert.equal(s.schedule[0].due,-5);
});
test('unaware starts D1 and can apply DC2 but not DC1',()=>{
 const s=G.makeGame('unaware',32);assert.equal(s.month,0);
 G.advance(s,'funding');assert.equal(s.month,1);assert.match(s.pending.title,/DC2/);
 assert(!s.offers.some(x=>x.title.includes('DC1')));
});
test('submission creates delayed review result and resolves into a correct manuscript state',()=>{
 const s=G.makeGame('unaware',244);s.research=80;s.draft=100;
 assert.equal(G.canSubmit(s),true);assert(G.submit(s));assert.equal(s.manuscript,'reviewing');
 assert(s.schedule.some(x=>x.kind==='review'&&x.due>=3&&x.due<=5));
 advanceResolving(s,'rest',6);assert(['writing','reviewing'].includes(s.manuscript));
 assert(s.papers>=0&&s.papers<=1);
});
test('fixed graduation requirements and extension',()=>{
 const s=G.makeGame('unaware',3),p=G.profile(s);
 s.month=35;s.research=100;s.papers=p.university.paperRequirement;
 G.advance(s,'rest');assert(s.finished);assert.equal(s.outcome.status,'degree');
 const t=G.makeGame('unaware',4);t.month=35;t.research=10;t.papers=0;
 G.advance(t,'rest');assert(!t.finished);while(t.pending&&t.pending.id!=='extension')G.resolve(t,0);
 assert.equal(t.pending.id,'extension');G.resolve(t,0);assert(!t.finished);
});
test('ran 100 simulated journeys without impossible states or runtime errors',()=>{
 for(let seed=1;seed<=100;seed++){
  const s=G.makeGame(seed%2?'aware':'unaware',seed);
  for(let step=0;step<65&&!s.finished;step++){
   while(s.pending)G.resolve(s,(seed%5===0&&s.pending.choices.length>1)?1:0);
   const action=s.manuscript==='writing'&&s.draft<100&&s.research>27?(step%3===0?'research':'write'):'research';
   if(G.canSubmit(s))G.submit(s);
   G.advance(s,action);
   assert(s.cash>=0);assert(s.morale>=0&&s.morale<=100);assert(s.draft>=0&&s.draft<=100);assert(s.research>=0&&s.research<=100);
  }
  assert(s.month<=48);assert(s.finished||!!s.pending);
 }
});
