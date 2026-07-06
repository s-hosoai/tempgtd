# インクリメンタル開発計画

## Phase 1 — Core（最小動作）
**目標**: Inbox → Triage → Next Actions の基本サイクルを動かす

- [x] Task CRUD（フラットなリスト、SubTask なし）
- [x] TaskStatus: `inbox` / `next` / `done` / `cancelled`
- [x] Inbox画面・Triage画面（ウィザード形式）
- [x] Next Actions画面（`next_order` 順、2分ルールで先頭配置）
- [x] ローカルSQLiteのみ（API不要）

## Phase 2 — Projects & SubTasks
**目標**: プロジェクト管理と階層タスクを追加

- [x] TaskStatus追加: `delegate` / `waiting` / `someday`
- [x] 子タスク対応（`parent_id`、階層無制限）
- [x] Project CRUD（outcome管理）
- [x] Delegate / Waiting / Someday 各画面
- [x] Next Actionなしのプロジェクトをアラート

## Phase 3 — Scheduling & Review
**目標**: 今日の計画と定期レビューを実現

- [x] TaskStatus追加: `scheduled`（`scheduled_at` で自動昇格、サーバーcronジョブ）
- [x] Today画面（30分単位カレンダーUI、`today_start` / `duration_min`）
- [x] タグ・コンテキスト・エネルギーによるフィルタ
- [x] Review画面（日次・週次・月次フロー）

## Phase 4 — Templates
**目標**: 繰り返しタスクセットをテンプレート化

- [x] Template / TemplateTask CRUD（階層構造対応）
- [x] 手動トリガーによるタスク展開（`/api/templates/[id]/expand`）
- [x] cronによるサーバーサイド自動展開（`promoteScheduledTemplates()`、DB初期化時に実行）
- [x] `offset_relative` による起点日からの相対日付指定（+Nd/+Nw/next_monday/next_weekday）
- [x] Project → Template 変換機能（`/api/projects/[id]/to-template`）
## Phase 5 — Task breakdown
- [ ] サブタスクの導入，タスク間の親子関係．ネスト回数の制限なし
- [ ] Tasksのタスク詳細ビューからタスクの細分化を行えるように
- [ ] Inboxへ追加する際も親タスクを選択できるように（デフォルトは選択なし）
- [ ] 下部のタスク追加バーで，”Inboxへ”のスイッチの上に同様の”Current Taskを細分化”スイッチを作成．これがオンの時はCurrentタスクの子としてタスクを追加する

## Phase 6 — Input Upgrade
- [ ] タスクにtagの追加．複数追加可
- [ ] タスク入力に表記法を追加し，タスク設定のショートカットを行う
 - [ ] プロジェクトへの追加
 - [ ] 一つ前のタスクの子タスクとして追加
 - [ ] 一つ前のタスクの兄弟として追加
 - [ ] 状態を変えて追加．NextAction，Delegate
 

## Phase 7 — Sync & PWA
**目標**: クラウド同期とPWA対応
- [ ] REST API実装（自前バックエンド）
- [ ] PWA対応（オフラインキャッシュ・インストール）
- [ ] クラウド同期（ID衝突解決込み）
- [ ] Google Calendar連携（ハードランドスケープ取り込み）
- [ ] 認証・マルチユーザー対応
