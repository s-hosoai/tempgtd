# 設計仕様

## GTDワークフロー

```
[収集] → [トリアージ] → [整理] → [見直し] → [実行]
Capture   Triage      Organize  Reflect   Engage
```

| フェーズ | UI操作 | 説明 |
|---|---|---|
| Capture | Inboxへ素早く入力 | とにかく全部突っ込む。考えない |
| Triage | Inboxをスワイプ／ボタンで振り分け | アクション可能か？2分でできるか？ |
| Organize | Next / Project / Waiting / Someday へ移動 | コンテキスト・期限・エネルギーを付与 |
| Reflect | 日次・週次・月次レビュー画面 | 棚卸し・優先度見直し |
| Engage | 今日のスケジュール画面 | 30分単位でカレンダーに割り当て |

## 画面構成（Next.js）

| 画面 | パス | 説明 |
|---|---|---|
| Inbox | `/inbox` | Captureした未処理アイテム一覧。Triageボタン付き |
| Triage | `/inbox/triage` | 1件ずつ振り分けるウィザード形式 |
| Next Actions | `/next-actions` | `next_order` 順表示。コンテキスト・エネルギー・タグでフィルタ |
| Projects | `/projects` | プロジェクト一覧。Next Actionなしを警告表示 |
| Delegate | `/delegate` | 委譲予定（delegate）一覧。依頼実施後にwaitingへ移行 |
| Waiting | `/waiting` | 委任・待ち一覧 |
| Someday | `/someday` | いつかやる一覧 |
| Scheduled | `/scheduled` | `scheduled_at` 待ちタスク一覧 |
| Today | `/today` | 今日のスケジュール（7〜24時・30分単位カレンダーUI）とNext Actions |
| Templates | `/templates` | テンプレート管理・手動トリガー・Project→Template変換 |
| Review | `/review` | 日次・週次・月次レビューフロー |
| Done | `/done` | 完了タスク一覧 |
| Tasks | `/tasks` | 全タスク一覧（デバッグ・管理用） |

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

## 決定事項

- タグとコンテキストは分離（タグ=自由分類、コンテキスト=実行条件）
- クラウド同期は自前REST API（フロントエンドWeb/PWAからアクセス）
- モバイル対応はPWA
- Google Calendar連携は後回し（Phase 5）
- テンプレートのcronはサーバーサイドで実行し、`next` / `scheduled` に展開
- 認証・マルチユーザー対応は後回し（Phase 5）

## 参考

- David Allen, "Getting Things Done" (2001)
- GTDのホライズンモデル（Runway / 10k / 20k / 30k / 40k / 50k ft）
  - 本ツールは主にRunway（Next Actions）〜10k ft（Projects）をカバー
