/* Zero-dependency browser UI; event data and rules live outside this module. */
(() => {
  'use strict';
  const STORAGE='doctoral-life.v1';
  const root=document.getElementById('app');
  let state=null;
  let selectedAction='research';
  let dialog=false;
  let autoMode=AutoPlay.MODES.off;
  let autoTimer=null; // Never persisted; reopening a save starts paused.
  let eventDialogDismissed=false;
  let lastEventKey=null;
  let runSummary=null; // One-shot debug summary, never added to the saved game state.
  let credits=null; // Playback UI only; not part of the saved game.
  let introReopened=false; // Reopen initial snapshot without changing game state.
  let cohortResult=null; // Temporary analysis output; never stored in the game save.
  function introVisible(){return !!state && (state.introSeen===false || introReopened);}
  let creditsTimer=null;
  let creditsFrame=null;
  function clearCreditsTimer(){if(creditsTimer!==null){clearTimeout(creditsTimer);creditsTimer=null;}if(creditsFrame!==null){cancelAnimationFrame(creditsFrame);creditsFrame=null;}}
  function closeCredits(){clearCreditsTimer();credits=null;}
  function openCredits(){
    if(!state?.finished)return;
    stopAuto();dialog=false;clearCreditsTimer();
    credits={scenes:EndingRoll.build(state),index:0,playing:true,speed:1};
    render();
  }
  function seekCredits(index,playing=false){
    if(!credits)return;
    clearCreditsTimer();
    credits.index=Math.max(0,Math.min(credits.scenes.length-1,index));credits.playing=playing;
    render();
  }
  function scheduleCredits(){
    if(!credits?.playing||document.hidden)return;
    if(credits.index>=credits.scenes.length-1){credits.playing=false;return;}
    creditsTimer=setTimeout(()=>{
      creditsTimer=null;
      if(!credits||!credits.playing||document.hidden)return;
      credits.index++;
      if(credits.index>=credits.scenes.length-1)credits.playing=false;
      render();
    },EndingRoll.INTERVAL_MS/credits.speed);
  }
  function animateCredits(){
    if(!credits||!root.querySelector('.credits-back'))return;
    const duration=Math.min(950,EndingRoll.INTERVAL_MS/credits.speed*.72);
    creditsFrame=requestAnimationFrame(()=>{
      creditsFrame=null;
      root.querySelectorAll('[data-end-width]').forEach(bar=>{
        bar.style.transitionDuration=duration+'ms';
        bar.style.width=bar.dataset.endWidth+'%';
      });
      root.querySelectorAll('[data-end-number]').forEach(el=>{
        const target=Number(el.dataset.endNumber),start=Number(el.dataset.startNumber);
        if(!Number.isFinite(start)||!Number.isFinite(target)||start===target)return;
        // Tween label and progress bars together, without modifying game state.
        const begun=performance.now();
        function tick(now){
          if(!el.isConnected)return;
          const t=Math.min(1,(now-begun)/duration);
          el.textContent=EndingRoll.pretty(start+(target-start)*(1-(1-t)**3));
          if(t<1)requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    });
  }
  function eventKey(){return state?.pending ? `${state.month}:${state.pending.id}:${state.pending.title}` : null;}
  function syncEventDialog(){const key=eventKey();if(key!==lastEventKey){lastEventKey=key;eventDialogDismissed=false;}}
  function showEventDialog(){return !!state?.pending&&!cohortResult&&!dialog&&!eventDialogDismissed&&autoMode!==AutoPlay.MODES.full&&
    (autoMode!==AutoPlay.MODES.advance||!AutoPlay.canStep(state,autoMode));}

  function cancelAutoTimer(){if(autoTimer!==null){clearTimeout(autoTimer);autoTimer=null;}}
  function stopAuto(){cancelAutoTimer();autoMode=AutoPlay.MODES.off;}
  function autoTick(){
    autoTimer=null;
    if(dialog||cohortResult||introVisible()||document.hidden||!AutoPlay.canStep(state,autoMode))return;
    try {
      const result=AutoPlay.step(state,autoMode,selectedAction);
      if(result.type==='paused')return;
      if(result.type==='month'&&autoMode===AutoPlay.MODES.full)selectedAction=result.action;
      if(state.finished)stopAuto();
      save();render();
    }catch(error){stopAuto();console.error('Automatic progression stopped',error);render();}
  }
  function scheduleAuto(){
    cancelAutoTimer();
    if(!dialog&&!cohortResult&&!introVisible()&&!document.hidden&&AutoPlay.canStep(state,autoMode)){autoTimer=setTimeout(autoTick,AutoPlay.DELAY_MS);}
  }
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=n=>Math.round(n).toLocaleString('ja-JP');
  const percent=n=>Math.max(0,Math.min(100,Math.round(n)));
  const getEventSource=e=>({story:'体験談を想定した創作イベント',hypothetical:'モデル上の仮定',official_schedule:'申請時期は実制度を参考',official_schedule_hypothetical_rate:'日程は実制度、採択確率は仮定',game:'ゲーム内イベント'}[e.source]||'モデル上の仮定');
  function load(){try{const data=JSON.parse(localStorage.getItem(STORAGE)||'null');if(data&&data.version===1&&typeof data.month==='number'&&Array.isArray(data.logs)&&data.rngState&&data.field){state=data}}catch(e){console.warn('Could not load save',e)}}
  function save(){try{if(state)localStorage.setItem(STORAGE,JSON.stringify(state));else localStorage.removeItem(STORAGE)}catch(e){console.warn('Could not save',e)}}
  function frame(content){return `<div class="app-frame"><header class="topbar"><div class="brand"><div class="brand-symbol">◈</div><div><div class="brand-word">博士、何年目。</div><div class="brand-sub">DOCTORAL LIFE / A SIMULATION</div></div></div><div class="top-actions">${state?'<button class="tiny-btn" data-do="cohort-run">100回分析</button><button class="tiny-btn" data-do="intro-open">初期条件</button><button class="tiny-btn" data-do="help">ルール</button><button class="tiny-btn" data-do="export">記録を保存</button><button class="tiny-btn" data-do="new">引き直す</button>':'<span class="meta-pill">PROTOTYPE 0.1</span><button class="tiny-btn" data-do="help">遊び方</button>'}</div></header>${content}<footer class="footer"><span>博士、何年目。 / Doctoral Life — prototype</span><span>確率・大学・研究室・学位要件はすべて仮設定。実在大学の評価ではありません。</span></footer></div>${dialog?helpModal():cohortResult?cohortModal():credits?creditsModal():introVisible()?'':showEventDialog()?eventModal():''}`}
  function landing(){return frame(`<section class="hero"><div><div class="kicker">YOUR LIFE IS A CONDITIONAL PROBABILITY</div><h1>もし、<br>別の研究人生を<br><em>引いていたら。</em></h1><p>分野、大学、実家の経済力、教授、研究業績。自分では選べない初期条件を引き、論文を書き、資金を探し、博士号取得までの時間を進める。</p><div class="hero-visual"><div class="mini-tile"><span>研究分野</span><b>4 TYPES</b></div><div class="mini-tile"><span>初期条件</span><b>RANDOM</b></div><div class="mini-tile"><span>人生</span><b>1 / ∞</b></div></div><div class="disclaimer">この版はゲーム機構の検証用です。統計に基づいた実際の人物生成ではありません。イベント発生率や大学の修了要件も仮値です。</div></div><div class="entry-card"><div class="kicker">PROLOGUE — 修士課程</div><h2>最初の質問です。</h2><p>あなたはJSPS特別研究員（DC1）を、申請できる時期に知っていましたか？</p><button class="start-option" data-do="start" data-awareness="aware"><span class="circle">01</span><span><strong>知っていた。M2から準備する</strong><small>M2・4月から。DC1申請機会あり</small></span></button><button class="start-option" data-do="start" data-awareness="heard"><span class="circle">02</span><span><strong>聞いたことはあるが、よく知らなかった</strong><small>D1・4月から。DC1は未申請</small></span></button><button class="start-option" data-do="start" data-awareness="unaware"><span class="circle">03</span><span><strong>知らなかった</strong><small>D1・4月から。別の資金ルートを探す</small></span></button><div class="entry-note"><span>✦</span><span>DC1・DC2の応募時期はJSPSの制度を参考に簡略化。採択率・学生のプロフィール・研究進捗は仮モデルです。</span></div></div></section><div class="landing-bottom"><span class="feature-chip">DC1 / DC2 / RA / 博士支援</span><span class="feature-chip">研究・査読・学位要件</span><span class="feature-chip">家庭環境と研究室</span><span class="feature-chip">月単位の選択</span><span class="feature-chip">同じ人生をリプレイ</span></div>`)}
  function meter(v,className=''){return `<div class="meter"><div class="fill ${className}" style="width:${percent(v)}%"></div></div>`}
  function metric(name,value,unit,help,progress,className=''){return `<div class="metric-card"><div class="metric-label"><span>${esc(name)}</span><span>${esc(help)}</span></div><div class="metric-value">${esc(value)}<span>${esc(unit)}</span></div>${meter(progress,className)}</div>`}
  function creditsModal(){
    const {scenes,index,playing,speed}=credits;
    const event=scenes[index],isLast=index===scenes.length-1;
    if(!event)return '';
    const legacy=!event.after;
    const changed=EndingRoll.PARAMS.filter(p=>event.delta?.[p.key]!==undefined);
    const detail=event.detail?`<p class="credits-detail">${esc(event.detail)}</p>`:'';
    const notes=(event.notes||[]).slice(0,3).map(n=>`<div class="credits-note"><strong>${esc(n.title)}</strong>${n.detail?`<small>${esc(n.detail)}</small>`:''}</div>`).join('');
    const metrics=legacy?'<p class="credits-legacy">旧セーブデータにはパラメータ履歴がありません。出来事のみを再生しています。</p>':EndingRoll.PARAMS.map(p=>{
      const before=event.before?.[p.key]??event.after[p.key];
      const after=event.after[p.key];
      const diff=event.delta?.[p.key]||0;
      const start=EndingRoll.barWidth(before,p),end=EndingRoll.barWidth(after,p);
      return `<div class="credits-stat ${diff?'changed':''}"><div class="credits-stat-head"><span>${esc(p.label)}</span><span class="credits-stat-value"><b data-start-number="${before}" data-end-number="${after}">${esc(EndingRoll.pretty(before))}</b> ${esc(p.unit)}</span></div><div class="credits-bar"><div class="credits-bar-fill" style="width:${start}%" data-end-width="${end}"></div></div><span class="credits-stat-delta ${diff>0?'up':diff<0?'down':''}">${diff?esc(EndingRoll.diffLabel(diff,p.unit)):'変化なし'}</span></div>`;
    }).join('');
    const changedMarkup=changed.length?changed.map(p=>{
      const diff=event.delta[p.key];return `<span class="credits-change ${diff>0?'up':'down'}">${esc(p.label)} ${esc(EndingRoll.diffLabel(diff,p.unit))}</span>`;
    }).join(''):'<span class="credits-no-change">この場面では数値の変化なし</span>';
    return `<div class="credits-back" role="presentation"><section class="credits-screen" role="dialog" aria-modal="true" aria-label="研究人生のエンドロール">
      <div class="credits-toolbar"><div><div class="kicker">YOUR DOCTORAL LIFE</div><h2>研究人生の軌跡</h2></div><button class="tiny-btn" data-do="credits-close" aria-label="エンドロールを閉じる">閉じる ×</button></div>
      <div class="credits-track"><div class="credits-track-fill" style="width:${(index+1)/scenes.length*100}%"></div></div>
      <div class="credits-meta"><span>${index+1} / ${scenes.length} シーン</span><span>${esc(event.period||'記録')} ${isLast?' · FINAL':''}</span></div>
      <div class="credits-columns"><div class="credits-narrative" aria-live="polite"><div class="credits-eyebrow">${esc(event.kind==='month'?'MONTHLY LIFE':event.kind==='event'?'DECISION':event.kind==='submission'?'PAPER SUBMISSION':event.kind==='start'?'PROLOGUE':event.kind==='legacy_start'?'RECORD START':'LIFE EVENT')}</div><h3>${esc(event.title)}</h3>${detail}<div class="credits-changes">${changedMarkup}</div>${notes?`<div class="credits-notes">${notes}</div>`:''}${isLast?`<div class="credits-end-result"><div>THE END</div><strong>${esc(state.outcome.title)}</strong><span>${esc(state.outcome.career)}</span></div>`:''}</div>
      <div class="credits-stat-pane"><div class="section-label">PARAMETERS</div><div class="credits-stat-grid">${metrics}</div>${event.after?.funding?`<div class="credits-funding">資金支援：${esc(event.after.funding)}</div>`:''}</div></div>
      <div class="credits-controls"><div class="credits-main-controls"><button type="button" class="ghost" data-do="credits-back" ${index===0?'disabled':''}>← 前</button><button type="button" class="primary" data-do="credits-toggle">${playing?'一時停止 Ⅱ':isLast?'最初から再生 ↻':'再生 ▶'}</button><button type="button" class="ghost" data-do="credits-forward" ${isLast?'disabled':''}>次 →</button><button type="button" class="ghost" data-do="credits-last" ${isLast?'disabled':''}>結果へスキップ ↠</button></div>
      <div class="credits-speed">速度 ${EndingRoll.SPEEDS.map(v=>`<button class="credits-speed-btn ${speed===v?'active':''}" data-do="credits-speed" data-speed="${v}" aria-pressed="${speed===v}">${v}×</button>`).join('')}</div></div>
      <div class="credits-footnote">記録された状態遷移の再生です。確率モデルの予測ではありません。Escキーで閉じられます。</div>
    </section></div>`;
  }
  function eventModal(){const e=state.pending;return `<div class="modal-back event-modal-back" data-do="event-close-overlay"><section class="modal event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-dialog-heading"><div class="event-modal-header"><div class="kicker">${esc(DoctoralGame.date(state))} — DECISION</div><button type="button" class="tiny-btn" data-do="event-close" aria-label="選択肢を閉じる">閉じる ×</button></div><span class="story-badge">${esc(({funding:'資金・申請',research:'研究',lab:'研究室',life:'生活',academic:'審査'})[e.category]||'できごと')}</span><h2 id="event-dialog-heading">${esc(e.title)}</h2><p class="copy">${esc(e.description)}</p><div class="event-actions">${e.choices.map((c,i)=>`<button type="button" class="event-choice" data-do="choice" data-index="${i}"><strong>${esc(c.label)} →</strong><small>${esc(c.detail||'')}</small></button>`).join('')}</div><div class="small-note" style="margin-top:14px">根拠: ${esc(getEventSource(e))}</div></section></div>`;}
  function story(){const e=state.pending;if(e){return `<section class="panel story-card event-${e.tone||'neutral'}"><div class="current-month">${esc(DoctoralGame.date(state))} — EVENT</div><span class="story-badge">${esc(({funding:'資金・申請',research:'研究',lab:'研究室',life:'生活',academic:'審査'})[e.category]||'できごと')}</span><h2>${esc(e.title)}</h2><p class="copy">${esc(e.description)}</p><button type="button" class="primary event-open-button" data-do="event-open">選択肢を開く →</button><div class="small-note" style="margin-top:14px">根拠: ${esc(getEventSource(e))}</div></section>`}
    if(state.finished){return `<section class="panel story-card"><div class="current-month">THE END — ${esc(DoctoralGame.date(state))}</div><h2 class="result-title">${esc(state.outcome.title)}</h2><p class="copy">これが今回の研究人生の結末です。シミュレーションの結果は、統計的な予測ではなく仮モデルの帰結です。</p>${runSummary?`<div class="debug-summary"><strong>一括完走ログ</strong>　${runSummary.months}か月・${runSummary.choices}件の選択・${runSummary.submissions}本の投稿（計${runSummary.steps}遷移）</div>`:''}<div class="outcome-card"><div class="section-label">その後の進路（仮抽選）</div><h2>${esc(state.outcome.career)}</h2><div class="outcome-stats"><div><b>${fmt(state.papers)}本</b><small>査読論文</small></div><div><b>${fmt(state.outcome.months)}か月</b><small>博士課程の在籍</small></div><div><b>${fmt(state.debt)}万円</b><small>借入累計</small></div></div></div><div class="cta-row" style="margin-top:20px"><button class="primary" data-do="credits-open">人生のエンドロールを見る ▶</button><button class="ghost" data-do="replay">同じ条件で別の未来 ↺</button><button class="ghost" data-do="cohort-run">100通りの未来を分析</button><button class="ghost" data-do="new">別の人生を引く</button></div></section>`}
    const p=DoctoralGame.profile(state);const requirement=p.university.paperRequirement;
    return `<section class="panel story-card"><div class="current-month">${esc(DoctoralGame.date(state))} — YOUR CHAPTER</div><span class="story-badge">${esc(p.field.name)} / ${esc(p.university.region)}</span><h2>今月、どう過ごしますか。</h2><p class="copy">現在の研究進捗は ${Math.round(state.research)}%。査読採択された論文は ${state.papers} 本です。${state.manuscript==='reviewing'?'論文は査読中。研究を進めながら返事を待ちましょう。':state.draft>=100?'原稿が完成しています。投稿できます。':`原稿の完成度は ${Math.round(state.draft)}%。`}<br>学位取得の目安：採択論文 ${requirement} 本以上、研究進捗 ${p.university.researchRequirement}% 以上。</p><span class="story-badge">今月の選択は一つ。時間は戻せない。</span></section>`}
  function actionPanel(){const disabled=!!state.pending||state.finished;return `<section class="panel actions-panel"><div class="section-label">MONTHLY DECISION</div><h2>時間をどこに使うか</h2><p class="small-note">行動を選択し、同じ枠の「1か月進める」で確定します。</p><div class="actions-grid">${GameData.actions.map(a=>`<div class="action-item ${selectedAction===a.id?'selected':''}"><button class="action-option ${selectedAction===a.id?'active':''}" data-do="action" data-value="${a.id}" aria-pressed="${selectedAction===a.id}" ${disabled?'disabled':''}><span class="act-icon">${a.icon}</span><span class="act-copy"><strong>${esc(a.name)}</strong><small>${esc(a.detail)}</small></span></button>${selectedAction===a.id&&!disabled?'<button type="button" class="action-advance" data-do="advance">この行動で1か月進める →</button>':''}</div>`).join('')}</div><div class="cta-row"><button class="ghost" data-do="submit" ${DoctoralGame.canSubmit(state)?'':'disabled'}>論文を投稿する ✎</button></div><div class="mini-progress"><span>原稿 ${Math.round(state.draft)}% / 100%</span><span>${esc(state.manuscript==='reviewing'?'査読待ち':'執筆中')}</span></div>${meter(state.draft,'gold')}<p class="small-note">毎月の基本的な研究活動・生活費は自動計算。選択によって追加効果があります。論文投稿は完成時だけ可能です。</p></section>`}
  function autoPanel(){
    if(state.finished)return '';
    const progressPaused=autoMode===AutoPlay.MODES.advance&&!AutoPlay.canStep(state,autoMode);
    const status=autoMode===AutoPlay.MODES.off?'停止中':progressPaused?'選択待ち（手動選択後に再開）':autoMode===AutoPlay.MODES.advance?'進行中：選択時は一時停止':'進行中：選択肢も自動処理';
    return `<section class="auto-panel" role="group" aria-label="オートモード"><div class="auto-heading"><strong>オートモード</strong><span class="auto-status" role="status">${esc(status)}</span></div><div class="auto-buttons"><button data-do="auto-mode" data-mode="off" aria-pressed="${autoMode===AutoPlay.MODES.off}" class="auto-option ${autoMode===AutoPlay.MODES.off?'active':''}">手動</button><button data-do="auto-mode" data-mode="advance" aria-pressed="${autoMode===AutoPlay.MODES.advance}" class="auto-option ${autoMode===AutoPlay.MODES.advance?'active':''}">進行オート</button><button data-do="auto-mode" data-mode="full" aria-pressed="${autoMode===AutoPlay.MODES.full}" class="auto-option ${autoMode===AutoPlay.MODES.full?'active':''}">完全オート</button></div><div class="auto-debug"><button type="button" class="ghost debug-finish-button" data-do="debug-finish">一括完走（デバッグ） ↠</button><button type="button" class="ghost" data-do="cohort-run">同条件で100回ランダム実行 ↻</button><span class="small-note">今の状態から結果まで瞬時に進め、途中の選択は完全オートと同じ規則で決定します。</span></div><p class="auto-caption">進行オート：選択中の月次行動と確認のみのイベントを進め、分岐選択・論文投稿で停止。完全オート：月次行動・投稿・イベント選択まで仮ルールで実行。いつでも手動に戻せます。</p></section>`;
  }
  function persona(){const p=DoctoralGame.profile(state);return `<section class="panel person-panel"><div class="section-label">YOUR HAND</div><h2>配られた初期条件</h2><dl class="person-list"><dt>研究分野</dt><dd>${esc(p.field.name)}</dd><dt>研究テーマ</dt><dd>${esc(state.topic||p.field.methods[(state.seed>>>5)%p.field.methods.length])}</dd><dt>大学類型</dt><dd>${esc(p.university.name)}</dd><dt>地域</dt><dd>${esc(p.university.region)}</dd><dt>指導教員</dt><dd>${esc(p.advisor.name)}</dd><dt>教授の傾向</dt><dd>${esc(p.advisor.description)}</dd><dt>家庭環境</dt><dd>${esc(p.family.label)}</dd><dt>パートナー</dt><dd>${esc(p.relationship.name)}</dd><dt>進学時の業績</dt><dd>修士までの成果 ${state.initialPapers} 本相当</dd><dt>研究室予算</dt><dd>${'◆'.repeat(Math.max(1,state.labBudget+1))}${'◇'.repeat(Math.max(0,4-state.labBudget))}</dd><dt>必要な採択論文</dt><dd>${p.university.paperRequirement} 本（仮の学位要件）</dd></dl><hr class="separator"><div class="info-label">架空の大学・研究室設定</div><div class="small-note" style="margin-top:10px">人物生成の確率・分野構成比・大学ごとの要件は実統計未接続。現実の大学別格差を表すものではありません。</div></section>`}
  function finance(){const p=DoctoralGame.profile(state),f=state.lastCashFlow;return `<section class="panel"><div class="section-label">FUNDING & SURVIVAL</div><h2>研究と生活のお金</h2><div class="finance-row"><span>現在の支援</span><strong>${esc(DoctoralGame.mainFunding(state))}</strong></div><div class="finance-row"><span>家庭からの援助</span><strong>+${p.family.support}万円 / 月</strong></div><div class="finance-row"><span>生活費（目安）</span><strong>−${p.university.cost+p.relationship.expense}万円 / 月</strong></div>${f?`<div class="finance-row"><span>前月の収入 / 支出</span><strong>${fmt(f.income)} / ${fmt(f.expenses)}万円</strong></div><div class="finance-row"><span>前月収支</span><strong class="${f.balance>=0?'money-pos':'money-neg'}">${f.balance>0?'+':''}${fmt(f.balance)}万円</strong></div>`:''}<div class="finance-row"><span>累積借入</span><strong class="${state.debt>0?'money-neg':''}">${fmt(state.debt)}万円</strong></div><div class="finance-row"><span>DC申請準備度</span><strong>${state.dcPrep} pt</strong></div><p class="small-note">金額はゲーム用の仮値です。DC・RA等の実額や大学ごとの生活費を示すものではありません。</p></section>`}
  function queued(){return `<section class="panel"><div class="section-label">UPCOMING</div><h3>予定されている出来事</h3>${state.schedule.length?state.schedule.slice().sort((a,b)=>a.due-b.due).slice(0,5).map(e=>`<div class="scheduled-item"><span>${esc(({dc_result:'DC選考結果',spring_result:'博士支援の選考結果',ra_result:'RA選考結果',review:'論文査読結果'})[e.kind]||e.kind)}</span><strong>あと${Math.max(0,e.due-state.month)}か月</strong></div>`).join(''):'<div class="empty">予定されている結果待ちはありません。</div>'}<hr class="separator"><div class="small-note">予定イベントは発生時刻を予約して管理します。偶発イベントとは別のキューです。</div></section>`}
  function chronicle(){return `<section class="panel"><div class="section-label">YOUR CHRONICLE</div><h2>これまでに起きたこと</h2>${state.logs.slice(0,10).map(l=>`<div class="logline ${esc(l.type)}"><div><div class="logdate">${esc(l.period)}</div><div class="logtitle">${esc(l.title)}</div>${l.detail?`<div class="logdesc">${esc(l.detail)}</div>`:''}</div></div>`).join('')||'<div class="empty">まだ何も起きていません。</div>'}</section>`}
  function gameplay(){const p=DoctoralGame.profile(state),month=state.month,completion=Math.round(Math.max(0,Math.min(100,month/36*100)));return frame(`<section class="chapter-head"><div class="chapter-title"><div class="kicker">COHORT 2027 / ${esc(p.university.region.toUpperCase())}</div><h1>${esc(DoctoralGame.date(state))} <span class="chip">${state.finished?'完了':state.pending?'イベント発生中':'進行中'}</span></h1><div class="chapter-subtitle">${esc(p.field.name)} / ${esc(p.university.name)} / ${esc(p.advisor.name)}の指導</div></div><div class="small-note">SEED #${state.seed}<br>学位取得想定：D3末</div></section><div class="time-track"><div class="time-progress" style="width:${completion}%"></div></div>${autoPanel()}<section class="metric-grid">${metric('研究進捗',Math.round(state.research),'%',`目標 ${p.university.researchRequirement}%`,state.research,'')}${metric('査読採択論文',state.papers,'本',`必要 ${p.university.paperRequirement}本`,state.papers/p.university.paperRequirement*100,'gold')}${metric('現金残高',fmt(state.cash),'万円','生活費を確保',Math.max(0,Math.min(100,state.cash/70*100)),'')}${metric('精神的余裕',Math.round(state.morale),'%',state.morale<40?'注意が必要':'研究生活の状態',state.morale,state.morale<40?'red':'')}</section><main class="main-grid"><div class="left-stack">${story()}${state.finished?'':actionPanel()}${chronicle()}</div><aside class="aside-stack">${persona()}${finance()}${queued()}</aside></main><div class="watermark">SIMULATED LIFE — 仮モデルの確率で生成された架空の人生です</div>`)}
  function initialReport(){
    const d=InitialReport.build(state),money=d.income,reference=d.reference,range=32;
    const moneyBar=(label,value,type)=>`<div class="initial-money-row"><div class="initial-money-label"><span>${esc(label)}</span><strong>${Number(value).toFixed(1)} 万円/月</strong></div><div class="initial-track"><div class="initial-fill ${type}" style="width:${Math.max(0,Math.min(100,value/range*100))}%"></div></div></div>`;
    const observedBar=(name,pct,detail='')=>`<div class="statrow"><div class="statrow-head"><span>${esc(name)}</span><strong>${pct.toFixed(1)}%</strong></div><div class="statrow-track"><div class="statrow-fill" style="width:${pct}%"></div></div>${detail?`<small>${esc(detail)}</small>`:''}</div>`;
    const publicationBars=reference.publications.bins.map(b=>`<div class="statrow compact"><div class="statrow-head"><span>${esc(b.label)}</span><strong>${b.pct.toFixed(1)}% <small>(${b.count.toLocaleString('ja-JP')}人)</small></strong></div><div class="statrow-track"><div class="statrow-fill" style="width:${b.pct/30*100}%"></div></div></div>`).join('');
    const grantBars=reference.grants.types.map(g=>`<div class="statrow"><div class="statrow-head"><span>${esc(g.label)}　<small>平均直接経費 ${g.meanManYen.toLocaleString('ja-JP')}万円</small></span><strong>${g.accepted.toLocaleString('ja-JP')}件</strong></div><div class="statrow-track"><div class="statrow-fill" style="width:${g.accepted/reference.grants.types[0].accepted*100}%"></div></div></div>`).join('');
    const memberParts=[{key:'faculty',name:'教員',css:'faculty'},{key:'postdoc',name:'PD',css:'postdoc'},{key:'doctor',name:'博士',css:'doctor'},{key:'master',name:'修士',css:'master'},{key:'undergrad',name:'学部',css:'undergrad'},{key:'assistant',name:'補助等',css:'assistant'}];
    const labBars=reference.laboratories.kinds.map(kind=>`<div class="ref-lab-row"><div class="statrow-head"><strong>${esc(kind.label)}</strong><span>平均 ${kind.total.toFixed(1)}人</span></div><div class="ref-lab-stack" role="img" aria-label="${esc(kind.label)}の実測平均人数。${memberParts.map(p=>p.name+kind[p.key]+'人').join('、')}">${memberParts.map(part=>`<div class="ref-lab-segment ${part.css}" style="width:${kind[part.key]/kind.total*100}%" title="${esc(part.name)} ${kind[part.key]}人"></div>`).join('')}</div></div>`).join('');
    const gameRank=d.gameCohort;
    const rankCards=gameRank.metrics.map(x=>`<div class="game-rank-card" aria-label="${esc(x.label)}。ゲーム内相対スコア${x.percentile}、ランク${x.tier}。仮想集団の上位約${x.approxTop}%相当">
        <div class="game-rank-top"><span class="game-rank-name">${esc(x.label)}</span><b class="game-rank-tier tier-${x.tier}">${x.tier}</b></div>
        <div class="game-rank-value"><strong>${x.percentile}<small>/100</small></strong><span>ゲーム内相対スコア</span></div>
        <div class="game-rank-meter"><span style="width:${x.percentile}%"></span><i style="left:${x.percentile}%"></i></div>
        <div class="game-rank-comparison">仮想集団で<strong>上位約${x.approxTop}%相当</strong></div>
        <p>${esc(x.explanation)}：${x.key==='grant'?'Lv.':''}${x.value}${x.key==='grant'?'':x.unit}</p>
      </div>`).join('');
    const citation=(source)=>`<a class="initial-source-link" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">出典：${esc(source.title)}（${esc(source.location)}） ↗</a>`;
    return frame(`<div class="initial-report">
      <div class="initial-heading"><div><div class="kicker">YOUR STARTING HAND / ${esc(d.period)}</div><h1>あなたの研究人生は<br><em>ここから始まる。</em></h1><p>${esc(d.field)}・${esc(d.university)}（${esc(d.region)}） / SEED #${d.seed}</p></div>
        <div class="initial-heading-actions"><span class="initial-tag">初期条件レポート</span><button class="primary" data-do="intro-next">${state.introSeen===false?'この人生を始める →':'ゲームへ戻る →'}</button></div></div>
      <p class="initial-lead">最初に<strong>ゲーム内の仮想学生集団</strong>と比較して、配られた初期条件をランク表示します。下段には<strong>一次資料からの公表値</strong>も掲載しています。2つは異なるデータです。</p>
      <section class="game-rank-section" aria-label="ゲーム内の初期ステータスと仮想母集団における位置">
        <div class="game-rank-heading"><div><div class="kicker">YOUR STARTING STATS</div><h2>博士人生の初期パラメータ</h2></div><span class="game-rank-assumption">ゲーム内の仮想母集団</span></div>
        <p class="game-rank-subtitle">${esc(d.field)}・${esc(d.stage)}開始の仮想学生 ${gameRank.n.toLocaleString('ja-JP')} 人と比較。<strong>数字が大きいほど相対的に高い</strong>設定です。</p>
        <div class="game-rank-grid">${rankCards}</div>
        <p class="game-rank-disclaimer"><strong>※ エンタメ用のステータスです。</strong>ゲーム内部の仮の抽選ルールに基づく相対スコア（同値は中間順位）。実際の博士学生の上位割合・偏差値・実測パーセンタイルではありません。Grantは資金額ではなくゲームポイントです。</p>
      </section>
      <main class="initial-grid">
        <section class="initial-card" aria-label="開始時の収入と生活費"><div class="initial-card-heading"><div><div class="section-label">01 / MONEY</div><h2>収入と生活費</h2></div><span class="initial-source-tag assumed">自分の条件は仮設定</span></div>
          <div class="initial-big-number">${money.total}<small>万円 / 月・ゲーム内収入</small></div>
          ${moneyBar('家庭からの援助',money.family,'family')}${moneyBar(d.stage==='M2'?'修士の想定収入':'博士の短時間勤務',money.work,'work')}${moneyBar('生活費（授業料等を除く）',money.cost,'expense')}
          <p class="initial-balance ${money.balance<0?'negative':''}">月次収支の目安 <strong>${money.balance>0?'+':''}${money.balance} 万円</strong> ／ 初期現金 ${money.startingCash} 万円</p>
          <div class="initial-reference"><span class="initial-source-tag observed">実測 / JASSO 2024</span><strong>一般の博士学生・平均年間収入：${(reference.income.annualMeanYen/10000).toFixed(1)}万円</strong><small>支援の受給割合（複数回答）</small>
          ${reference.income.support.map(item=>observedBar(item.label,item.pct)).join('')}
          <small>${esc(reference.income.note)}ゲーム内の初期収入と定義が異なるため、順位判定はしていません。</small></div>
          ${citation(reference.income)}
        </section>
        <section class="initial-card" aria-label="研究実績と博士課程修了者の参考統計"><div class="initial-card-heading"><div><div class="section-label">02 / OUTPUT</div><h2>研究実績と公開統計</h2></div><span class="initial-source-tag observed">実測 / NISTEP</span></div>
          <div class="initial-big-number">${d.papers.value}<small>本相当・あなたの初期ゲーム指標</small></div>
          <p class="initial-card-note">${esc(d.papers.description)}</p>
          <div class="initial-reference"><strong>博士課程修了者の論文発表本数（2012年度修了者）</strong><small>n=4,353、無回答も含む。ここは上のゲーム指標とは別の母集団・定義です。</small><div class="initial-statlist">${publicationBars}</div><small>${esc(reference.publications.note)}</small></div>
          ${citation(reference.publications)}
        </section>
        <section class="initial-card" aria-label="研究費に関する科研費統計"><div class="initial-card-heading"><div><div class="section-label">03 / GRANT</div><h2>研究資金と科研費</h2></div><span class="initial-source-tag observed">実測 / JSPS 2025</span></div>
          <div class="initial-big-number">${d.grant.budgetLevel}<small> / 4・研究室予算ゲームポイント</small></div>
          <p class="initial-card-note">${esc(d.grant.description)} 研究室の実際の科研費配分額へ換算できません。</p>
          <div class="initial-reference"><strong>2025年度の新規採択課題数（研究種目別）</strong><small>棒の長さは採択件数。金額は1課題当たり直接経費の平均。</small><div class="initial-statlist">${grantBars}</div><small>${esc(reference.grants.note)}</small></div>
          ${citation(reference.grants)}
        </section>
        <section class="initial-card" aria-label="研究室の人員構成と実測平均"><div class="initial-card-heading"><div><div class="section-label">04 / LAB SIZE</div><h2>研究室の人数構成</h2></div><span class="initial-source-tag observed">実測 / NISTEP 2018</span></div>
          <div class="initial-big-number">${d.lab.total}<small>人・ゲーム内の仮想所属人数</small></div>
          <p class="initial-card-note">修士 ${d.lab.master}人、博士 ${d.lab.doctor}人、教員 ${d.lab.faculty}人。${esc(d.lab.description)}</p>
          <div class="initial-reference"><strong>所属研究グループの平均人数（大学種別）</strong>${labBars}<div class="ref-lab-key">${memberParts.map(part=>`<span><i class="ref-key ${part.css}"></i>${esc(part.name)}</span>`).join('')}</div><small>${esc(reference.laboratories.note)}</small></div>
          ${citation(reference.laboratories)}
        </section>
      </main>
      <div class="initial-bottom"><p><strong>統計の読み方：</strong>上段のランクはゲーム内の仮想母集団だけで計算。下段の参考グラフは公開調査の値ですが、研究実績は修了者、研究室人数は選定研究者の回答です。実在の博士学生集団における順位は計算していません。</p><div class="cta-row"><button class="ghost" data-do="cohort-run">同条件で100回分析</button><button class="primary" data-do="intro-next">${state.introSeen===false?'研究生活を始める →':'ゲームへ戻る →'}</button></div></div>
    </div>`);
  }
  function randomEpisodeSeed(){
    const entropy=new Uint32Array(1);
    if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(entropy);
    else entropy[0]=(Date.now()^Math.floor(Math.random()*4294967295))>>>0;
    return entropy[0]||123456789;
  }
  function cohortModal(){
    const r=cohortResult,n=r.sampleSize;
    const rate=v=>(100*v/n).toFixed(0)+'%';
    const bar=(label,value,total,detail='')=>`<div class="cohort-row"><div class="cohort-row-head"><span>${esc(label)}</span><strong>${value} / ${total} <small>(${(100*value/total).toFixed(0)}%)</small></strong></div><div class="cohort-bar"><div style="width:${percent(value/total*100)}%"></div></div>${detail?`<small>${esc(detail)}</small>`:''}</div>`;
    const cards=[
      {label:'博士号取得（計）',value:rate(r.graduated),note:`${r.graduated} / ${n}回`},
      {label:'標準年限内に取得',value:rate(r.outcomes.standard),note:`${r.outcomes.standard} / ${n}回`},
      {label:'平均採択論文',value:r.averagePapers.toFixed(2)+'本',note:`中央値 ${r.medianPapers}本`},
      {label:'借入累計の中央値',value:fmt(r.medianDebt)+'万円',note:'ゲーム内の仮の金額'}
    ];
    const dc=['DC1','DC2'].map(type=>{
      const a=r.dc[type];return a.applied?bar(type+' 採用',a.accepted,a.applied,`申請した${a.applied}試行のうち採用${a.accepted}試行`):`<p class="small-note">${type}：この100回では申請なし</p>`;
    }).join('');
    return `<div class="cohort-back"><section class="cohort-screen" role="dialog" aria-modal="true" aria-label="100回ランダム実行の分析結果">
      <div class="cohort-toolbar"><div><div class="kicker">100 ALTERNATE LIVES</div><h2>同じ条件から、100通りの未来</h2><p>人物設定は固定し、人生の偶然だけを再抽選。行動は完全オートの共通ルールで決定しています。</p></div><button class="tiny-btn" data-do="cohort-close">閉じる ×</button></div>
      <div class="cohort-summary">${cards.map(c=>`<div class="cohort-metric"><small>${esc(c.label)}</small><strong>${esc(c.value)}</strong><span>${esc(c.note)}</span></div>`).join('')}</div>
      <div class="cohort-grid"><section class="cohort-section"><h3>最終結果の分布</h3>${bar('標準年限内に学位取得',r.outcomes.standard,n)}${bar('延長して学位取得',r.outcomes.extended,n)}${bar('学位未取得',r.outcomes.withoutDegree,n)}<p class="small-note">すべての試行が終了するまで完全オートで進行しました。</p></section>
      <section class="cohort-section"><h3>査読採択論文数</h3>${r.papers.map((v,i)=>bar(Multiverse.PAPER_BINS[i],v,n)).join('')}<p class="small-note">ゲーム内の採択論文数。実際の修了者統計とは別です。</p></section>
      <section class="cohort-section"><h3>DC採用（申請試行ベース）</h3>${dc}<p class="small-note">分母は申請した試行数です。採用率はJSPS公表値ではありません。</p></section>
      <section class="cohort-section"><h3>博士課程の終了時期</h3>${bar('D3末・36か月',r.duration[36],n)}${bar('延長後・48か月',r.duration[48],n)}<p class="small-note">修了と学位未取得の両方を含みます。</p></section></div>
      <div class="cohort-disclaimer"><strong>これはゲーム内シミュレーションです。</strong>実在する博士学生の修了率・採用率・論文分布ではありません。100回という有限回の抽選結果なので、再実行すると割合が変わります。進行中のセーブデータは一切変更しません。</div>
      <div class="cohort-actions"><span class="small-note">初期条件シード ${r.profileSeed} / 試行シード ${r.batchSeed}</span><button class="primary" data-do="cohort-run">別の100通りを再抽選 ↻</button><button class="ghost" data-do="cohort-close">ゲームに戻る</button></div>
    </section></div>`;
  }
  function helpModal(){return `<div class="modal-back" data-do="close-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="ゲームの仕組み"><div class="top-actions"><button class="tiny-btn" data-do="close">閉じる ×</button></div><div class="kicker">ABOUT THE MODEL</div><h2>遊び方とデータの扱い</h2><p>最初にDCの認知を選ぶと、大学・研究分野・教授・家庭環境がランダムに決まります。月ごとに活動を選択し、研究・生活費・論文・奨学金の状態を更新します。</p><ul><li><strong>固定日程</strong>：DC1はM2春、DC2はD1/D2春を想定した申請イベントを配置。</li><li><strong>予約イベント</strong>：DC選考・RA選考・査読結果は申請や投稿後に予約。</li><li><strong>条件付きイベント</strong>：分野・教授の性質・研究進捗・精神状態に合うイベントだけ抽選。</li><li><strong>学位審査</strong>：D3末に仮の論文数・進捗目標を判定。未達なら延長を選択可能。</li><li><strong>同じ初期条件</strong>：「同じ条件で別の未来」は人物設定だけを固定し、イベントを再抽選します。100回分析は仮モデルの試行結果で、セーブを変更しません。</li><li><strong>オートモード</strong>：進行オートは現在の月次行動と確認のみのイベントを自動で進め、分岐選択と論文投稿で停止します。完全オートは月次行動・投稿・イベント選択を簡単な仮ルールで自動化します。ブラウザを閉じたり再読み込みすると手動へ戻ります。</li></ul><div class="notification"><strong>重要：</strong>このプロトタイプは<strong>実データで較正されていません。</strong>採択率・イベント発生率・家庭所得・博士の取得率・進路・学位要件などは例示値です。再現性のあるゲームエンジンの動作確認用です。</div><h3 style="margin-top:20px">制度上の参考元</h3>${Object.values(GameData.evidence).map(x=>`<div class="source-line"><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.label)} ↗</a><div class="small-note">${x.tier==='candidate_dataset'?'未接続の将来の統計ソース':'制度・日程の参照元'}</div></div>`).join('')}<div class="top-actions" style="margin-top:14px"><button class="primary" data-do="close">ゲームへ戻る</button></div></section></div>`}
  function render(){
    syncEventDialog();root.innerHTML=state?(introVisible()?initialReport():gameplay()):landing();
    if(credits){animateCredits();scheduleCredits();}else scheduleAuto();
  }
  function start(awareness){closeCredits();stopAuto();cohortResult=null;runSummary=null;introReopened=false;state=DoctoralGame.makeGame(awareness);state.introSeen=false;selectedAction='research';save();render();window.scrollTo(0,0);}
  function download(){if(!state)return;const blob=new Blob([JSON.stringify({note:'Doctoral Life prototype / all scenario probabilities are hypothetical',exported:new Date().toISOString(),state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`doctoral-life-${state.seed}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
  root.addEventListener('click',e=>{const button=e.target.closest('[data-do]');if(!button)return;const what=button.dataset.do;
    if(what==='start'){start(button.dataset.awareness);return}
    if(what==='help'){if(credits)closeCredits();dialog=true;render();return}
    if(what==='intro-open'&&state){closeCredits();stopAuto();introReopened=true;render();return}
    if(what==='intro-next'&&state){introReopened=false;state.introSeen=true;save();render();window.scrollTo(0,0);return}
    if(what==='close'||what==='close-overlay'){if(what==='close-overlay'&&e.target!==button)return;dialog=false;render();return}
    if(what==='export'){download();return}
    if(what==='new'){if(state&&!window.confirm('現在の進行状況を破棄して新しい人生を引きますか？（必要なら先に記録を保存）'))return;closeCredits();stopAuto();cohortResult=null;runSummary=null;introReopened=false;state=null;save();render();return}
    if(what==='replay'){if(!state)return;closeCredits();stopAuto();cohortResult=null;runSummary=null;introReopened=false;state=DoctoralGame.makeGame(state.awareness,state.seed,randomEpisodeSeed());state.introSeen=false;selectedAction='research';save();render();window.scrollTo(0,0);return}
    if(!state)return;
    if(what==='cohort-run'){stopAuto();closeCredits();dialog=false;
      try{cohortResult=Multiverse.run(state,randomEpisodeSeed());render();}
      catch(error){console.error('100-trial simulation failed',error);window.alert('100回分析を実行できませんでした。');}
      return;
    }
    if(what==='cohort-close'){cohortResult=null;render();return;}
    if(cohortResult)return;
    if(introVisible())return;
    if(what==='credits-open'){openCredits();return}
    if(what==='credits-close'){closeCredits();render();return}
    if(credits){
      if(what==='credits-toggle'){
        if(credits.index===credits.scenes.length-1){seekCredits(0,true)}
        else{credits.playing=!credits.playing;clearCreditsTimer();render()}
        return;
      }
      if(what==='credits-speed'){const next=Number(button.dataset.speed);if(EndingRoll.SPEEDS.includes(next)){credits.speed=next;clearCreditsTimer();render()}return}
      if(what==='credits-back'){seekCredits(credits.index-1);return}
      if(what==='credits-forward'){seekCredits(credits.index+1);return}
      if(what==='credits-last'){seekCredits(credits.scenes.length-1);return}
      return;
    }
    if(what==='event-open'){eventDialogDismissed=false;render();return}
    if(what==='event-close'||what==='event-close-overlay'){
      if(what==='event-close-overlay'&&e.target!==button)return;
      eventDialogDismissed=true;render();return;
    }
    if(what==='debug-finish'){
      if(state.finished)return;
      if(!window.confirm('現在のセーブデータを一括完走し、すべての選択を自動で決定します。途中には戻せません。実行しますか？'))return;
      stopAuto();dialog=false;runSummary=null;
      try {
        const summary=AutoPlay.runToEnd(state);
        runSummary=summary;
        save();render();window.scrollTo(0,0);
        if(!summary.finished)window.alert(`一括完走を停止しました（${summary.reason}）。進行 ${summary.steps} ステップ。`);
      }catch(error){save();render();console.error('Debug fast-forward failed',error);window.alert('一括完走でエラーが発生しました。記録を確認してください。');}
      return;
    }
    if(what==='auto-mode'){if(!Object.values(AutoPlay.MODES).includes(button.dataset.mode))return;cancelAutoTimer();autoMode=button.dataset.mode;render();return}
    if(what==='action'){selectedAction=button.dataset.value;render();return}
    if(what==='advance'){DoctoralGame.advance(state,selectedAction);save();render();return}
    if(what==='choice'){DoctoralGame.resolve(state,Number(button.dataset.index));save();render();return}
    if(what==='submit'){DoctoralGame.submit(state);save();render();return}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(dialog){dialog=false;render()}else if(cohortResult){cohortResult=null;render()}else if(credits){closeCredits();render()}else if(showEventDialog()){eventDialogDismissed=true;render()}}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAutoTimer();if(credits){clearCreditsTimer();credits.playing=false;}}else{if(credits)render();else scheduleAuto();}});
  load();render();
})();
