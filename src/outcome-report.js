/* Game-only final outcome comparisons. These are not measured population statistics. */
const OutcomeReport=(()=>{
  function median(values){const xs=values.slice().sort((a,b)=>a-b);return (xs[Math.floor((xs.length-1)/2)]+xs[Math.floor(xs.length/2)])/2;}
  function position(value,values,better='high'){
    if(!values.length)throw Error('Empty comparison set');
    const ahead=values.filter(x=>better==='low'?x<value:x>value).length;
    const ties=values.filter(x=>x===value).length;
    const top=Math.max(1,Math.min(99,Math.round(100*(ahead+ties/2)/values.length)));
    const percentile=100-top;
    const tier=percentile>=90?'S':percentile>=75?'A':percentile>=50?'B':percentile>=25?'C':'D';
    return {top,percentile,tier,ties};
  }
  function histogram(values,value,kind){
    if(kind==='papers'){
      return [0,1,2,3,4].map(i=>({label:i===4?'4本以上':i+'本',count:values.filter(v=>Math.min(4,v)===i).length,selected:Math.min(4,value)===i}));
    }
    if(kind==='months'){
      const options=Array.from(new Set([...values,value])).sort((a,b)=>a-b);
      return options.map(v=>({label:v+'か月',count:values.filter(x=>x===v).length,selected:v===value}));
    }
    const min=Math.min(...values),max=Math.max(...values);
    if(min===max)return [{label:min+'万円',count:values.length,selected:value===min}];
    const step=Math.max(1,Math.ceil((max-min+1)/5));
    const bins=Array.from({length:5},(_,i)=>{
      const start=min+step*i,end=Math.min(max,start+step-1);
      if(start>max)return null;
      return {label:start===end?start+'万円':start+'～'+end+'万円',count:values.filter(x=>x>=start&&x<=end).length,selected:value>=start&&value<=end};
    }).filter(Boolean);
    if(value<min)bins.unshift({label:'最小値未満',count:0,selected:true});
    if(value>max)bins.push({label:'最大値超過',count:0,selected:true});
    return bins;
  }
  function build(state,trials){
    if(!state?.finished||!trials?.samples?.length)return null;
    const samples=trials.samples,n=samples.length;
    const specs=[
      {key:'papers',label:'査読採択論文',unit:'本',value:state.papers,values:samples.map(s=>s.papers),better:'high',explain:'採択論文が多いほど上位'},
      {key:'cash',label:'終了時の現金',unit:'万円',value:state.cash,values:samples.map(s=>s.cash),better:'high',explain:'手元の現金が多いほど上位（借入と別集計）'},
      {key:'debt',label:'累積借入',unit:'万円',value:state.debt,values:samples.map(s=>s.debt),better:'low',explain:'借入が少ないほど上位'}
    ];
    const metrics=specs.map(s=>({key:s.key,label:s.label,value:s.value,unit:s.unit,explain:s.explain,
      median:median(s.values),min:Math.min(...s.values),max:Math.max(...s.values),
      ...position(s.value,s.values,s.better),bins:histogram(s.values,s.value,s.key)}));
    const completed=samples.filter(s=>s.outcome==='standard'||s.outcome==='extended').length;
    const category=state.outcome.status==='degree'?(state.outcome.months===36?'standard':'extended'):'withoutDegree';
    return {sampleSize:n,metrics,months:{value:state.outcome.months,median:median(samples.map(s=>s.months)),bins:histogram(samples.map(s=>s.months),state.outcome.months,'months')},
      result:{category,matching:samples.filter(s=>s.outcome===category).length,graduated:completed,standard:trials.outcomes.standard}};
  }
  return {build,position,histogram,median};
})();
