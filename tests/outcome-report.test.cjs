const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'src');
const files=['data','events','engine','auto','multiverse','outcome-report'];
const ctx=vm.createContext({});
vm.runInContext(files.map(n=>fs.readFileSync(path.join(dir,n+'.js'),'utf8')).join('\n')+'\nglobalThis.modules={DoctoralGame,AutoPlay,Multiverse,OutcomeReport}',ctx);
const {DoctoralGame:G,AutoPlay:A,Multiverse:M,OutcomeReport:R}=ctx.modules;
test('finished player compared with fixed-hand 100 lives without mutating the save',()=>{
 const s=G.makeGame('aware',1283,18);
 A.runToEnd(s);
 const before=JSON.stringify(s),r=M.run(s,8192),d=R.build(s,r);
 assert.equal(JSON.stringify(s),before);
 assert.equal(d.sampleSize,100);
 assert.equal(d.metrics.length,3);
 for(const item of d.metrics){
   assert.equal(item.bins.filter(x=>x.selected).length,1);
   assert.equal(item.bins.reduce((a,b)=>a+b.count,0),100);
   assert(item.top>=1&&item.top<=99);
 }
 assert.equal(d.months.bins.reduce((a,b)=>a+b.count,0),100);
 assert.equal(d.result.graduated,r.graduated);
 assert.equal(r.cashBalances.length,100);
 assert.equal(r.samples.length,100);
});
test('midrank handles ties, debt rewards lower balances, duration avoids rankings',()=>{
 const a=R.position(2,[1,2,2,3],'high');
 assert.equal(a.top,50);
 assert.equal(R.position(0,[0,0,1,2],'low').top,25);
 const s=G.makeGame('unaware',222,33);A.runToEnd(s);
 const d=R.build(s,M.run(s,1234));
 assert.equal(d.months.bins.length,2);
 assert.equal(d.months.top,undefined);
});
test('non-finished sessions have no final standing and pure histogram includes outliers',()=>{
 assert.equal(R.build(G.makeGame('unaware',22),M.run(G.makeGame('unaware',22),778)),null);
 const bins=R.histogram([0,1,2,3,4,5],12,'cash');
 assert.equal(bins.reduce((a,b)=>a+b.count,0),6);
 assert.equal(bins.filter(b=>b.selected).length,1);
 assert(bins.find(b=>b.selected).label.includes('超過'));
});
test('UI includes starting parameters in 100-trial screen and final comparison',()=>{
 const ui=fs.readFileSync(path.join(dir,'ui.js'),'utf8');
 assert(ui.includes('initialStatsCompact()'));
 assert(ui.includes('resultComparison(endingBenchmark())'));
 assert(ui.includes("resultComparison(r,'この100回とあなたの結果')"));
 assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('src/outcome-report.js'));
 assert.doesNotThrow(()=>new vm.Script(ui));
});
