# 双平台开发

## 1. 工作区

Windows 当前目录 `E:\00 自己的活儿\2026_个人网页SPACE\LizzardKevin SPACE` 已经是工作 clone，不需要再复制或重新 clone。

macOS 用 GitHub URL 重新 clone：

```bash
git clone https://github.com/LizzardKevin/lizzardkevin-space.git
cd lizzardkevin-space
git switch codex/cross-platform-dev
npm ci
```

如果要开发别的功能，把分支名换成对应的功能分支即可。

## 2. 功能分支流程

每个功能用一个分支，在两台机器之间只通过 GitHub 同步。

开始或切换分支：

```bash
git fetch origin
git switch <branch>
git pull --ff-only
npm ci
```

新分支：

```bash
git switch -c <branch>
git push -u origin <branch>
```

换到另一台机器继续：

```bash
git fetch origin
git switch <branch>
git pull --ff-only
npm ci
```

离开一台机器前，先 `git status`。有未完成内容就提交、stash，或留在这台机器继续，不要在两台机器同时编辑同一分支上的未提交改动。

## 3. 常用命令

切换机器或切换分支后先运行：

```bash
npm ci
```

本项目固定使用 Node `24.11.0` 与 npm `11.6.1`。macOS 可用 `nvm use` 读取 `.nvmrc`；Windows 如果使用 nvm-windows，需要手动安装并切换到同一版本：

```powershell
nvm install 24.11.0
nvm use 24.11.0
node -v
npm -v
```

按场景使用这些脚本：

```bash
npm run dev:local
npm run verify:quick
npm run verify:release
```

`verify:quick` 适合日常提交前；`verify:release` 适合合并、发布或交给 Cloudflare Pages 前。

## 4. 不要云盘同步 worktree

优先使用 GitHub `push` / `pull`。不要用 iCloud、OneDrive、坚果云等同步同一个 worktree；`.git`、`node_modules` 和构建产物容易冲突或损坏。
