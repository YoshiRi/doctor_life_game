/* Event templates: conditions and effects are data, not UI code. All rates are illustrative. */
const GameEvents = (() => {
  const random = [
    {
      id:'reproducibility', category:'research', title:'実験結果が再現できない', tone:'negative',
      description:'何度試しても前回の結果と一致しない。実験ノートと条件を洗い直す必要がある。',
      source:'story', chance:.085, cooldown:7, conditions:{fields:['bio','materials'],minResearch:18,minMonth:1},
      choices:[
        {label:'手順を見直してやり直す', detail:'進捗 −7 / 原稿 −5 / 気力 +2', effects:{research:-7,draft:-5,morale:2}},
        {label:'別の測定手法を探す', detail:'進捗 −3 / 貯蓄 −3万円', effects:{research:-3,cash:-3,morale:-1}}
      ]
    },
    {
      id:'compute', category:'research',title:'計算資源が足りない',tone:'negative',
      description:'実験を回すGPUが埋まっている。締切が近づく一方で、学習が終わらない。',
      source:'story',chance:.09,cooldown:7,conditions:{fields:['cs'],minMonth:0},
      choices:[
        {label:'小さい実験に切り替える',detail:'原稿 +5 / 研究 −3',effects:{draft:5,research:-3}},
        {label:'共同研究先に相談する',detail:'気力 −3 / 研究 +3',effects:{morale:-3,research:3}}
      ]
    },
    {
      id:'archive',category:'research',title:'重要な資料が見つかった',tone:'positive',
      description:'読み落としていた資料から、新しい解釈につながる手掛かりが得られた。',
      source:'story',chance:.1,cooldown:6,conditions:{fields:['humanities'],minMonth:0},
      choices:[
        {label:'論点を深く掘り下げる',detail:'研究 +9 / 気力 −3',effects:{research:9,morale:-3}},
        {label:'執筆に反映する',detail:'原稿 +11',effects:{draft:11}}
      ]
    },
    {
      id:'advisor_absent',category:'lab',title:'指導教員が多忙になった',tone:'negative',
      description:'学会出張と審査が重なり、面談が1か月先に延びた。',
      source:'story',chance:.09,cooldown:8,conditions:{advisors:['hands_off'],minMonth:0},
      choices:[
        {label:'先輩に相談する',detail:'研究 +4 / 気力 +3',effects:{research:4,morale:3}},
        {label:'一人で進める',detail:'研究 +6 / 気力 −5',effects:{research:6,morale:-5}}
      ]
    },
    {
      id:'advisor_revision',category:'lab',title:'教授から大幅修正が返ってきた',tone:'negative',
      description:'原稿のストーリーを根本から作り直すよう求められた。',
      source:'story',chance:.095,cooldown:7,conditions:{advisors:['demanding'],minDraft:24,minMonth:0},
      choices:[
        {label:'構成から書き直す',detail:'原稿 −9 / 研究 +6',effects:{draft:-9,research:6}},
        {label:'意図を詳しく確認する',detail:'原稿 −3 / 気力 +3',effects:{draft:-3,morale:3}}
      ]
    },
    {
      id:'lab_funding',category:'funding',title:'研究室が新しい研究費を獲得',tone:'positive',
      description:'新規プロジェクトが採択された。必要な設備やRA枠が増えるかもしれない。',
      source:'story',chance:.04,cooldown:12,conditions:{minMonth:0},
      choices:[
        {label:'研究設備の拡充を頼む',detail:'研究 +8 / 研究室予算 +1',effects:{research:8,labBudget:1}},
        {label:'RA枠について相談する',detail:'RA応募力 +2 / 研究室予算 +1',effects:{raPrep:2,labBudget:1}}
      ]
    },
    {
      id:'conference',category:'research',title:'学会で共同研究の話が持ち上がる',tone:'positive',
      description:'ポスター発表で他大学の研究者から声をかけられた。',
      source:'story',chance:.07,cooldown:9,conditions:{minResearch:24,minMonth:1},
      choices:[
        {label:'共同研究を進める',detail:'研究 +6 / 原稿 +5',effects:{research:6,draft:5}},
        {label:'自分のテーマに集中する',detail:'研究 +9 / 気力 −2',effects:{research:9,morale:-2}}
      ]
    },
    {
      id:'relationship',category:'life',title:'研究と私生活のすれ違い',tone:'neutral',
      description:'最近、研究のことばかり考えていて、パートナーと過ごす時間が少なくなっている。',
      source:'story',chance:.085,cooldown:8,conditions:{relationships:['dating','married'],minMonth:0},
      choices:[
        {label:'今月は時間をつくる',detail:'気力 +8 / 研究 −4',effects:{morale:8,research:-4}},
        {label:'今は研究を優先する',detail:'研究 +6 / 気力 −8',effects:{research:6,morale:-8}}
      ]
    },
    {
      id:'burnout',category:'life',title:'疲れが蓄積している',tone:'negative',
      description:'朝から研究室に向かっても集中が続かない。予定を見直す時期かもしれない。',
      source:'story',chance:.18,cooldown:5,conditions:{maxMorale:39,minMonth:0},
      choices:[
        {label:'数日休む',detail:'気力 +16 / 研究 −5',effects:{morale:16,research:-5}},
        {label:'研究時間を維持する',detail:'研究 +3 / 気力 −8',effects:{research:3,morale:-8}}
      ]
    },
    {
      id:'peer',category:'lab',title:'先輩から研究のコツを教わった',tone:'positive',
      description:'詰まっていた問題について、研究室の先輩が以前の失敗例を共有してくれた。',
      source:'story',chance:.085,cooldown:8,conditions:{minMonth:0},
      choices:[
        {label:'手法を取り入れる',detail:'研究 +8',effects:{research:8}},
        {label:'一緒に原稿を確認する',detail:'原稿 +9',effects:{draft:9}}
      ]
    },
    {
      id:'family_crisis',category:'life',title:'家庭の事情で予定が変わる',tone:'negative',
      description:'家族から連絡が入った。少し時間とお金を確保する必要がありそうだ。',
      source:'story',chance:.024,cooldown:18,conditions:{minMonth:0},
      choices:[
        {label:'帰省して対応する',detail:'現金 −5万円 / 研究 −5 / 気力 +2',effects:{cash:-5,research:-5,morale:2}},
        {label:'オンラインで対応する',detail:'気力 −8 / 研究 −2',effects:{morale:-8,research:-2}}
      ]
    }
  ];
  return {random};
})();
