# Cloudflare Pages 部署

## 前置：代码在 GitHub

1. 在 GitHub 创建 **public** 空仓库（不要勾选 “Add README”）
2. 本地推送：

```bash
git init
git add .
git commit -m "Initial commit: LizzardKevin Space web gallery"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

或使用 GitHub CLI（已登录时）：

```bash
gh auth login
git init && git add . && git commit -m "Initial commit: LizzardKevin Space web gallery"
gh repo create lizzardkevin-space --public --source=. --remote=origin --push
```

## 1. 连接仓库

[Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → 选择本仓库。

## 2. 构建设置（关键）

| 项 | 值 |
|----|-----|
| Production branch | `main` |
| Root directory | 仓库根（留空，**不要**只填 `apps/web`） |
| Build command | `npm run build` |
| Build output directory | `apps/web/dist` |

Pages 会在根目录 `npm install`（workspaces），并构建 `apps/web`。

## 3. 费用

个人试玩与演示通常在 **Pages 免费档** 内；使用 `*.pages.dev` 子域无需另购域名。

## 4. 直接上传（不经 Git）

本地 `npm run build` 后，Pages → **Upload assets**，上传 `apps/web/dist` 内全部文件。

## 5. 内容更新后重新发布

修改展品、文案或 `docs/devlog/` 后，在仓库根目录执行 `npm run build` 并 `git push` 到 `main`，Pages 会自动触发新构建。

## 6. 可选：Wrangler CLI 部署

仓库根目录有 [`wrangler.toml`](../wrangler.toml)。在已 `gh auth login` 且已推送 GitHub 后，也可（需 Cloudflare 账号登录）：

```bash
npm run build
npx wrangler pages deploy apps/web/dist --project-name=lizzardkevin-space
```

与 Dashboard「Connect to Git」二选一即可。

## 7. 测试注意

- 访问需 **Chrome/Edge + WebGPU**
- 分享部署 URL（`https://<项目名>.pages.dev`）即可，无需发 zip
