/* World parameters are illustrative, NOT measured probabilities. */
const GameData = (() => {
  const evidence = {
    jsps: { label: 'JSPS 2027年度 特別研究員募集要項', url: 'https://www.jsps.go.jp/j-pd/pd_sin.html', tier: 'public_rule' },
    jspsElig: { label: 'JSPS 申請資格・支給経費・採用期間', url: 'https://www.jsps.go.jp/j-pd/pd_oubo.html', tier: 'public_rule' },
    estat: { label: '学校基本調査 2025年度', url: 'https://www.e-stat.go.jp/stat-search/files?layout=dataset&tclass1=000001236922&tclass2=000001236923&tclass3=000001236931&toukei=00400001&tstat=000001011528', tier: 'candidate_dataset' }
  };
  const fields = [
    { id:'cs', name:'情報・AI', subtitle:'計算と締切の世界', methods:['機械学習','ロボティクス','分散システム'], baseline:5, variance:2 },
    { id:'bio', name:'生命科学', subtitle:'長い実験と再現性', methods:['分子生物学','細胞生物学','神経科学'], baseline:4, variance:3 },
    { id:'materials', name:'物理・材料', subtitle:'試料と測定装置', methods:['材料科学','半導体物理','物性物理'], baseline:4, variance:3 },
    { id:'humanities', name:'人文・社会', subtitle:'資料と調査の積み重ね', methods:['歴史学','文化人類学','社会学'], baseline:4, variance:2 }
  ];
  const universities = [
    { id:'metro', name:'首都圏・大規模大学', region:'関東', tuition:5, cost:17, lab:2, paperRequirement:2, researchRequirement:78, spring:true, weight:3 },
    { id:'regional', name:'地方国立大学', region:'東北・北陸', tuition:4, cost:13, lab:1, paperRequirement:1, researchRequirement:72, spring:true, weight:4 },
    { id:'urban', name:'都市部の大学', region:'関西', tuition:5, cost:16, lab:2, paperRequirement:2, researchRequirement:76, spring:true, weight:3 },
    { id:'private', name:'私立大学', region:'中部・西日本', tuition:6, cost:15, lab:1, paperRequirement:1, researchRequirement:75, spring:false, weight:2 }
  ];
  const advisors = [
    { id:'supportive', name:'伴走型', description:'毎週相談できるが、自分で決める余地もある', research:1.12, writing:1.12, stress:0, raBias:1.1 },
    { id:'hands_off', name:'放任型', description:'裁量は大きい。困ったときに相談が難しい', research:0.98, writing:0.9, stress:1, raBias:0.9 },
    { id:'demanding', name:'高要求型', description:'フィードバックは鋭いが、負担も増えがち', research:1.15, writing:1.1, stress:2, raBias:1 }
  ];
  const family = [
    { id:'tight', name:'援助なし', support:0, label:'家計への援助は期待できない' },
    { id:'some', name:'一部援助あり', support:5, label:'月5万円ほどの援助' },
    { id:'comfortable', name:'余裕あり', support:11, label:'月11万円ほどの援助' }
  ];
  const relationships = [
    { id:'single', name:'独身・パートナーなし', expense:0 },
    { id:'dating', name:'交際中', expense:1 },
    { id:'married', name:'既婚・同居', expense:2 }
  ];
  const actions = [
    {id:'research', name:'研究を進める', icon:'◈', detail:'研究進捗 + / 原稿は少し進む'},
    {id:'write', name:'論文を書く', icon:'✎', detail:'原稿進捗 ++ / 研究進捗は控えめ'},
    {id:'funding', name:'申請・資金探し', icon:'¥', detail:'DC申請準備 + / RAへの接点が増える'},
    {id:'work', name:'アルバイト・TA', icon:'▣', detail:'現金 + / 研究に使う時間が減る'},
    {id:'talk', name:'教授と相談', icon:'◇', detail:'テーマを整理 / 教授との相性で効果が変わる'},
    {id:'rest', name:'生活を立て直す', icon:'☼', detail:'精神的余裕 + / パートナーとの関係に配慮'}
  ];
  const hypotheticalProbabilities = {
    dc1Base: .115, dc2Base: .12, springBase:.37, raBase:.38,
    paperAcceptedBase:.35, paperRevisionBase:.43
  };
  return {evidence, fields,universities,advisors,family,relationships,actions,hypotheticalProbabilities};
})();
