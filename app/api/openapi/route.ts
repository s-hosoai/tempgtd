import { NextResponse } from "next/server"

const spec = {
  openapi: "3.0.3",
  info: {
    title: "TempGTD API",
    description: "GTD タスク管理ツールの REST API。AI エージェント・チャットツールからの利用を想定。",
    version: "1.0.0",
  },
  servers: [{ url: "/api" }],
  security: [{ apiKey: [] }],
  components: {
    securitySchemes: {
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "X-Api-Key",
        description: "環境変数 API_KEY の値を指定",
      },
    },
    schemas: {
      Task: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          status: {
            type: "string",
            enum: ["inbox", "next", "delegate", "waiting", "scheduled", "someday", "idea", "done", "cancelled"],
          },
          notes: { type: "string" },
          projectId: { type: "integer", nullable: true },
          waitingFor: { type: "string", nullable: true },
          scheduledAt: { type: "integer", nullable: true, description: "Unix timestamp (ms)" },
          nextOrder: { type: "number", nullable: true },
          createdAt: { type: "integer" },
          updatedAt: { type: "integer" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          outcome: { type: "string" },
          status: { type: "string", enum: ["active", "someday", "done", "cancelled"] },
          notes: { type: "string" },
          createdAt: { type: "integer" },
          updatedAt: { type: "integer" },
        },
      },
    },
  },
  paths: {
    "/capture": {
      post: {
        summary: "テキストを解析してタスクを作成（推奨）",
        description: [
          "入力テキストを GTD キャプチャルールで解釈してタスクを作成します。",
          "",
          "**入力規則:**",
          "- `[J] タスク` → Next Action 先頭（2分ルール）",
          "- `[N] タスク` → Next Action",
          "- `[S] タスク` → Someday",
          "- `[D] タスク` → Delegate",
          "- `[W] タスク` → Waiting",
          "- `[I] タスク` → Idea",
          "- `6/2 10:00 タスク` → Scheduled（日時指定）",
          "- `プロジェクト名: タスク` → プロジェクトに追加（未存在時は自動作成）",
          "- プレフィックスなし → Inbox",
        ].join("\n"),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["text"],
                properties: {
                  text: { type: "string", example: "[N] 企画書を送る" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "作成成功",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                    parsed: {
                      type: "object",
                      description: "解析結果",
                      properties: {
                        title: { type: "string" },
                        status: { type: "string" },
                        twoMinute: { type: "boolean" },
                        projectName: { type: "string", nullable: true },
                        scheduledAt: { type: "string", format: "date-time", nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/tasks": {
      get: {
        summary: "タスク一覧を取得",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["inbox", "next", "delegate", "waiting", "scheduled", "someday", "idea", "done", "cancelled"],
            },
            description: "絞り込むステータス（省略時は全件）",
          },
          {
            name: "projectId",
            in: "query",
            schema: { type: "integer" },
            description: "プロジェクトIDで絞り込み",
          },
        ],
        responses: {
          "200": {
            description: "タスク配列",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Task" } } } },
          },
        },
      },
      post: {
        summary: "タスクを作成",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string" },
                  notes: { type: "string" },
                  targetStatus: {
                    type: "string",
                    enum: ["inbox", "next", "delegate", "waiting", "someday", "scheduled", "idea"],
                    default: "inbox",
                  },
                  projectId: { type: "integer" },
                  projectName: { type: "string", description: "プロジェクト名（未存在時は自動作成）" },
                  twoMinute: { type: "boolean", description: "true なら Next の先頭へ" },
                  scheduledAt: { type: "integer", description: "Unix timestamp (ms)" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "作成されたタスク",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } },
          },
        },
      },
    },
    "/tasks/{id}": {
      patch: {
        summary: "タスクを更新",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  status: {
                    type: "string",
                    enum: ["inbox", "next", "delegate", "waiting", "scheduled", "someday", "idea", "done", "cancelled"],
                  },
                  notes: { type: "string" },
                  projectId: { type: "integer", nullable: true },
                  waitingFor: { type: "string", nullable: true },
                  scheduledAt: { type: "integer", nullable: true },
                  twoMinute: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "更新後のタスク", content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
        },
      },
      delete: {
        summary: "タスクを削除",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: { "204": { description: "削除成功" } },
      },
    },
    "/projects": {
      get: {
        summary: "プロジェクト一覧を取得",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["active", "someday", "done", "cancelled"], default: "active" },
          },
        ],
        responses: {
          "200": {
            description: "プロジェクト配列",
            content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Project" } } } },
          },
        },
      },
      post: {
        summary: "プロジェクトを作成",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string" },
                  outcome: { type: "string", description: "完了したときの状態（望ましい結果）" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "作成されたプロジェクト", content: { "application/json": { schema: { $ref: "#/components/schemas/Project" } } } },
        },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(spec)
}
