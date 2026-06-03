# GitHub 首次推送

本地已完成 `git init` 与首次提交时，只需完成 GitHub 登录并执行一条脚本。

## 1. 登录 GitHub CLI（一次性）

```bash
brew install gh   # 若未安装
gh auth login --hostname github.com --git-protocol https --web
```

按提示在浏览器输入设备码完成授权。

## 2. 创建仓库并推送

在项目根目录：

```bash
chmod +x scripts/github-bootstrap.sh
./scripts/github-bootstrap.sh
```

默认仓库名 `lizzardkevin-space`。自定义名称：

```bash
./scripts/github-bootstrap.sh my-repo-name
```

## 3. 手动方式（不用 gh）

1. 在 GitHub 网页创建 **空** public 仓库（不要勾选 README）
2. 执行：

```bash
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

## 4. 下一步

[Cloudflare Pages 部署](deploy-cloudflare-pages.md)
