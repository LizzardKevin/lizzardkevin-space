#!/usr/bin/env node
/**
 * 构建 apps/web 并打包为可发给朋友本地试玩的 zip（仅静态文件 + 启动说明）。
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = join(root, "apps/web");
const distDir = join(webDir, "dist");
const releaseName = "LizzardKevin-Space-test";
const releaseDir = join(root, "release", releaseName);
const zipPath = join(root, "release", `${releaseName}.zip`);

const readme = `LizzardKevin Space — 本地试玩包
================================

【环境】
- 浏览器：Chrome 或 Edge（较新版本，需支持 WebGPU）
- 本包已是编译好的静态网站，无需安装项目依赖

【启动】
macOS：双击「启动试玩-mac.command」或在终端执行 ./启动试玩-mac.sh
Windows：双击「启动试玩-windows.bat」
通用：在本文件夹内执行
  python3 -m http.server 8080
然后浏览器打开 http://127.0.0.1:8080/

【操作】
- 点击「点击进入 SPACE」进入展厅
- WASD 移动，鼠标环顾（需允许指针锁定）
- 顶部可打开 LizzardKevin / DevStories；双击空白区域退出
- 对准展品高亮后点击可进入 Focus 特写

【注意】
- 不要直接双击 index.html（资源路径会失败）
- 若黑屏或提示 WebGPU 不可用，请换 Chrome/Edge 并更新系统/显卡驱动
`;

const startMacSh = `#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="\${PORT:-8080}"
echo "LizzardKevin Space → http://127.0.0.1:\${PORT}/"
echo "按 Ctrl+C 结束"
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "\${PORT}"
fi
if command -v python >/dev/null 2>&1; then
  exec python -m http.server "\${PORT}"
fi
if command -v npx >/dev/null 2>&1; then
  exec npx --yes serve -l "\${PORT}"
fi
echo "请安装 Python 3 或 Node.js 后再运行"
read -r -p "按回车退出…"
`;

const startMacCommand = `#!/bin/bash
cd "$(dirname "$0")"
chmod +x "./启动试玩-mac.sh" 2>/dev/null || true
exec "./启动试玩-mac.sh"
`;

const startWinBat = `@echo off
cd /d "%~dp0"
set PORT=8080
echo LizzardKevin Space - http://127.0.0.1:%PORT%/
echo Ctrl+C to stop
where python >nul 2>&1 && python -m http.server %PORT% && exit /b 0
where py >nul 2>&1 && py -m http.server %PORT% && exit /b 0
where npx >nul 2>&1 && npx --yes serve -l %PORT% && exit /b 0
echo Install Python 3 or Node.js, then run again.
pause
`;

console.log("[package] building web…");
execSync("npm run build -w apps/web", { cwd: root, stdio: "inherit" });

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });

cpSync(distDir, releaseDir, { recursive: true });
writeFileSync(join(releaseDir, "测试说明.txt"), readme, "utf8");
writeFileSync(join(releaseDir, "启动试玩-mac.sh"), startMacSh, { utf8: true, mode: 0o755 });
writeFileSync(join(releaseDir, "启动试玩-mac.command"), startMacCommand, { utf8: true, mode: 0o755 });
writeFileSync(join(releaseDir, "启动试玩-windows.bat"), startWinBat, "utf8");

mkdirSync(join(root, "release"), { recursive: true });
rmSync(zipPath, { force: true });
execSync(`cd "${join(root, "release")}" && zip -rq "${releaseName}.zip" "${releaseName}"`, {
  stdio: "inherit",
});

console.log(`[package] done: ${zipPath}`);
