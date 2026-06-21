# GitHub 首次推送

本地已完成 `git init` 与首次提交时，只需完成 GitHub 登录并推送到远端。Windows 与 macOS 都可用脚本或纯 `git` 命令。

## 1. 准备工具

Windows：

1. 安装 [Git for Windows](https://git-scm.com/download/win)
2. 可选安装 GitHub CLI：

```powershell
winget install --id GitHub.cli -e
```

macOS：

```bash
brew install gh   # 可选；不用 gh 可看「手动方式」
```

登录 GitHub CLI（一次性）：

```bash
gh auth login --hostname github.com --git-protocol https --web
```

按提示在浏览器输入设备码完成授权。

## 2. 脚本方式（需要 gh）

在项目根目录运行。Windows 请用 Git Bash；macOS 可用 Terminal：

```bash
bash scripts/github-bootstrap.sh
```

默认仓库名 `lizzardkevin-space`。自定义名称：

```bash
bash scripts/github-bootstrap.sh my-repo-name
```

## 3. 手动方式（不用 gh）

1. 在 GitHub 网页创建 **空** public 仓库（不要勾选 README）
2. 执行：

```bash
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

## 4. 下一步

[双平台开发](cross-platform-development.md) / [Cloudflare Pages 部署](deploy-cloudflare-pages.md)
