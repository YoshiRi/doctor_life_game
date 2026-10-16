/* Replay-only data transformations. Never re-run the simulation to build credits. */
const EndingRoll = (() => {
  const PARAMS=Object.freeze([
    {key:'research',label:'研究進捗',unit:'%',min:0,max:100},
    {key:'draft',label:'原稿進捗',unit:'%',min:0,max:100},
    {key:'morale',label:'精神的余裕',unit:'%',min:0,max:100},
    {key:'cash',label:'現金残高',unit:'万円',min:0,max:100},
    {key:'debt',label:'累積借入',unit:'万円',min:0,max:150},
    {key:'papers',label:'査読採択論文',unit:'本',min:0,max:4},
    {key:'dcPrep',label:'DC申請準備',unit:'pt',min:0,max:30},
    {key:'raPrep',label:'RA応募準備',unit:'pt',min:0,max:20},
    {key:'labBudget',label:'研究室予算',unit:'pt',min:0,max:4}
  ]);
  const SPEEDS=[1,2,4,8];
  const INTERVAL_MS=1450;
  function build(state){
    if (!state?.finished) return [];
    if (Array.isArray(state.timeline)&&state.timeline.length) {
      return state.timeline.map((event,i)=>({
        kind:event.kind,month:event.month,period:event.period,title:event.title,
        detail:event.detail||'',before:event.before||null,after:event.after||null,
        delta:event.delta||{},notes:event.notes||[],key:i
      }));
    }
    // Legacy saves contain recent text logs but no deltas or past snapshots.
    const logs=(state.logs||[]).slice().reverse();
    return logs.map((l,i)=>({kind:'legacy',month:l.month,period:l.period,title:l.title,
      detail:l.detail||'',before:null,after:null,delta:{},notes:[],key:i}));
  }
  function pretty(value){return Number.isInteger(value)?String(value):Number(value).toFixed(1);}
  function diffLabel(v,unit){return `${v>0?'+':''}${pretty(v)}${unit}`;}
  function barWidth(value,param){return Math.max(0,Math.min(100,100*(value-param.min)/(param.max-param.min)));}
  return {PARAMS,SPEEDS,INTERVAL_MS,build,pretty,diffLabel,barWidth};
})();
