# GTD Task Tool — プロジェクト仕様

## 概要

GTD（Getting Things Done）メソドロジーに基づいたタスク管理ツール。
「頭の中を空にして、信頼できるシステムに委ねる」というGTDの核心を実現する。

---

## GTDワークフロー

```
[収集] → [明確化] → [整理] → [見直し] → [実行]
Capture  Clarify   Organize  Reflect   Engage
```

### 5ステップの実装方針

| ステップ | 操作 | 説明 |
|---|---|---|
| Capture | `inbox add` | とにかく全部突っ込む。考えない |
| Clarify | `inbox process` | アクション可能か？2分でできるか？ |
| Organize | 各リストへ振り分け | Next / Project / Waiting / Someday |
| Reflect | `review` | 週次レビュー、デイリーレビュー |
| Engage | `do` / `context` | 今やることを決める |

---

## データモデル（案）

### Task

```
id          : UUID
title       : string          # タスクのタイトル
status      : TaskStatus
list        : ListType         # どのリストに属するか
project_id  : UUID | null     # プロジェクトとの紐付け
context     : string[]        # @home, @pc, @phone など
due         : date | null     # 期限（GTDでは多用しない）
waiting_for : string | null   # 誰/何を待っているか
energy      : Low | Mid | High  # 必要エネルギー
created_at  : datetime
updated_at  : datetime
notes       : string          # 補足メモ
```

### Project

```
id          : UUID
title       : string
outcome     : string          # 完了したときの状態（GTDの「望ましい結果」）
next_action : UUID | null     # 現在のNext Action
status      : active | someday | done | cancelled
tasks       : Task[]
```

### ListType（GTDの6つのリスト）

```
inbox       : まだ処理していないもの
next        : 次にとる具体的な行動
project     : 2ステップ以上必要なもの
waiting     : 誰かを待っている／委任済み
someday     : いつかやる・たぶんやる
reference   : 参照資料（タスクではない）
```

---

## コアルール

1. **2分ルール**: Clarifyで2分以内に完了できるなら今すぐやる
2. **Next Actionは動詞から始まる**: 「〜について考える」ではなく「〜に電話する」
3. **プロジェクトは必ずNext Actionを持つ**: 止まっているプロジェクトを検出する
4. **Inboxはゼロを目指す**: 定期的に処理する（Inbox Zero）
5. **Contextで絞り込む**: 場所・ツール・エネルギーで今できることだけ見る

---

## CLI インターフェース（案）

```bash
# Capture
gtd add "会議の議事録を書く"                 # Inboxに追加
gtd inbox                                    # Inbox一覧

# Clarify & Organize
gtd process                                  # Inboxを対話的に処理
gtd move <id> next                          # Next Actionsへ
gtd move <id> someday                       # Someday/Maybeへ
gtd wait <id> --for "田中さんの返信"         # Waiting Forへ

# Project管理
gtd project add "新機能リリース" --outcome "v2.0が本番に出ている"
gtd project list
gtd project show <id>

# Context & 実行
gtd next                                     # 全Next Actions
gtd next --context @pc                       # コンテキストで絞り込み
gtd next --energy low                        # エネルギーで絞り込み

# Review
gtd review daily                             # デイリーレビュー
gtd review weekly                            # 週次レビュー（GTDの核心）
gtd stalled                                  # Next Actionのないプロジェクト一覧

# 完了
gtd done <id>
```

---

## 週次レビューのフロー（自動化候補）

1. Inbox処理（Inboxをゼロにする）
2. Next Actions見直し（完了済み・不要なものを除去）
3. プロジェクト一覧確認（止まっているものを特定）
4. Waiting For確認（催促が必要なものを確認）
5. Someday/Maybe確認（昇格させるものがないか）
6. カレンダー確認（今後の予定と行動の整合）

---

## 技術スタック（未定・検討中）

- **言語**: <!-- 例: TypeScript / Python / Go / Rust -->
- **データストア**: <!-- 例: SQLite / JSON files / PostgreSQL -->
- **UI**: <!-- 例: CLI only / TUI (Ink/Charm) / Web -->
- **同期**: <!-- 例: ローカルのみ / クラウド同期 -->

---

## 未決定事項（要議論）

- [ ] データの保存形式（SQLite vs プレーンテキスト vs JSON）
- [ ] TUI（Terminal UI）対応するか
- [ ] 繰り返しタスクの扱い（GTD的には「チェックリスト」として扱う）
- [ ] カレンダー連携（ハードランドスケープの概念）
- [ ] タグとコンテキストの統一 or 分離
- [ ] 外部ツール連携（Obsidian / Notion / カレンダー）
- [ ] モバイル対応（Capture手段として重要）

---

## 参考

- David Allen, "Getting Things Done" (2001)
- GTDのホライズンモデル（Runway / 10k / 20k / 30k / 40k / 50k ft）
  - 本ツールは主にRunway（Next Actions）〜10k ft（Projects）をカバー
