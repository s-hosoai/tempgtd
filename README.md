# tempgtd

GTD（Getting Things Done）タスク管理ツール。Next.js + SQLite構成。

## デプロイ構成

```
git push (main)
  → GitHub Actions: Dockerビルド → ghcr.io にpush
  → SSH経由でLightsailサーバーに自動デプロイ
```

URL: `https://tempgtd.ccrlab.click`

---

## AWS Lightsail セットアップ手順

### 1. インスタンス作成

- OS: Ubuntu 24.04 LTS
- プラン: $10/月（2GB RAM）推奨
  - **注意**: $5プラン（512MB）はDockerビルド時にOOMで停止するため不向き。スワップ追加で多少改善するが不安定。
- 静的IPを作成してインスタンスに紐付ける（無料）

### 2. ファイアウォール設定

Lightsailコンソール → ネットワーキング → ファイアウォールに以下を追加:

| プロトコル | ポート | 送信元 |
|-----------|--------|--------|
| TCP | 80 | `0.0.0.0/0` |
| TCP | 443 | `0.0.0.0/0` |

### 3. DNS設定

Lightsail「Domains & DNS」でAレコードを追加:

| レコード | 値 |
|---------|-----|
| A（サブドメインまたは`@`） | 静的IPアドレス |

- **注意**: 「is AWS resource alias」はオフのまま。静的IPを直接指定する場合は不要。

### 4. サーバー初期設定

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
# 一度ログアウト・再ログイン
sudo apt install -y nginx certbot python3-certbot-nginx sqlite3
sudo mkdir -p /data/gtd
sudo chown ubuntu:ubuntu /data/gtd
```

#### スワップ追加（任意・$5プランでは必須）

```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 5. 環境変数ファイル作成

```bash
cat > /home/ubuntu/.env.production << 'EOF'
DB_PATH=/data/gtd.db
NODE_ENV=production
PORT=3000
AUTH_USER=admin
AUTH_PASSWORD=<任意のパスワード>
API_KEY=<任意のAPIキー>
EOF
```

- **注意**: `DB_PATH`はコンテナ内のパス。ボリュームマウントが`-v /data/gtd:/data`のため、ホストの`/data/gtd/gtd.db`がコンテナ内では`/data/gtd.db`になる。

### 6. GitHub Actions設定

#### デプロイ用SSH鍵の生成

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/deploy_key  # 秘密鍵をコピーしてGitHubシークレットに登録
```

#### GitHubシークレット登録

| シークレット名 | 値 |
|-------------|-----|
| `LIGHTSAIL_HOST` | 静的IPアドレス |
| `LIGHTSAIL_SSH_KEY` | 秘密鍵（`-----BEGIN`から全文） |
| `GHCR_PAT` | GitHub Classic PAT（`read:packages`スコープ） |
| `AUTH_PASSWORD` | ログインパスワード |

- **注意**: `LIGHTSAIL_SSH_KEY`には秘密鍵（`.pub`なし）を登録する。公開鍵を登録すると`ssh: no key found`エラーになる。
- **注意**: `GHCR_PAT`はFine-grainedではなくClassic tokenを使用（`read:packages`スコープ）。

### 7. nginx + SSL設定

```bash
sudo tee /etc/nginx/sites-available/tempgtd << 'EOF'
server {
    listen 80;
    server_name tempgtd.ccrlab.click;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/tempgtd /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# DNSが反映されてから実行
sudo certbot --nginx -d tempgtd.ccrlab.click
```

### 8. 初回デプロイ

mainブランチにpushするとGitHub Actionsが自動実行される。  
GitHub → Actionsタブで進捗を確認できる。

---

## SQLiteバックアップ

### 重要: WALモードの注意点

SQLite WALモードでは`gtd.db`・`gtd.db-shm`・`gtd.db-wal`の3ファイルが存在し、**最新データはWALに書き込まれている**。`gtd.db`単体をコピーすると未チェックポイントのデータが失われる。

安全なバックアップ方法:

```bash
# .dumpを使う（最も確実）
sqlite3 /data/gtd/gtd.db .dump > ~/backups/gtd_$(date +%Y%m%d).sql
```

### 自動バックアップ（cron）

```bash
mkdir -p /home/ubuntu/backups
crontab -e
```

以下を追加（毎日深夜2時・7世代保持）:

```
0 2 * * * sqlite3 /data/gtd/gtd.db .dump > /home/ubuntu/backups/gtd_$(date +\%Y\%m\%d).sql && find /home/ubuntu/backups -name "*.sql" -mtime +7 -delete
```

### バックアップファイルのローカルへのダウンロード

```bash
# 今日のバックアップ
scp -i ~/.ssh/lightsail_tempgtd.pem ubuntu@<サーバーIP>:/home/ubuntu/backups/gtd_$(date +%Y%m%d).sql ~/Downloads/

# 全バックアップ一括
scp -i ~/.ssh/lightsail_tempgtd.pem ubuntu@<サーバーIP>:/home/ubuntu/backups/*.sql ~/Downloads/
```

---

## サーバー移行・復旧手順

### 静的IPの付け替え（推奨）

新インスタンス作成後、Lightsailコンソールで静的IPを旧インスタンスから切り離し → 新インスタンスに紐付けると、DNS・GitHubシークレットの変更が不要。

### バックアップからの復旧

1. README記載のセットアップ手順（Step 1〜6）を完了させる
2. バックアップファイルを新サーバーに転送:

```bash
scp -i ~/.ssh/lightsail_tempgtd.pem ~/Downloads/gtd_20260710.sql ubuntu@<新サーバーIP>:/home/ubuntu/
```

3. リストアを実施:

```bash
sudo mkdir -p /data/gtd && sudo chown ubuntu:ubuntu /data/gtd

# コンテナが既に起動してしまった場合は既存DBを削除してからリストア
docker stop tempgtd
rm -f /data/gtd/gtd.db /data/gtd/gtd.db-shm /data/gtd/gtd.db-wal

sqlite3 /data/gtd/gtd.db < /home/ubuntu/gtd_20260710.sql

# 確認
sqlite3 /data/gtd/gtd.db "SELECT status, COUNT(*) FROM tasks GROUP BY status;"
```

> **注意**: コンテナを先に起動すると空のDBとスキーマが生成される。その状態でリストアするとテーブル重複エラーが出るため、必ず既存DBファイルを削除してからリストアする。

4. mainブランチにpushしてデプロイ:

```bash
git commit --allow-empty -m "deploy: 新サーバーへのデプロイ" && git push origin main
```

---

## ローカル開発

```bash
pnpm install
pnpm dev
```

`AUTH_PASSWORD`を設定しない場合、認証なしで起動する（開発用）。
