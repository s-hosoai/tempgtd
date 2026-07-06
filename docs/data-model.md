# データモデル

## ID設計

- UnixTime（ミリ秒）を整数値としてIDに使用
- 同一ミリ秒での衝突時は 1ms ずつずらして採番

## Task

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

### TaskStatus

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

### Next Actionの順序ルール

- `next_order` 昇順で表示
- Triage で「2分ルール対象」と判断したタスクは `next_order = 0`（または最小値）に配置
- 通常のNextは末尾に追加、手動でドラッグ並び替え可能

## Project

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

## Template（タスクセットの雛形）

```
id           : number            # UnixTime(ms)
title        : string            # 例: "新規社員手続き", "月締め処理"
trigger      : manual | scheduled
cron         : string | null     # scheduled時のcron式（例: "0 9 1 * *"）
target_status: inbox | next      # 展開先のステータス
tasks        : TemplateTask[]
```

## TemplateTask

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
