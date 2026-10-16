const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'src');
const code=['data','events','engine','auto','multiverse','reference-stats','real-world-comparison'].map(n=>fs.readFileSync(path.join(dir,n+'.js'),'utf8')).join('\n')+'\nglobalThis.mods={DoctoralGame,AutoPlay,Multiverse,ReferenceStats,RealWorldComparison};';
const context=vm.createContext({});vm.runInContext(code,context);
const {DoctoralGame:G,AutoPlay:A,Multiverse:M,RealWorldComparison:C}=context.mods;
const approx=(a,b)=>Math.abs(a-b)<0.15;
test('every MEXT field has a fully grounded 5-category distribution summing approximately to 100%',()=>{
 for(const key of C.FIELD_KEYS){
  const bins=C.MEXT.byField[key];assert.equal(bins.length,5);
  assert(approx(Array.from(bins).reduce((a,b)=>a+b,0),100),key);
 }
 assert.equal(C.MEXT.year,2022);
 assert.match(C.MEXT.population,/満期退学/);
 assert.match(C.MEXT.url,/mext\.go\.jp/);
});
test('100 trials produce comparable 5-bin duration and 2-bin degree series without changing saved state',()=>{
 const s=G.makeGame('aware',8341,123);A.runToEnd(s);
 const before=JSON.stringify(s);const run=M.run(s,71023);
 const report=C.build(run,C.defaultField(s.field),s);
 assert.equal(JSON.stringify(s),before);
 assert.equal(report.sampleSize,100);
 assert.equal(report.duration.length,5);
 assert.equal(report.degree.length,2);
 assert(approx(report.duration.reduce((a,b)=>a+b.game,0),100));
 assert(approx(report.degree.reduce((a,b)=>a+b.game,0),100));
 assert.equal(report.degree[0].game,run.graduated);
 assert.equal(report.degree[0].real,72.9);
 assert.equal(report.duration[2].game,0);
 assert.equal(report.duration[3].game,0);
 assert.equal(report.duration[4].game,0);
 assert.equal(report.duration.filter(b=>b.player).length,1);
 assert.equal(report.degree.filter(b=>b.player).length,1);
});
test('published papers retain nonresponse and do not imply identical publication definitions',()=>{
 const s=G.makeGame('unaware',39,120);const run=M.run(s,7405);
 const d=C.build(run,'humanities');
 assert.equal(d.papers.length,6);
 assert(approx(d.papers.reduce((a,b)=>a+b.real,0),100));
 assert(approx(d.papers.reduce((a,b)=>a+b.game,0),100));
 assert.equal(d.papers[5].game,0);
 assert(d.papers[5].real>25);
 assert.match(d.publicationSource.note,/査読/);
 assert.throws(()=>C.build(run,'invalid'));
});
test('reference field selection is explicitly distinct from simulation majors',()=>{
 assert.equal(C.defaultField('cs'),'engineering');
 assert.equal(C.defaultField('materials'),'engineering');
 assert.equal(C.defaultField('humanities'),'humanities');
 assert.equal(C.defaultField('bio'),'science');
 const report=C.build(M.run(G.makeGame('unaware',33),732),'social');
 assert.equal(report.fieldName,'社会科学');
 assert.equal(report.duration[0].real,20.7);
});
test('UI includes published comparison in ending and 100-run view with source links',()=>{
 const ui=fs.readFileSync(path.join(dir,'ui.js'),'utf8');
 assert(ui.includes('${publishedComparison(endingBenchmark())}'));
 assert(ui.includes('${publishedComparison(r)}'));
 assert(ui.includes("if(what==='real-field')"));
 assert(ui.includes('target="_blank" rel="noopener noreferrer"'));
 assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes('src/real-world-comparison.js'));
 assert(fs.readFileSync(path.join(root,'tools/build.mjs'),'utf8').includes("'real-world-comparison'"));
 assert.doesNotThrow(()=>new vm.Script(ui));
});
