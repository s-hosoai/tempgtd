# GTD Task Tool — プロジェクト仕様

## 概要

GTD（Getting Things Done）メソドロジーに基づいたタスク管理ツール．
・GTDに基づいてタスクや思い付いたものは一旦すべてInboxへ
・トリアージフェーズでタスクの選り分け
・定期的なイベントやタスクセットをテンプレートとして再利用可能にする．
・テンプレートは手動またはスケジュールされたタイミングでInboxかTodoに追加する．（例えば新規社員手続きといった手動でトリガーするタスクセットや，月締め処理といった定期的なタスクセット）
・日，週，月毎にタスクの棚卸やレビューをするフェーズを設ける．
・毎日の初めに一日のスケジュールを組む．一日の空き時間に30分単位で割り振れるようなGoogle CalendarのようなUIとする．
---

## 技術スタック（未定・検討中）

- **言語**: TypeScript
- **データストア**: SQLite
- **UI**: Next.js
- **同期**: クラウド同期

---

## GTDワークフロー

```
[収集] → [トリアージ] → [整理] → [見直し] → [実行]
Capture   Triage      Organize  Reflect   Engage
```

### フェーズの実装方針

| フェーズ | UI操作 | 説明 |
|---|---|---|
| Capture | Inboxへ素早く入力 | とにかく全部突っ込む。考えない |
| Triage | Inboxをスワイプ／ボタンで振り分け | アクション可能か？2分でできるか？ |
| Organize | Next / Project / Waiting / Someday へ移動 | コンテキスト・期限・エネルギーを付与 |
| Reflect | 日次・週次・月次レビュー画面 | 棚卸し・優先度見直し |
| Engage | 今日のスケジュール画面 | 30分単位でカレンダーに割り当て |

---

## データモデル

### ID設計

- UnixTime（ミリ秒）を整数値としてIDに使用
- 同一ミリ秒での衝突時は 1ms ずつずらして採番

### Task

```
id           : number            # UnixTime(ms)、衝突時+1ms
title        : string            # タスクのタイトル（動詞始まり）
status       : TaskStatus
parent_id    : number | null     # 親タスクID（nullなら最上位）。階層は無制限
project_id   : number | null     # プロジェクトとの紐付け
template_id  : number | null     # 生成元テンプレート
next_order   : number | null     # status=next のときのソート順（昇順）。2分ルール対象は先頭
context      : string[]          # @home, @pc, @phone など（コンテキスト）
tags         : string[]          # 自由タグ（コンテキストとは独立）
due          : date | null       # 期限
scheduled_at : datetime | null   # status=scheduled: このdatetimeにnextへ自動昇格
today_start  : datetime | null   # 今日のスケジュール開始時刻（30分単位）
duration_min : number            # 見積もり時間（30分単位）
waiting_for  : string | null     # 誰/何を待っているか（status=waiting/delegate時）
energy       : low | mid | high  # 必要エネルギー
created_at   : datetime
updated_at   : datetime
notes        : string
```

#### TaskStatus

| 値 | 意味 |
|---|---|
| `inbox` | 未処理。Capture直後 |
| `next` | 次にとる具体的な行動。`next_order` で順序管理 |
| `delegate` | これから誰かに委譲する予定（まだ依頼前） |
| `waiting` | 委譲済み・誰かを待っている |
| `scheduled` | 指定 `scheduled_at` に自動で `next` へ昇格 |
| `someday` | いつかやる・たぶんやる |
| `done` | 完了 |
| `cancelled` | キャンセル |

#### Next Actionの順序ルール

- `next_order` 昇順で表示
- Triage で「2分ルール対象」と判断したタスクは `next_order = 0`（または最小値）に配置
- 通常のNextは末尾に追加、手動でドラッグ並び替え可能

### Project

```
id          : number             # UnixTime(ms)
title       : string
outcome     : string             # 完了したときの状態（GTDの「望ましい結果」）
status      : active | someday | done | cancelled
tasks       : Task[]             # 紐付いたタスク一覧
```

- Project は Next Action を直接持たない
- Next Action は Task の `status=next` かつ `project_id` で関連付ける
- Project に `status=next` のタスクがない場合はアラート表示
- Project → Template 変換: ProjectのタスクツリーをTemplateTask群として複製

### Template（タスクセットの雛形）

```
id           : number            # UnixTime(ms)
title        : string            # 例: "新規社員手続き", "月締め処理"
trigger      : manual | scheduled
cron         : string | null     # scheduled時のcron式（例: "0 9 1 * *"）
target_status: inbox | next      # 展開先のステータス
tasks        : TemplateTask[]
```

### TemplateTask

```
id           : number            # UnixTime(ms)
template_id  : number
parent_id    : number | null     # 子タスク構造（階層無制限）
title        : string
order        : number            # 兄弟間の順序
context      : string[]
tags         : string[]
duration_min : number
energy       : low | mid | high
notes        : string
offset_type  : none | cron | relative   # タスク個別のスケジュール指定方式
offset_cron  : string | null     # offset_type=cron: cron式
offset_relative : string | null  # offset_type=relative: 起点日からの相対指定
                                 # 例: "+0d"(即日), "+3d"(3日後),
                                 #     "next_monday", "next_weekday",
                                 #     "start+1w"(起点から1週間後)
```

---

## コアルール

1. **2分ルール**: Triageで2分以内に完了できるなら今すぐやる（`next_order=0` で先頭へ）
2. **Next Actionは動詞から始まる**: 「〜について考える」ではなく「〜に電話する」
3. **Projectは必ずNext Actionを持つ**: `status=next` タスクがないProjectをアラート
4. **Inboxはゼロを目指す**: Triageで定期的に処理する（Inbox Zero）
5. **スケジュールは30分単位**: 今日の空き時間にタスクを割り当てる
6. **テンプレートで繰り返しを吸収**: 定型タスクセットはサーバーサイドcronで自動展開
7. **タグとコンテキストは独立**: タグは自由分類、コンテキストは実行条件（@場所/@ツール）

---

## 画面構成（Next.js）

| 画面 | パス | 説明 |
|---|---|---|
| Inbox | `/inbox` | Captureした未処理アイテム一覧。Triageボタン付き |
| Triage | `/inbox/triage` | 1件ずつ振り分けるウィザード形式 |
| Next Actions | `/next` | `next_order` 順表示。コンテキスト・エネルギー・タグでフィルタ |
| Projects | `/projects` | プロジェクト一覧。Next Actionなしを警告表示 |
| Delegate | `/delegate` | 委譲予定（delegate）一覧。依頼実施後にwaitingへ移行 |
| Waiting | `/waiting` | 委任・待ち一覧 |
| Someday | `/someday` | いつかやる一覧 |
| Today | `/today` | 今日のスケジュール（30分単位カレンダーUI） |
| Templates | `/templates` | テンプレート管理・手動トリガー |
| Review | `/review` | 日次・週次・月次レビューフロー |

---

## レビューフロー

### 日次レビュー（毎朝）
1. Inbox確認・簡易Triage
2. 今日のスケジュール組み立て（`/today`）
3. Delegate確認（依頼漏れがないか）
4. Waiting Forの確認

### 週次レビュー（GTDの核心）
1. Inbox処理（Inbox Zero）
2. Next Actions見直し（完了済み・不要を除去）
3. プロジェクト一覧確認（Next Actionなしを特定）
4. Delegate / Waiting For確認（催促が必要か）
5. Someday/Maybe確認（昇格させるものがないか）
6. テンプレートのスケジュール確認

### 月次レビュー
1. 週次レビュー内容に加えて
2. 完了プロジェクトの振り返り
3. Someday全件見直し

---

## インクリメンタル開発計画

### Phase 1 — Core（最小動作）
**目標**: Inbox → Triage → Next Actions の基本サイクルを動かす

- [ ] Task CRUD（フラットなリスト、SubTask なし）
- [ ] TaskStatus: `inbox` / `next` / `done` / `cancelled`
- [ ] Inbox画面・Triage画面（ウィザード形式）
- [ ] Next Actions画面（`next_order` 順、2分ルールで先頭配置）
- [ ] ローカルSQLiteのみ（API不要）

### Phase 2 — Projects & SubTasks
**目標**: プロジェクト管理と階層タスクを追加

- [ ] TaskStatus追加: `delegate` / `waiting` / `someday`
- [ ] 子タスク対応（`parent_id`、階層無制限）
- [ ] Project CRUD（outcome管理）
- [ ] Delegate / Waiting / Someday 各画面
- [ ] Next Actionなしのプロジェクトをアラート

### Phase 3 — Scheduling & Review
**目標**: 今日の計画と定期レビューを実現

- [ ] TaskStatus追加: `scheduled`（`scheduled_at` で自動昇格、サーバーcronジョブ）
- [ ] Today画面（30分単位カレンダーUI、`today_start` / `duration_min`）
- [ ] タグ・コンテキスト・エネルギーによるフィルタ
- [ ] Review画面（日次・週次・月次フロー）

### Phase 4 — Templates
**目標**: 繰り返しタスクセットをテンプレート化

- [ ] Template / TemplateTask CRUD（階層構造対応）
- [ ] 手動トリガーによるタスク展開
- [ ] cronによるサーバーサイド自動展開
- [ ] `offset_relative` による起点日からの相対日付指定
- [ ] Project → Template 変換機能

### Phase 5 — Sync & PWA
**目標**: クラウド同期とPWA対応

- [ ] REST API実装（自前バックエンド）
- [ ] PWA対応（オフラインキャッシュ・インストール）
- [ ] クラウド同期（ID衝突解決込み）
- [ ] Google Calendar連携（ハードランドスケープ取り込み）
- [ ] 認証・マルチユーザー対応

---

## 決定事項

- [x] タグとコンテキストは分離（タグ=自由分類、コンテキスト=実行条件）
- [x] クラウド同期は自前REST API（フロントエンドWeb/PWAからアクセス）
- [x] モバイル対応はPWA
- [x] Google Calendar連携は後回し（Phase 5）
- [x] テンプレートのcronはサーバーサイドで実行し、`next` / `scheduled` に展開
- [x] 認証・マルチユーザー対応は後回し（Phase 5）

---

## 参考

- David Allen, "Getting Things Done" (2001)
- GTDのホライズンモデル（Runway / 10k / 20k / 30k / 40k / 50k ft）
  - 本ツールは主にRunway（Next Actions）〜10k ft（Projects）をカバー
