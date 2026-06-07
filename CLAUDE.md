# GTD Task Tool

GTD（Getting Things Done）メソドロジーに基づいたタスク管理ツール。
Inbox → Triage → Next Actions の基本サイクルを軸に、プロジェクト管理・スケジュール・テンプレートを備える。

## 技術スタック

- **言語**: TypeScript / Node.js（pnpm）
- **フレームワーク**: Next.js 16 / React 19（App Router）
- **データストア**: SQLite（better-sqlite3 + Drizzle ORM）
- **スタイリング**: Tailwind CSS v4 + shadcn/ui
- **バリデーション**: zod

## コアルール

1. **2分ルール**: Triageで2分以内に完了できるなら今すぐやる（`next_order=0` で先頭へ）
2. **Next Actionは動詞から始まる**: 「〜について考える」ではなく「〜に電話する」
3. **Projectは必ずNext Actionを持つ**: `status=next` タスクがないProjectをアラート
4. **Inboxはゼロを目指す**: Triageで定期的に処理する（Inbox Zero）
5. **スケジュールは30分単位**: 今日の空き時間にタスクを割り当てる
6. **テンプレートで繰り返しを吸収**: 定型タスクセットはサーバーサイドcronで自動展開
7. **タグとコンテキストは独立**: タグは自由分類、コンテキストは実行条件（@場所/@ツール）

## 詳細ドキュメント

- [データモデル](docs/data-model.md) — Task / Project / Template のスキーマ定義
- [設計仕様](docs/design.md) — GTDワークフロー・画面構成・レビューフロー・決定事項
- [開発ロードマップ](docs/roadmap.md) — Phase 1〜5 の実装計画と進捗
