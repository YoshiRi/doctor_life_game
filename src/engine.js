/* Pure simulation core. All simulated probabilities/weights are hypothetical. */
const DoctoralGame = (() => {
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  function rand(s) { let x=s.rngState>>>0; x^=x<<13; x^=x>>>17; x^=x<<5; s.rngState=x>>>0; return (s.rngState>>>0)/4294967296; }
  function roll(s,p) { return rand(s)<clamp(p,0,1); }
  function range(s,a,b) { return a+Math.floor(rand(s)*(b-a+1)); }
  function pick(s,arr) { return arr[Math.floor(rand(s)*arr.length)]; }
  function weighted(s,arr,key='weight') { const sum=arr.reduce((z,e)=>z+(e[key]||1),0); let r=rand(s)*sum; for(const e of arr){r-=e[key]||1;if(r<0)return e} return arr[arr.length-1]; }
  function stage(s) { if(s.month<0)return 'M2';if(s.month<36)return 'D'+(Math.floor(s.month/12)+1);return '延長'; }
  function date(s) { const calIndex = ((s.month%12)+12)%12;return `${stage(s)}・${((calIndex+3)%12)+1}月`; }
  function dateYear(s) { return 2027+Math.floor(s.month/12); }
  function dateText(s) { return `${dateYear(s)}年${((s.month+3)%12+12)%12+1}月`; }
  function monthInAcademicYear(s) { return ((s.month%12)+12)%12; }
  function log(s,title,detail='',type='neutral',source='game') { s.logs.unshift({month:s.month,period:date(s),title,detail,type,source});if(s.logs.length>150)s.logs.length=150; }
  function mixSeed(value,salt=0){
    let x=(value^salt)>>>0;
    x=Math.imul(x^(x>>>16),0x7feb352d);
    x=Math.imul(x^(x>>>15),0x846ca68b);
    return ((x^(x>>>16))>>>0)||123456789;
  }
  function randomSeed(){return ((Date.now()^Math.floor(Math.random()*4294967295))>>>0)||123456789;}
  // profileSeed controls ONLY initial conditions. episodeSeed controls subsequent randomness.
  // Explicit seeds remain reproducible, but callers can vary the episode independently.
  function makeGame(awareness='aware',seed,episodeSeed) {
    const seedValue = (seed===undefined ? randomSeed() : seed)>>>0 || 123456789;
    const episodeValue=(episodeSeed===undefined
      ? (seed===undefined?randomSeed():mixSeed(seedValue,0xa53c9e21)) : episodeSeed)>>>0 || 123456789;
    const s={version:1, seed:seedValue, profileSeed:seedValue, episodeSeed:episodeValue, rngState:seedValue, awareness, month:awareness==='aware'?-12:0, finished:false, outcome:null,
      cash:0,debt:0,morale:68, research:0,draft:0,papers:0, initialPapers:0,dcPrep:0,raPrep:0,
      manuscript:'writing', pending:null, offers:[],schedule:[],logs:[],seen:{},fellowship:null,spring:null,ra:null,
      applications:{}, actionHistory:[], savedInitial:null,university:null,field:null,advisor:null,family:null,relationship:null,
      labBudget:0, lastCashFlow:null, timeline:[] };
    s.field=pick(s,GameData.fields).id;
    s.university=weighted(s,GameData.universities).id;
    s.advisor=pick(s,GameData.advisors).id;
    s.family=weighted(s,GameData.family.map((x,i)=>({...x,weight:[4,4,2][i]}))).id;
    s.relationship=pick(s,GameData.relationships).id;
    s.initialPapers=weighted(s,[{value:0,weight:6},{value:1,weight:3},{value:2,weight:1}]).value;
    s.labBudget=range(s,0,2);
    s.cash=range(s,6,25);
    s.research=range(s,6,18)+s.initialPapers*3;
    s.draft=range(s,0,11);
    s.morale=range(s,59,83);
    s.dcPrep=awareness==='aware'?range(s,1,5):0;
    s.rngState=episodeValue; // All future outcome rolls are independent of profile draws.
    s.savedInitial={...s, savedInitial:null, logs:[],actionHistory:[],offers:[],schedule:[],seen:{},applications:{}};
    s.timeline.push({kind:'start',month:s.month,period:date(s),title:'研究人生のはじまり',detail:'最初に配られた条件',before:null,after:endingSnapshot(s),delta:{},notes:[]});
    log(s,'あなたの研究人生が始まった',awareness==='aware'?'M2の春。DC1の申請を見据えて動き出す。':'D1の春。DC1は申請しておらず、他の支援策を探すことになる。','positive');
    return s;
  }
  function profile(s){return {field:GameData.fields.find(e=>e.id===s.field),university:GameData.universities.find(e=>e.id===s.university),advisor:GameData.advisors.find(e=>e.id===s.advisor),family:GameData.family.find(e=>e.id===s.family),relationship:GameData.relationships.find(e=>e.id===s.relationship)};}
  function isFunded(s){return active(s.fellowship,s.month)||active(s.spring,s.month)||active(s.ra,s.month);}
  function active(x,m){return !!x && x.start<=m && x.end>m;}
  function effect(s,obj={}){for(const [k,v] of Object.entries(obj)){if(k==='cash'){s.cash+=v;continue;}if(k in s && typeof s[k]==='number')s[k]+=v;}s.research=clamp(s.research,0,100);s.draft=clamp(s.draft,0,100);s.morale=clamp(s.morale,0,100);s.labBudget=clamp(s.labBudget,0,4);s.dcPrep=clamp(s.dcPrep,0,30);s.raPrep=clamp(s.raPrep,0,20);}
  function enqueue(s,ev){s.offers.push(ev);}
  function showNext(s){if(!s.pending&&s.offers.length){s.pending=s.offers.shift();return true;}return false;}
  function scheduled(s){const due=s.schedule.filter(x=>x.due<=s.month);s.schedule=s.schedule.filter(x=>x.due>s.month);for(const x of due){if(x.kind==='dc_result'){
      const success=roll(s,x.chance);const title=`${x.type} 選考結果：${success?'採用内定':'不採択'}`;
      enqueue(s,{id:'result_'+x.type,category:'funding',tone:success?'positive':'negative',source:'official_schedule_hypothetical_rate',title,description:success?`${x.type}の採用が内定した。翌年度4月から研究奨励金を受ける見込み。`:`${x.type}は不採択だった。研究環境を維持するため、別の資金源も検討したい。`,choices:[{label:'次へ進む',detail:'選考結果を反映',kind:'dc_result',result:success,type:x.type,start:x.start}],prob:x.chance});
    }else if(x.kind==='spring_result'||x.kind==='ra_result'){
      const success=roll(s,x.chance);const name=x.kind==='spring_result'?'大学の博士支援制度':'RA';
      enqueue(s,{id:x.kind,category:'funding',tone:success?'positive':'negative',source:'hypothetical',title:`${name}：${success?'採用':'不採用'}`,description:success?`${name}に採用された。支給期間と担当業務を確認しよう。`:`${name}には採用されなかった。`,choices:[{label:'結果を確認',detail:'採否を反映',kind:x.kind,result:success,start:x.start}],prob:x.chance});
    }else if(x.kind==='review'){
      const r=rand(s);const p=x.prob||.33;const outcome=r<p?'accepted':r<p+GameData.hypotheticalProbabilities.paperRevisionBase?'revision':'rejected';
      enqueue(s,{id:'review_'+outcome,category:'research',tone:outcome==='accepted'?'positive':'negative',source:'hypothetical',title:{accepted:'投稿論文が採択された',revision:'査読結果：Major Revision',rejected:'査読結果：Reject'}[outcome],description:{accepted:'研究成果が査読を通過した。学位要件に一歩近づいた。',revision:'追加実験と原稿修正を求められた。査読コメントが届いている。',rejected:'不採択の通知が届いた。研究の筋道を見直して再投稿先を探す。'}[outcome],choices:[{label:'結果を受け止める',kind:'review_result',result:outcome,detail:outcome==='accepted'?'採択論文 +1':'再執筆に戻る'}]});
    }} }
  function dcOffer(s,type){let year=stage(s);let target=type==='DC1'?0:(year==='D1'?12:24);
    const eligible=(type==='DC1'&&year==='M2')||(type==='DC2'&&(year==='D1'||year==='D2')&&!s.fellowship);
    if(!eligible)return;
    enqueue(s,{id:`apply_${type}_${year}`,category:'funding',tone:'neutral',source:'official_schedule',title:`${type} の申請時期`,description:type==='DC1'?'M2の春。博士進学後のDC1採用に向けて、研究計画書と推薦等の手続きを進められる。':'来年度のDC2採用を目指す申請時期。業績と研究計画をどう説明するかが問われる。',choices:[
      {label:`${type}に申請する`,detail:'準備の蓄積で採択率が変化（仮モデル）',kind:'apply_dc',type,start:target},
      {label:'今回は見送る',detail:'来年以降の資金手段を考える',kind:'skip_dc',type}
    ]});
  }
  function fixedEvents(s){const m=monthInAcademicYear(s);const y=stage(s);
    if(m===1 && y==='M2'&&s.awareness==='aware')dcOffer(s,'DC1');
    if(m===1 && (y==='D1'||y==='D2')&&!s.fellowship)dcOffer(s,'DC2');
    if(m===1 && y==='D1'&&profile(s).university.spring&&!active(s.fellowship,s.month)){
      enqueue(s,{id:'spring_offer',category:'funding',tone:'neutral',source:'hypothetical',title:'大学の博士支援制度の募集',description:'所属大学で博士学生向けの支援制度の選考が行われる。採択者は生活費相当の支援を受けられる。',choices:[{label:'応募する',detail:'採用確率は仮設定',kind:'apply_spring'},{label:'見送る',kind:'skip',detail:'他の資金源を探す'}]});
    }
    if(m===6&&(y==='D1'||y==='D2'||y==='D3'||y==='延長')&&!isFunded(s)&&(!s.ra||s.ra.end<=s.month)){
      enqueue(s,{id:'ra_offer',category:'funding',tone:'neutral',source:'hypothetical',title:'研究室からRA募集の知らせ',description:'外部研究プロジェクトでRAを募集している。研究テーマとの一致度や研究室予算が選考に影響する。',choices:[{label:'応募してみる',detail:'採用確率は仮設定 / 給与と研究時間を交換',kind:'apply_ra'},{label:'見送る',kind:'skip',detail:'自分のテーマに集中'}]});
    }
    if(m===10&&(y==='D2'||y==='D3')){
      enqueue(s,{id:'annual_review',category:'academic',tone:'neutral',source:'hypothetical',title:'年度末の進捗面談',description:`これまでの査読採択論文は${s.papers}本。必要数${profile(s).university.paperRequirement}本に対して、研究の進み方を確認する。`,choices:[{label:'目標を再設定する',detail:'気力 +4 / 研究 +3',effects:{morale:4,research:3}},{label:'執筆の時間を増やす',detail:'原稿 +7 / 気力 −3',effects:{draft:7,morale:-3}}]});
    }
  }
  function testConditions(s,c={}){ if(c.fields&&!c.fields.includes(s.field))return false;if(c.advisors&&!c.advisors.includes(s.advisor))return false;if(c.relationships&&!c.relationships.includes(s.relationship))return false;if(c.minResearch!==undefined&&s.research<c.minResearch)return false;if(c.minDraft!==undefined&&s.draft<c.minDraft)return false;if(c.minMonth!==undefined&&s.month<c.minMonth)return false;if(c.maxMorale!==undefined&&s.morale>c.maxMorale)return false;return true;}
  function randomEvents(s){if(s.month<0)return;const candidates=GameEvents.random.filter(e=>testConditions(s,e.conditions)&&s.month-(s.seen[e.id]??-100)>=e.cooldown);
    // A monthly event is not mandatory. Never infer these frequencies from anecdotes.
    for(const e of candidates){if(roll(s,e.chance)){s.seen[e.id]=s.month;enqueue(s,{id:e.id,title:e.title,description:e.description,category:e.category,tone:e.tone,source:e.source,choices:e.choices});break;}}
  }
  function finance(s,action){const p=profile(s);const family=p.family.support;let expenses=p.university.cost+p.relationship.expense;
    // Fictional monthly income/expenses in units of ¥10,000.
    let income=family;
    let details=[`家庭援助 +${family}万円`];
    if(active(s.fellowship,s.month)){income+=21;details.push(`${s.fellowship.type} +21万円`);}
    if(active(s.spring,s.month)){income+=15;details.push('博士支援 +15万円');}
    if(active(s.ra,s.month)){income+=12;details.push('RA +12万円');}
    if(action==='work'){income+=10;details.push('TA・アルバイト +10万円');}
    else if(!isFunded(s)&&s.month>=0){income+=5;details.push('短時間勤務 +5万円');}
    if(s.month<0){income+=6;details.push('修士時代の収入 +6万円');}
    let balance=income-expenses;
    s.cash+=balance;
    if(s.cash<0){const borrowed=Math.ceil(-s.cash);s.cash+=borrowed;s.debt+=borrowed;s.morale-=2;details.push(`生活費不足による借入 +${borrowed}万円`);if(s.debt%50<borrowed)log(s,'借入額が増えてきた',`累積借入 ${s.debt}万円。`, 'negative');}
    s.morale=clamp(s.morale,0,100);
    s.lastCashFlow={income,expenses,balance,details};
  }
  function actionEffects(s,action){const p=profile(s);const mood=s.morale<35?.77:s.morale>75?1.1:1;const lab=1+.05*s.labBudget;
    if(action==='research'){effect(s,{research:Math.round((8+range(s,0,4))*p.advisor.research*lab*mood),draft:range(s,1,3),morale:-3});}
    else if(action==='write'){if(s.manuscript==='writing'&&s.research>=25){effect(s,{draft:Math.round((12+range(s,0,6))*p.advisor.writing*mood),research:range(s,1,3),morale:-3});}else{effect(s,{research:4,morale:-4});log(s,'執筆が進まない',s.manuscript==='reviewing'?'原稿は査読中。結果を待つ期間となった。':'研究成果をもう少し整理する必要がある。');}}
    else if(action==='funding'){effect(s,{dcPrep:3,raPrep:2,research:2,morale:-1});}
    else if(action==='work'){effect(s,{research:1,morale:-6});}
    else if(action==='talk'){effect(s,{research:Math.round(5*p.advisor.research),draft:s.manuscript==='writing'?4:0,morale:p.advisor.id==='hands_off'?-2:3});}
    else if(action==='rest'){effect(s,{morale:13,research:1});}
    else throw Error('Unknown action '+action);
    s.research=clamp(s.research+Math.round(p.field.baseline*.42*lab*mood),0,100);
    if(s.manuscript==='writing'&&s.research>=26)s.draft=clamp(s.draft+range(s,1,3),0,100);
    s.morale=clamp(s.morale-p.advisor.stress,0,100);
  }
  function career(s){const outcomes=s.papers>=3?['大学・研究機関のポスドク','企業の研究開発','大学教員（任期付き）','非研究職']:['企業の研究開発','大学・研究機関のポスドク','非研究職','起業・フリーランス'];return pick(s,outcomes);}
  function evaluateEnd(s){if(s.month!==36&&s.month!==48)return;
    const p=profile(s), ready=s.papers>=p.university.paperRequirement&&s.research>=p.university.researchRequirement;
    if(ready){s.finished=true;s.outcome={title:'博士号を取得',status:'degree',career:career(s),months:s.month,papers:s.papers,debt:s.debt};log(s,'博士号を取得した','学位審査を経て修了。','positive');}
    else if(s.month===36){enqueue(s,{id:'extension',category:'academic',tone:'negative',source:'hypothetical',title:'標準修業年限を迎えた',description:`現時点の査読論文 ${s.papers}/${p.university.paperRequirement} 本、研究 ${Math.round(s.research)}/${p.university.researchRequirement}。想定した学位申請要件に届いていない。`,choices:[{label:'1年間延長して続ける',detail:'研究を継続できるが生活費がかかる',kind:'extend'},{label:'ここで課程を離れる',detail:'学位を取得せず終了',kind:'withdraw'}]});}
    else {s.finished=true;s.outcome=ready?{title:'博士号を取得（延長）',status:'degree',career:career(s),months:s.month,papers:s.papers,debt:s.debt}:{title:'課程を離れた（学位未取得）',status:'without_degree',career:career(s),months:s.month,papers:s.papers,debt:s.debt};log(s,s.outcome.title,'延長期間が終了した。',ready?'positive':'negative');}
  }
  function advance(s,action){if(s.finished||s.pending||s.offers.length)return false;
    const oldDate=date(s);actionEffects(s,action);finance(s,action);s.actionHistory.push({month:s.month,period:oldDate,action});
    s.month++;
    if(s.month===0){log(s,'博士課程に入学した','M2の年度が終わり、D1が始まった。','positive');}
    scheduled(s);fixedEvents(s);if(s.month<36)randomEvents(s);evaluateEnd(s);showNext(s);
    return true;
  }
  function applicationChance(s,type){const base=type==='DC1'?GameData.hypotheticalProbabilities.dc1Base:GameData.hypotheticalProbabilities.dc2Base;
    const modifier=clamp(.55+s.initialPapers*.2+s.dcPrep*.043+(s.papers*.14)+(s.research/300),.4,2.1);
    return clamp(base*modifier,.035,.38);
  }
  function resolve(s,index){if(!s.pending)return false;const ev=s.pending, choice=ev.choices[index];if(!choice)return false;
    if(choice.effects)effect(s,choice.effects);
    if(choice.kind==='apply_dc'){
      const chance=applicationChance(s,choice.type);s.applications[choice.type]={applied:s.month,chance};
      s.schedule.push({kind:'dc_result',type:choice.type,due:s.month+6,chance,start:choice.start});
      log(s,`${choice.type}に申請`, `研究計画書を提出した。モデル内の抽選確率 ${(chance*100).toFixed(1)}%（実測値ではない）。`,'neutral','hypothetical');
    }else if(choice.kind==='skip_dc'){log(s,`${choice.type}の申請を見送った`,'次の申請機会や研究室の資金を探す。');}
    else if(choice.kind==='dc_result'){
      if(choice.result){s.fellowship={type:choice.type,start:choice.start,end:choice.start+(choice.type==='DC1'?36:24)};
        // A doctoral fellowship is mutually exclusive with the simplified SPRING/RA funding packages here.
        if(s.spring)s.spring.end=Math.min(s.spring.end,choice.start);
        if(s.ra)s.ra.end=Math.min(s.ra.end,choice.start);
      }
      log(s,ev.title,'選考を終えた。',choice.result?'positive':'negative');
    }else if(choice.kind==='apply_spring'){
      s.schedule.push({kind:'spring_result',due:s.month+1,chance:GameData.hypotheticalProbabilities.springBase,start:s.month+1});log(s,'博士支援制度へ応募','学内選考の結果を待つ。');
    }else if(choice.kind==='spring_result'){
      if(choice.result&&!active(s.fellowship,s.month))s.spring={type:'SPRING型支援',start:choice.start,end:36};
      log(s,ev.title,'学内選考を終えた。',choice.result?'positive':'negative');
    }else if(choice.kind==='apply_ra'){
      const chance=clamp(GameData.hypotheticalProbabilities.raBase+.085*s.labBudget+.025*s.raPrep,.1,.88);
      s.schedule.push({kind:'ra_result',due:s.month+1,chance,start:s.month+1});log(s,'RAに応募',`選考確率 ${(chance*100).toFixed(1)}%（仮）。`);
    }else if(choice.kind==='ra_result'){
      if(choice.result&&!isFunded(s))s.ra={type:'RA',start:choice.start,end:choice.start+10};
      log(s,ev.title,'研究プロジェクトのRA選考を終えた。',choice.result?'positive':'negative');
    }else if(choice.kind==='review_result'){
      s.manuscript='writing';if(choice.result==='accepted'){s.papers++;s.draft=0;s.research=clamp(s.research+5,0,100);s.morale=clamp(s.morale+10,0,100);}
      else if(choice.result==='revision'){s.draft=68;s.morale=clamp(s.morale-6,0,100);}else{s.draft=37;s.morale=clamp(s.morale-12,0,100);}
      log(s,ev.title,'研究成果と投稿計画を更新。',choice.result==='accepted'?'positive':'negative');
    }else if(choice.kind==='extend'){log(s,'課程を1年延長','新たな年度の研究を続ける。','neutral');}
    else if(choice.kind==='withdraw'){s.finished=true;s.outcome={title:'課程を離れた（学位未取得）',status:'without_degree',career:career(s),months:s.month,papers:s.papers,debt:s.debt};log(s,'課程を離れた','その後のキャリアへ進む。','negative');}
    else {log(s,ev.title,choice.label,ev.tone,ev.source);}
    s.pending=null;showNext(s);return true;
  }
  function canSubmit(s){return !s.finished&&!s.pending&&!s.offers.length&&s.manuscript==='writing'&&s.draft>=100&&s.month>=0;}
  function submit(s){if(!canSubmit(s))return false;
    s.manuscript='reviewing';s.draft=0;const duration=range(s,3,5);const prob=clamp(GameData.hypotheticalProbabilities.paperAcceptedBase+(s.research-55)/300, .19, .52);
    s.schedule.push({kind:'review',due:s.month+duration,prob});
    log(s,'論文を投稿した',`${duration}か月後に査読結果の予定。`, 'positive','hypothetical');return true;
  }
  // Every user-initiated state transition gets an immutable, replayable record.
  // This is presentation history, not part of the RNG or causal simulation.
  const ENDING_KEYS=['research','draft','morale','cash','debt','papers','dcPrep','raPrep','labBudget'];
  function endingSnapshot(s){
    const result={};for(const k of ENDING_KEYS)result[k]=Number(s[k])||0;
    result.funding=typeof s.fellowship==='undefined'?'なし':mainFunding(s);
    return result;
  }
  function recordTransition(s,kind,title,detail,fn){
    if(!Array.isArray(s.timeline)){
      // Old saved games have logs but not enough information for historical deltas.
      s.timeline=[{kind:'legacy_start',month:s.month,period:date(s),title:'ここから差分を記録',detail:'以前の出来事は差分が保存されていません',before:null,after:endingSnapshot(s),delta:{},notes:[]}];
    }
    const before=endingSnapshot(s),prev=s.logs[0],month=s.month,period=date(s);
    const result=fn();
    if(!result)return result;
    const after=endingSnapshot(s),delta={};
    for(const k of ENDING_KEYS)if(after[k]!==before[k])delta[k]=Number((after[k]-before[k]).toFixed(2));
    const notes=[];
    for(const item of s.logs){
      if(item===prev)break;
      notes.push({title:item.title,detail:item.detail||'',type:item.type||'neutral'});
    }
    s.timeline.push({kind,month,period,title,detail,before,after,delta,notes});
    return result;
  }
  function advanceRecorded(s,action){return recordTransition(s,'month',`今月の行動：${GameData.actions.find(a=>a.id===action)?.name||action}`,`選択：${action}`,()=>advance(s,action));}
  function resolveRecorded(s,index){
    const event=s.pending,choice=event?.choices[index];
    if(!choice)return false;
    return recordTransition(s,'event',event.title,`選択：${choice.label}`,()=>resolve(s,index));
  }
  function submitRecorded(s){return recordTransition(s,'submission','論文を投稿した','査読結果を待つ',()=>submit(s));}
  function mainFunding(s){const candidates=[s.fellowship,s.spring,s.ra].filter(x=>active(x,s.month));return candidates.length?candidates.map(x=>x.type).join(' / '):'なし';}
  return {makeGame,mixSeed,profile,stage,date,dateText,monthInAcademicYear,log,advance:advanceRecorded,resolve:resolveRecorded,submit:submitRecorded,canSubmit,mainFunding,applicationChance,active,effect,endingSnapshot};
})();
