/* Monte Carlo of alternative fictional lives sharing exactly the same initial profile.
 * All rates are game-model observations, never estimates of real-world doctorate odds. */
const Multiverse=(()=>{
  const TRIALS=100;
  const PAPER_BINS=Object.freeze(['0本','1本','2本','3本','4本以上']);
  function chooseSeed(batchSeed,index){return DoctoralGame.mixSeed(batchSeed,Math.imul(index+1,0x9e3779b1));}
  function median(numbers){const xs=numbers.slice().sort((a,b)=>a-b);return (xs[Math.floor((xs.length-1)/2)]+xs[Math.floor(xs.length/2)])/2;}
  function run(original,batchSeed,count=TRIALS){
    if(!original||!Number.isInteger(count)||count<1||count>500)throw Error('Invalid trial request');
    const initial=original.savedInitial?.seed===original.seed?original.savedInitial:original;
    if(!Number.isInteger(batchSeed))throw Error('Invalid batch seed');
    const result={sampleSize:count,profileSeed:original.seed,batchSeed:batchSeed>>>0,
      outcomes:{standard:0,extended:0,withoutDegree:0,dropout:0},duration:{36:0,48:0},
      papers:[0,0,0,0,0],dc:{DC1:{applied:0,accepted:0},DC2:{applied:0,accepted:0}},
      loans:[],cashBalances:[],publicationCounts:[],samples:[]};
    for(let i=0;i<count;i++){
      const episodeSeed=chooseSeed(batchSeed,i);
      const s=DoctoralGame.makeGame(initial.awareness,initial.seed,episodeSeed);
      // Required invariant: identical starting conditions irrespective of future event seed.
      for(const key of ['field','university','advisor','family','relationship','initialPapers','labBudget','cash','research','draft','morale','dcPrep']) {
        if(s[key]!==initial[key])throw Error('Initial profile changed across samples: '+key);
      }
      const finish=AutoPlay.runToEnd(s);
      if(!finish.finished)throw Error('Trial did not finish: '+finish.reason);
      const kind=s.outcome.status==='dropout'?'dropout':s.outcome.status==='degree'?(s.outcome.months<=36?'standard':'extended'):'withoutDegree';
      result.outcomes[kind]++;
      result.duration[s.outcome.months]=(result.duration[s.outcome.months]||0)+1;
      result.papers[Math.min(4,s.papers)]++;
      result.loans.push(s.debt);result.cashBalances.push(s.cash);result.publicationCounts.push(s.papers);
      for(const type of ['DC1','DC2']){
        if(s.applications[type])result.dc[type].applied++;
        if(s.fellowship?.type===type)result.dc[type].accepted++;
      }
      result.samples.push({episodeSeed,papers:s.papers,cash:s.cash,debt:s.debt,months:s.outcome.months,outcome:kind});
    }
    result.graduated=result.outcomes.standard+result.outcomes.extended;
    result.completed=result.graduated+result.outcomes.withoutDegree;
    result.averagePapers=result.publicationCounts.reduce((a,b)=>a+b,0)/count;
    result.medianPapers=median(result.publicationCounts);
    result.medianDebt=median(result.loans);result.medianCash=median(result.cashBalances);
    return result;
  }
  return {TRIALS,PAPER_BINS,chooseSeed,run};
})();
