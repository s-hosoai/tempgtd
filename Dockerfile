FROM node:20-alpine

# better-sqlite3 のネイティブビルドに必要
RUN apk add --no-cache python3 make g++

# pnpm を有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 依存関係を先にインストール（キャッシュ効率化）
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# better-sqlite3 のネイティブバイナリを明示的に再コンパイル
RUN pnpm rebuild better-sqlite3

# ソースをコピーしてビルド
COPY . .
RUN pnpm build

# SQLite データ用ディレクトリ（volume マウント先）
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# DB_PATH は fly.toml の [env] で /data/gtd.db に上書きされる
ENV DB_PATH=/data/gtd.db

EXPOSE 3000
CMD ["pnpm", "start"]
