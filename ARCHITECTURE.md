# 設計メモ — 後からアイデアを受け入れる「ガワ」

## 1. モデルの分離

- **InitialConditions**: 人物属性・大学・専攻・研究室・教授。`src/data.js`。分布を後から国の統計に置換する。
- **GameState**: 毎月変化する状態。`src/engine.js` の `makeGame`。研究進捗・現金・借入・気力・執筆・奨学金。
- **EventCatalog**: 条件付きの物語イベント。`src/events.js`。出典・条件・抽選確率・選択肢・状態差分。
- **EventScheduler**: 申請結果・論文査読の遅延発生を担う予約キュー。`schedule: [{kind,due,...}]`。
- **RuleSystem**: DC1/DC2の応募可能年次、資金の併給、学位要件などのルール。現状は `src/engine.js`、データ化していく。
- **Presentation**: `src/ui.js` は状態を描画し、プレイヤーの決定を受け渡すだけ。抽選を担当しない。

## 2. 時間

`month=-12` は M2の4月、`month=0` は D1の4月、`month=12` は D2の4月。基準年は仮想コホート2027年。`month=36` の進級時に学位取得条件を判定し、未達なら延長選択。`month=48` で一旦終了。

UIは月単位、すべてのイベントは状態の更新後に判定。周期・固定日程イベントは月のインデックスで管理する。バージョンアップ時には「アクションがイベント前か後か」を明文化する必要がある。

## 3. イベントタイプ

1. **Schedule**: イベント発生予定が先に決まる（DC申請、年度末審査）。
2. **Deferred**: 申請・投稿後に発生日時をキューに登録（DC採否、論文査読、RA採否）。
3. **Conditional Random**: `conditions` に合致する場合だけ確率抽選（実験失敗、教員の忙しさ、私生活）。
4. **Threshold**: 状態・業績の閾値に達すると可能になる（論文投稿、学位審査）。

`events.js` の `source` に統計・仮定・体験談などを付与し、事実性のレベルを今後さらに細分化する。

## 4. データ調達・較正の境界

確率に必要な情報を3層に区別する。

- **OfficialMarginal**: 公的調査の集計値（博士進学数、分野別修了者、修了後の職種など）。母集団・年度・単位・統計表番号を必須にする。
- **InferredTransition**: 公的マージナルデータ、追跡調査、仮定から推計した状態遷移（属性別の卒業・進路など）。不確実性を付ける。
- **NarrativeHypothesis**: インタビュー・体験談ベースのストーリー。発生頻度を直接正当化できないことを明示する。

参考のデータファイルの将来スキーマ例：

```json
{
  "id": "jsps_dc1_2026",
  "scope": {"year": 2026, "category": "DC1", "discipline": "all"},
  "metric": "adoption_rate_among_applicants",
  "nominator": null,
  "denominator": null,
  "value": null,
  "evidenceTier": "official",
  "sourceURL": "https://www.jsps.go.jp/j-pd/pd_sin.html",
  "checkedAt": null
}
```

`null` は意図的です。未調達の統計値を推測で埋めないこと。

## 5. イベント追加時の簡易チェック

- イベント発生が特定の学年・分野に限定されていないか。
- 抽選確率は実統計、推計、仮定のどれか。
- 同じイベントが連続発生しないよう `cooldown` を設定したか。
- 「レビューが戻る」などの予定された結果を単純乱数イベントにしていないか。
- 状態変化が可逆性・時間・資金制約と整合するか。
- 学位要件や進路にバイアスを持ち込んでいないか。
- 100〜10,000件のシミュレーションを実行して異常状態が出ないか。

## 6. 今後の分割候補

`src/engine.js` が巨大化する前に、`funding.js`, `academic.js`, `person.js`, `eventScheduler.js`, `simulation.js` に分割する。既存の `GameState` JSON形式と `kind` ハンドラを互換性の軸にする。統計較正は独立したPython/Parquetパイプラインで管理し、フロントエンドにはバージョン固定の正規化JSONを配信する。
