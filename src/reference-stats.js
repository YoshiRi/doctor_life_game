/* Published reference observations, NOT simulation parameter distributions.
 * Update numbers only after verifying the source table; see docs/REFERENCE_DATA.md.
 * Percentages are published percentages, not inferred from a hypothetical cohort. */
const ReferenceStats = (() => {
  const income = Object.freeze({
    year: 2024, title: 'JASSO 令和6年度学生生活調査・大学院各課程（試行）',
    population: '大学院博士課程・一般の学生（社会人学生、休学者、外国人留学生等を除く）',
    annualMeanYen: 2665100,
    support: Object.freeze([
      {label:'JSPS・JST等の生活費支援',pct:43.2},
      {label:'親・親戚からの支援',pct:32.8},
      {label:'JASSO第一種奨学金（貸与）',pct:18.2}
    ]),
    url:'https://www.jasso.go.jp/statistics/gakusei_chosa/__icsFiles/afieldfile/2026/03/24/daiin24_all_1.pdf',
    location:'集計表4′-3（博士課程・一般の学生）、p.35／学生の収入状況',
    note:'複数回答の受給率です。項目は重複し、合計100%にはなりません。平均収入には貸与型奨学金などが含まれます。'
  });
  const publications = Object.freeze({
    year: 2012, surveyed: 2014, title:'NISTEP 第1回日本博士人材追跡調査（速報版）',
    population:'2012年度博士課程修了者の調査回答者（n=4,353）。修了後の研究活動に関する質問',
    bins:Object.freeze([
      {label:'0本',count:229,pct:5.3}, {label:'1本',count:507,pct:11.6},
      {label:'2本',count:654,pct:15.0}, {label:'3～5本',count:1234,pct:28.3},
      {label:'6～9本',count:416,pct:9.6}, {label:'10～20本',count:191,pct:4.4},
      {label:'21本以上',count:20,pct:0.5}, {label:'無回答',count:1102,pct:25.3}
    ]),
    url:'https://www.nistep.go.jp/wp/wp-content/uploads/NISTEP_sokuhou1.pdf',
    location:'図表44「論文発表本数」、p.24',
    note:'2012年度修了者への調査であり、M2・D1入学時の実績分布でも筆頭著者査読論文数でもありません。無回答を含めて表示。'
  });
  const grants = Object.freeze({
    year:2025, title:'JSPS 令和7年度 科研費・新規採択分',
    population:'2025年度新規採択課題。研究種目別の採択課題数と1課題当たり直接経費平均',
    types:Object.freeze([
      {label:'基盤(C)',accepted:12756,applied:46497,meanManYen:127.5},
      {label:'若手研究',accepted:5585,applied:13883,meanManYen:141.9},
      {label:'基盤(B)',accepted:3290,applied:12312,meanManYen:519.3},
      {label:'基盤(A)',accepted:643,applied:2468,meanManYen:1209.8},
      {label:'基盤(S)',accepted:69,applied:568,meanManYen:4354.2}
    ]),
    url:'https://www.jsps.go.jp/file/storage/kaken_award_2025/0-1_r7.pdf',
    location:'資料1-1-1から抜粋した表2、p.6／資料1-1-1、p.14',
    note:'採択課題数は研究室数ではありません。平均配分額は2025年度新規採択分の直接経費（その年度の配分）、研究期間全体の予算・研究室の年間資金ではありません。'
  });
  const laboratories = Object.freeze({
    year:2018, title:'NISTEP定点調査2018・深掘調査',
    population:'部局長推薦の一線級研究者の所属研究室・研究グループ。全国全研究室の無作為標本ではありません',
    kinds:Object.freeze([
      {label:'国立大学等',total:16.0,faculty:2.9,postdoc:0.7,doctor:2.4,master:4.9,undergrad:3.5,assistant:1.5},
      {label:'公立大学',total:15.1,faculty:2.9,postdoc:0.5,doctor:1.1,master:3.4,undergrad:5.6,assistant:1.6},
      {label:'私立大学',total:20.0,faculty:2.7,postdoc:0.2,doctor:1.0,master:3.0,undergrad:12.3,assistant:0.7}
    ]),
    url:'https://www.mext.go.jp/content/1419124_008.pdf',
    location:'「研究室・研究グループの平均的な人員構成」、スライド17（PDF 17ページ目）',
    note:'研究グループ単位の大学種別平均で、個別研究室人数の確率分布ではありません。表示の端数は四捨五入により合計と一致しない場合があります。'
  });
  const dropout=Object.freeze({
    year:2024,title:'文部科学省「令和6年度 学生の中途退学者・休学者数の調査結果」',
    population:'博士課程の2024年4月1日時点在籍者に対する、2024年度中の中途退学者（満期退学者を含まない）',
    annualPct:3.40,students:2565,
    url:'https://www.mext.go.jp/content/20250822-mxt_gakushi01-000013028_2.pdf',
    note:'年間の在籍者に対する中退割合。入学から修了までの累積中退率ではない。中途退学理由の割合は博士課程限定ではない。'
  });
  return Object.freeze({income,publications,grants,laboratories,dropout});
})();
