/* Reference-only comparisons between fictional full-auto trials and published data.
 * These datasets have DIFFERENT denominators; never treat them as calibrated odds. */
const RealWorldComparison=(()=>{
  const FIELD_KEYS=Object.freeze(['humanities','social','science','engineering','agriculture','health','other']);
  const FIELD_NAMES=Object.freeze({humanities:'人文科学',social:'社会科学',science:'理学',engineering:'工学',agriculture:'農学',health:'保健',other:'その他'});
  const FIELD_DEFAULT=Object.freeze({cs:'engineering',materials:'engineering',bio:'science',humanities:'humanities'});
  const MEXT=Object.freeze({
    year:2022,publicationYear:2024,title:'文部科学省「大学院関連参考資料集」p.38／令和5年度学校基本調査',
    url:'https://www.mext.go.jp/content/20240604-mxt_koutou02-000033844.pdf',
    population:'標準修業年限3年の博士課程修了者等（満期退学者を含む、編入学者を除く）。令和4年度の修了者等',
    labels:Object.freeze(['標準年限内','1年超過','2年超過','3年超過','4年以上超過']),
    byField:Object.freeze({
      humanities:Object.freeze([21.3,20.3,14.7,18.2,25.6]),
      social:Object.freeze([20.7,22.1,14.0,15.7,27.4]),
      science:Object.freeze([52.9,30.0,8.6,5.4,3.1]),
      engineering:Object.freeze([44.5,34.7,8.5,6.2,6.1]),
      agriculture:Object.freeze([39.1,41.0,10.3,3.8,5.9]),
      health:Object.freeze([46.7,23.3,10.3,8.3,11.4]),
      other:Object.freeze([36.9,28.4,11.5,10.2,12.9])
    })
  });
  const DEGREE=Object.freeze({
    cohortYear:2015,reportYear:2018,rate:72.9,
    url:'https://www.nistep.go.jp/wp/wp-content/uploads/NISTEP-NR174-FullJ.pdf',
    title:'NISTEP 博士人材追跡調査 第2次報告書（NISTEP REPORT No.174）',
    population:'2015年度博士課程修了者等コホート（満期退学者を含む）の修了年度末の博士学位取得割合。入学者の修了率ではない。'
  });
  function defaultField(gameField){return FIELD_DEFAULT[gameField]||'engineering';}
  function build(trials,fieldKey='engineering',player=null){
    if(!trials?.samples?.length)throw Error('Missing completed game trials');
    if(!FIELD_KEYS.includes(fieldKey))throw Error('Unknown real-world reference field');
    const n=trials.samples.length;
    const pct=count=>100*count/n;
    const durations=MEXT.labels.map((label,i)=>({
      label,
      game:pct(trials.samples.filter(s=>i===0?s.months<=36:i===1?s.months>36&&s.months<=48:false).length),
      real:MEXT.byField[fieldKey][i],
      player:!!player?.finished&&(i===0?player.outcome.months<=36:i===1?player.outcome.months>36&&player.outcome.months<=48:false)
    }));
    const degree=[{label:'学位取得',game:pct(trials.graduated),real:DEGREE.rate,player:player?.finished?player.outcome.status==='degree':false},
      {label:'学位未取得',game:pct(n-trials.graduated),real:100-DEGREE.rate,player:player?.finished?player.outcome.status!=='degree':false}];
    const existing=ReferenceStats.publications;
    const actual=[existing.bins[0].count,existing.bins[1].count,existing.bins[2].count,existing.bins[3].count,
      existing.bins.slice(4,7).reduce((a,b)=>a+b.count,0),existing.bins[7].count];
    const total=actual.reduce((a,b)=>a+b,0);
    const paperLabels=['0本','1本','2本','3～5本','6本以上','無回答'];
    const gamePaperCounts=[0,0,0,0,0,0];
    for(const s of trials.samples){
      const v=s.papers;
      gamePaperCounts[v===0?0:v===1?1:v===2?2:v<=5?3:4]++;
    }
    const papers=paperLabels.map((label,i)=>({label,game:pct(gamePaperCounts[i]),real:actual[i]/total*100,
      player:!!player?.finished&&i!==5&&(i===0?player.papers===0:i===1?player.papers===1:i===2?player.papers===2:i===3?player.papers>=3&&player.papers<=5:player.papers>=6)}));
    return {sampleSize:n,fieldKey,fieldName:FIELD_NAMES[fieldKey],fields:FIELD_KEYS.map(key=>({key,label:FIELD_NAMES[key]})),
      duration:durations,degree,papers,mext:MEXT,degreeSource:DEGREE,publicationSource:existing};
  }
  return {build,defaultField,MEXT,DEGREE,FIELD_KEYS};
})();
