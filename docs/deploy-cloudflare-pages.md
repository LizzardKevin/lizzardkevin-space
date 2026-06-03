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

## 5. Sanity webhook（后续）

启用 Sanity 后，可配置 webhook 触发 Pages Build hook，实现内容更新自动发布。

## 6. 测试注意

- 访问需 **Chrome/Edge + WebGPU**
- 分享部署 URL（`https://<项目名>.pages.dev`）即可，无需发 zip
